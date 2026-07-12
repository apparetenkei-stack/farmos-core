# Hermes RTX Startup Request Boundary

## Business Value

Day102は、RTX必須処理に利用可能Workerがない場合でも無制御な起動を行わず、承認・実行前の安全なwake requestだけを生成してRedisへ保存する。電源操作、remote connection、GPU検出、model実行、DB writeは行わない。

## RTX-only startup policy

`hermes.worker.startup.policy.v1` はRTX専用で、request TTL 5分、cooldown 10分、Workerごとのactive request上限1をserver policyとして固定する。client override、自動起動、自動remote接続は禁止する。Mac miniのstartup requestは対象外である。

## Supported task classes and routing integration

対象は `heavy_reasoning`、`large_context`、`gpu_inference` だけである。軽量taskやfallback可能taskからrequestを作らない。Day100のserver-owned requirementとdecision summaryを照合し、preferred typeがRTX、fallback禁止、statusが `no_ready_worker` の場合だけ候補にする。`selected`、`no_capacity`、`capability_unavailable`、`routing_not_allowed` は拒否する。特にcapacity fullを電源停止と解釈しない。

## Worker state classification and eligibility

RTX summaryを `ready / offline / not_ready / runtime_unavailable / draining / unhealthy / capacity_full / missing / invalid` に分類する。target候補はrequired capabilityを明示的に持つRTXだけであり、capability不足Workerを起動対象にしない。RTX recordが0ならmissingとして許可するが、RTXは存在してもcapable RTXが0なら `startup_worker_capability_unavailable` で拒否する。

全capable RTXをaggregate評価する。readyかつcapacityありのWorkerと `no_ready_worker` decisionが矛盾すればfail-closed、続いてcapacity full、unhealthy、drainingを拒否し、全候補がoffline/not-ready/runtime unavailableの場合だけ許可する。heartbeat stale/offline判定は保存済みcapacityより先に行い、古いcapacityを稼働中の根拠にしない。複数候補はoffline、runtime unavailable、not-ready、Worker ID昇順で決定的に選ぶ。

## Requirement and wake request schema

`hermes.worker.startup.requirement.v1` はRTX capability、routing decision ID、固定reasonだけを持つ。`hermes.worker.wake.request.v1` はserver-owned request ID、保存済みWorker IDまたはmissing時null、時刻、absolute expiry、cooldown、requested status、安全フラグだけを持つ。network endpoint、hardware address、credentials、prompt、message、context、model情報を保持しない。

## Duplicate semantics and canonical replay

同一routing decisionはrequest有効期間内だけ `already_requested` として、保存済みcanonical requestを返す。新しく生成した未保存IDは返さない。request失効後はdecision keyも失効し、同一decisionでもcooldown中は `startup_cooldown_active` となる。別decisionで同じtargetのactive requestがあれば `startup_request_duplicate`、active expiry後もcooldown中なら `startup_cooldown_active` とする。targetがnullの場合は `missing` を使いRTX type単位で抑止する。

## TTL, cooldown, and atomic persistence

Redis keyは `wake-request`、`wake-active:rtx`、`wake-cooldown:rtx`、decision idempotency keyに分離する。Lua一操作でdecision、active、cooldownを確認し、request/active/decisionをrequest expiry、cooldownだけをcooldown expiryへ `PXAT` で保存する。request recordとactive keyの片側状態を残さない。status queryは安全なrequest metadataだけを返す。

## Redis failure and separation

Redis停止、canonical record不正、timestamp不正は固定error codeでfail-closedとし、内部例外や接続情報を返さない。Day102はrequest cancellationを実装せずDay103以降へ分離する。

## Existing boundaries

Day99 Worker registry、heartbeat、claim、capacityは読み取り入力であり変更しない。Day100 Routerへ副作用を追加せずdecision schemaを変更しない。Day101 retry/cancel lifecycleを変更せず、recoveryからstartupを暗黙実行しない。

## Day103 execution boundary

Day103は2分以内のoperator approval、server-side target照合、atomic reservationを経た明示runnerだけで1 packetを送る。成功時にrequestをacknowledgedへ更新する。Day102の `requested` は実行済みを意味しない。

## Rollback

`startup_runtime`、Day102 unit/preview/smoke runner、package scripts、本書と各文書のDay102追記を取り除く。既存Worker、Router、Recovery、Queue、Job、API、DB、RLS、Proposal、Auditのrollbackは不要である。
