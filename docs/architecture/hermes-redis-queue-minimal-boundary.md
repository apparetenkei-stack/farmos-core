# Hermes Redis Queue Minimal Boundary

## Business Value

Day98は `hermes.job.v1` をWeb APIプロセスから将来のWorkerへ安全に配送するため、Redis primitiveだけの最小Queue境界を提供する。DBへ書き込まず、停止時はfail-closedとし、重複enqueueと失敗jobの混在を防ぐ。

## Redis key contract

既定prefixは `farmos:hermes` である。

- pending: `farmos:hermes:queue:pending`
- processing: `farmos:hermes:queue:processing`
- dead-letter: `farmos:hermes:queue:dead-letter`
- job record: `farmos:hermes:job:<job_id>`
- dedupe: `farmos:hermes:dedupe:<job_id>`

keyにSecret、message、ユーザー入力を含めない。smoke testは一意な `farmos:hermes:test:day98:<uuid>` prefixを使う。

## Queue record contract

`hermes.queue.v1` はDay97 Job Envelopeを変更せず内包し、Queue status、retry count、enqueue/dequeue/completion時刻、固定error codeを外側に保持する。DB、業務DB、Proposal、Worker、modelの実行フラグはfalse、fail-closedはtrueである。

## Enqueue

Queue disabled時はRedis clientを生成しない。Envelope検証と残存TTL確認後、Lua scriptでdedupe確認、job record保存、pending追加、dedupe key作成を原子的に行う。接続失敗を成功として返さない。

## Duplicate suppression

`job_id` ごとのdedupe keyが存在すればduplicateとして正常応答し、job recordやpending listへ再追加しない。複雑な分散lockは実装しない。

## Dequeue

非blocking `LMOVE` でpending末尾からprocessing先頭へ1件移し、recordをprocessing、Day97 job statusをrunningへ更新する。Workerやmodelは実行しない。対象がなければ正常なemptyとする。

## Status

status参照はmessage本文を除くsummaryだけを返す。request/job ID、job/queue status、retry count、timestamps、expires_at、message length、read-only context指定、安全フラグを含む。

## Retry count

初期値は0、最大値は1である。明示関数だけがcountを更新し、jobを再enqueueしない。上限到達後は拒否する。自動retryとbackoffはDay101の責務である。

## Dead-letter isolation

queuedまたはprocessing jobを明示操作でdead-letter listへ隔離できる。pending/processingから除去し、Queue statusと固定error codeを更新する。内部例外文は保存しない。schedulerによる自動隔離は行わない。

## TTL

Day97のserver-owned `expires_at` から残存TTLを計算し、job recordとdedupe keyに同じTTLを設定する。期限切れjobはenqueueしない。TTLを延長せず、pending listにはTTLを設定しない。

## Secret handling

Redis URLとcredentialsはserver environmentからのみ取得し、payload、key、result、logへ含めない。recordはDay97の正規化済みmessageを配送目的で保持できるが、summary、test出力、smoke出力には本文を表示しない。

## Redis unavailable

既定はQueue disabledである。disabled時は接続せず、URL欠落・接続・command失敗時は固定error codeと `queue_write_performed: false` を返す。接続文字列や内部例外を返さない。

## Day97 boundary

Day97 `hermes.job.v1` の型と意味は変更しない。Day98は外側に `hermes.queue.v1` を追加する。既存同期APIをQueue化せず、API responseも変更しない。

## Day99 Worker Protocol boundary

Day98は配送と状態参照までであり、常駐Worker、heartbeat、AI runtime、model実行を行わない。Day99ではQueueを変更せず、Mac mini/RTX capability、health/readiness、heartbeat、Redis registry、processing jobのclaim/result純粋契約を別境界として定義した。

## Day101 Retry boundary

Day98はretry countの保持と明示incrementだけを提供する。Day101はJob/Queue共通のWorker未実行status `retry_scheduled` とterminalのQueue status `cancelled`、Luaによるclaim/capacity解放を追加した。failedはattempt terminalだがRecovery policyでretry可能であり、runningまたはretry可能なfailedだけをscheduleする。retry_scheduledはcancel/expire可能で、cancel時は対応retry keyを原子的に削除する。queued/runningへ直接戻さず、後続schedulerが新attemptを生成する。backoff中はpendingへ戻さず、cancelをdead-letterへ入れず、record期限をJobのabsolute deadlineへ揃える。

## Smoke test cleanup

実Redis smoke testは一意prefixにenqueueし、duplicate、dequeue、processing、隔離、dead-letterを確認する。cleanupはそのprefixの3 list、1 job record、1 dedupe keyだけを削除する。広範な削除は行わない。

## Rollback

Redis Queue実装、unit/smoke test、package scripts、公式`redis`依存とlockfile差分、Day98文書追記を取り除く。DB、RLS、API、Proposal、Applyのrollbackは不要である。
