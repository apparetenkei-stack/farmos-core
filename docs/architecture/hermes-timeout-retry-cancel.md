# Hermes Timeout / Retry / Cancel Boundary

## Business Value

Day101は、一時障害に限ったretry scheduleとuser cancellationを原子的に記録し、Queue、claim、Worker capacityを安全に整合させる。AI停止を業務DBへ波及させず、model実行、Worker signal、DB/Proposal/Audit write、公開APIは行わない。

## Timeout policy

`hermes.timeout.policy.v1` はserver policy固定で、lightweight 60秒、standard 180秒、heavy 600秒である。client overrideは禁止し、Day101は純粋な期限判定だけを提供する。timer daemonは起動しない。`worker_timeout` と `model_timeout` はretry分類への固定入力であり、例外文から推測しない。

## Retry policy and classification

`hermes.retry.policy.v1` はDay98と同じ `max_retry_count=1`、base 5秒、上限60秒、jitterなしのexponential backoffを固定する。delayは `min(5000 * 2^retry_count, 60000)` で、retry_countは失敗時点までに既にscheduleされた回数を表す。

Retry allowlistは `worker_unavailable`、`worker_offline`、`worker_heartbeat_stale`、`worker_runtime_unavailable`、`worker_timeout`、`model_timeout`、`model_temporarily_unavailable`、`provider_temporarily_unavailable`、`queue_temporarily_unavailable`、`worker_lost_claim` だけである。

Retry denylistは `invalid_request`、`invalid_payload`、`message_too_long`、`multiline_message_not_allowed`、`capability_unavailable`、`routing_not_allowed`、`worker_capability_unavailable`、`worker_record_invalid`、`authorization_failed`、`forbidden`、`cancelled_by_user`、`job_expired`、`retry_limit_reached`、`proposal_policy_blocked` である。未知codeは常にretry不可・fail-closedで、内部例外や文字列から分類を推測しない。

## Eligibility, schedule, and not-before

`hermes.retry.schedule.v1` はID、job/request ID、前claim ID、回数、固定reason code、schedule時刻、`retry_not_before` だけを保持する。message、prompt、context、model、endpoint、Secret、内部例外を含めない。

Day101はschedule-only方式を採用する。failedはJob attemptとしてterminalだが、terminal判定とretry eligibilityは別契約である。retry対象statusはrunningと、固定allowlist errorを持つfailedだけである。queued、succeeded、cancelled、expired、既にretry_scheduledのJobは拒否する。eligibility承認済み入力を要求するRecovery専用transitionとatomic LuaだけがJob/Queueを `retry_scheduled` にする。claim/capacity解放後にrunningを残さず、pendingへ即時追加しない。retry scheduleを消費する後続schedulerは既存Jobをqueued/runningへ戻さず、新attemptを生成する。同一 `job_id + retry_count` keyの存在をLua内でも確認し、二重scheduleを拒否する。

## User cancellation

`hermes.cancel.request.v1` は正規化済みserver-side inputだけから作る。queued、running、retry_scheduledをcancelでき、succeeded、failed、cancelled、expiredは新規cancel不可。retry_scheduledのcancelは対応する明示retry keyも同じLua操作で削除し、待機scheduleを残さない。同じjob ID、request ID、requested_by、reason_codeの保存済みcancelは、新しいcancellation IDでも `already_cancelled` とする。schemaまたはこれらの意味fieldが異なる場合だけ `cancel_conflict` とする。retry_scheduledはexpiryへも遷移できるが、queued/runningへ直接遷移しない。公開cancel API、UI、認証、Worker interrupt signalはDay101外である。

初回cancelと `already_cancelled` のatomic resultは、Redisへ実際に保存されたcanonical cancellation recordを返す。replay時に新しく生成した未保存IDを返さない。返却recordはschema、job/request ID、actor、reason、ISO timestamp、cancellation ID、安全フラグをruntime検証し、不正なら `cancel_record_invalid` でfail-closedとする。

Queue statusには `retry_scheduled` とterminalの `cancelled` を正式追加した。cancelはJob statusもcancelledにし、pending/processingから除去するがdead-letterへ入れない。

## Atomic transition, claim, and capacity

RetryとcancelはRedis Lua一操作でjob/claim/Worker recordを検証し、schedule/cancel record、Queue record、list、claim、capacityを更新する。claimがなければ安全に継続する。claimがあるのにWorker recordがない、またはrecordが不正なら、片側状態を残さずfail-closedで拒否する。

Workerの `current_job_id` が対象jobと一致する場合だけnullにし、`active_job_count > 0` の場合だけ1減らす。別jobを保持するWorkerは変更せず、claim削除後の再実行でも二重減算しない。registry `last_updated_at` をserver時刻で更新する。

## TTL and Redis failure

JobとWorker更新は `KEEPTTL` を使用する。retry/cancel recordは `PEXPIRETIME` で得た元Jobのabsolute deadlineを `PXAT` に指定し、同じ期限へ揃える。相対PTTLを再設定せず、JobまたはWorker registry TTLを延長しない。backoff後まで期限が残らなければ `retry_window_unavailable`。Redis停止、schema不正、claim/Worker不整合は固定error codeでfail-closedとし、内部例外や接続情報を返さない。

## Existing boundaries

Day98 Queueのdedupe、pending/processing/dead-letter keyと `max_retry_count=1` を維持する。Day99 claim keyとregistry schemaを再利用し、capacityを負数にしない。Day100 Routerは変更せず、Routerからrecoveryを呼ばない。Day102 WOL境界にもWOL、SSH、RTX起動、GPU検出を先行実装しない。

## Rollback

`recovery_runtime`、Day101 test/preview/smoke、package scripts、本書と各文書のDay101追記を取り除き、Queue statusの `retry_scheduled` と `cancelled` 追加を戻す。DB、migration、RLS、API、Proposal、Audit、業務データのrollbackは不要である。
