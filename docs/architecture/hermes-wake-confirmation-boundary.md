# Hermes Wake Confirmation / Readiness Boundary

## Business Value

Day104はwake packetの送信成功とRTX Workerの起動成功を分離し、対象Worker自身のpost-wake heartbeatをRedis上のcanonical recordから確認する。SSH、remote command、GPU/model処理、Router、Queue、Job retry、DB writeは行わない。

## Policy and requirement

`hermes.wake.confirmation.policy.v1` はconfirmation window 3分、Day99と同じheartbeat freshness 45秒、RTX・sent execution限定、client timeout override禁止を固定する。`hermes.wake.confirmation.requirement.v1` はacknowledged requestとsent executionを照合し、deadlineをexecution completed-atからserver-sideで算出する。作成時は `execution.completed_at <= now < confirmation_deadline_at` を必須とし、未来のexecution timestampを保存前に拒否する。request/executionのwake request IDとtarget Worker IDを照合し、target不一致は `confirmation_target_mismatch`、routing decision不一致は `confirmation_routing_mismatch` でfail-closedとする。

## Heartbeat and readiness

post-wake heartbeatは対象Worker ID、RTX type、有効なWorker registry schema、`last_heartbeat_at > execution.completed_at`、futureでないこと、45秒未満のfreshnessを必須とする。`now - last_heartbeat_at < 45000` はfresh、`>= 45000` はstaleである。別Worker、送信前または同時刻、stale、future、invalid recordは成功根拠にしない。healthy、not draining、required capability、ready、runtime availableを個別評価する。

## Boot success and capacity

freshなpost-wake heartbeat自体をboot確認根拠とする。このためworker-not-ready、runtime-unavailable、unhealthy、draining、capability-unavailableも `worker_boot_confirmed=true` かつ `worker_accepting_jobs=false` である。heartbeat未確認、pre-execution heartbeat、stale heartbeat、timeoutだけはboot未確認のままとする。`worker_ready` は利用条件の評価完了を表し、capacity fullでも `worker_boot_confirmed=true`、`worker_accepting_jobs=false`、`confirmation_worker_ready_capacity_full` とする。Day104はRouterやQueueへJobを戻さない。

## Lifecycle and timeout

waiting、worker-not-ready、runtime-unavailableはdeadline前のnon-terminalである。fresh heartbeatは同一check内でhealth/readiness/runtime/capabilityまで評価するため、`heartbeat_detected` は保存statusに含めない。worker-ready、unhealthy、draining、capability-unavailable、timed-outはterminalで、以後変更しない。deadline到達はtimed-outであり、その後のheartbeatで復活しない。

## Atomic persistence and duplicate semantics

Lua createはcanonical request/executionとtarget/routing整合を再検証し、confirmationとID keyをabsolute expiryで一括保存する。recordはdeadline後5分だけ保持し無期限保存しない。同一execution replayでもwake request、execution、target、required capability、execution completed-at、deadlineの全関係を照合する。existing branchは呼出し側の候補IDに依存せず、既存recordのcanonical confirmation IDからID keyを検証し、完全一致時だけcanonical `already_exists` を返す。このため同一requestへの並行createは1件だけが`created`、後着はcanonical IDを持つ`already_exists`となる。ID key欠落・不一致は自動修復せずfail-closedとし、record非上書き・TTL非延長を維持する。checkは1回だけWorkerをread-only観測する。Lua updateはID、status/reason allowlist、server-owned timestampの単調性、不変timestamp、boot/accepting整合、terminal protectionを再検証し、KEEPTTLで更新する。

## Safe query and boundaries

safe queryはconfirmation/Worker観測metadataだけを返し、network target、hardware address、hostname、credentials、内部例外を含めない。Day99 Worker recordとheartbeatは変更せず、Day102 request、Day103 executionもread-onlyで参照する。Day105がrouting resumeを担当する。

## Rollback

`confirmation_runtime`、Day104 test/preview/smoke、package scripts、本書とDay104追記だけを除去する。Worker、Startup、Wake、Router、Queue、Job、API、DBのrollbackは不要である。
