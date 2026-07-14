# Hermes Post-Wake Routing Resume Boundary

## Business Value

Day105は、承認済みwake chainで起動確認されたRTX Workerを元Jobのroutingへ安全に再提示する。結果はdispatch可能なrouting metadataに限定し、Queue、Job、Worker claim、model、業務DBへ副作用を与えない。

## Canonical record chain

Initial routing has a production persistence path: the coordinator loads the canonical queued Job, reuses `routeHermesJob()`, and atomically stores `hermes.router.decision.record.v1` with its decision-ID index. Redis `TIME`, the Job absolute expiry, and `PEXPIRETIME` prevent an immortal or post-expiry binding. Sequential and concurrent calls replay the stored decision without overwriting it or extending TTL.

入力はJob IDだけである。RedisからQueue内Job、Job/request IDを既存Day100 decisionへ結び付ける`hermes.router.decision.record.v1`、Day102 `wake-decision` indexとWake Request、Day103 Execution、Day104 Confirmation、現在のWorker registryを読み、各既存runtime parserで検証する。Day100 decision schema自体は変更しない。

## Eligibility and consistency

Jobは`queued`かつ未期限切れ、original decisionは`no_ready_worker`、RTX専用capability、fallback禁止を必須とする。Wake Requestはacknowledged、Executionはsent/102 bytes、Confirmationはworker-ready/boot-confirmed/accepting-jobsでなければならない。wake、routing、execution、confirmation、target、capabilityの全ID関係を照合する。

## Current Worker revalidation and Router reuse

Confirmationは過去の観測なので、resume直前にcurrent Worker registryを再取得する。target RTX、futureでない45秒未満のheartbeat、healthy、ready、runtime available、not draining、required capability、capacity availableを要求する。そのsnapshotだけをDay100 `routeHermesJob()`へ再提示し、selected targetがwake targetと異なる場合は`routing_resume_target_changed`でfail-closedとする。

## Atomic persistence, replay, TTL

The selected routing summary is embedded in the resume record and is persisted in the same Lua operation as the resume ID index. An existing resume is validated and replayed before current Worker revalidation or Router execution; live Worker state only gates a new resume. Replay returns the canonical saved summary, never a newly generated decision carrying an old ID.

For new records, Lua rechecks source-key absolute expiries, Job/routing expiry, the exact Worker heartbeat observed by TypeScript, and freshness against Redis `TIME` (`age < 45,000 ms`). Missing, immortal, expired, future-heartbeat, or stale source state fails closed.

Lua is also the final runtime-validation boundary. Before any write it validates the complete queued Job and original no-ready routing binding, acknowledged Wake Request, sent Wake Execution, ready Confirmation, selected Resume record, embedded selected-routing summary, and every fixed safety flag. Routing-decision and Resume ID indexes must exist on replay and have the same absolute expiry as their canonical record. Missing, immortal, longer-lived, or otherwise mismatched indexes are rejected without repair, overwrite, or TTL extension.

Luaはcanonical chainとcurrent Worker snapshotを再検証し、成功した`hermes.routing.resume.v1`とresume ID keyだけを同一operationでPXAT保存する。同一関係の逐次・並行createはcanonical `already_exists`、異なる関係はconflictである。record/ID keyは1件、replayは非上書き・TTL非延長。expiryはnow+60秒、Job、routing binding、Wake/Execution/Confirmation Redis expiryの最短である。

## Safe query and non-goals

safe queryはID、capability、status、時刻、安全フラグだけを返し、message/prompt/context/network/credentialを返さない。Queue enqueue/dequeue、Job更新、Worker claim/capacity更新、model、UDP、SSH、DB/APIはDay105の非対象である。Day106以降がdispatch/claim境界を担う。

## Rollback

`resume_runtime`、Day105 unit/preview/smoke/gate、package scripts、本書とDay105 docs追記だけを除去する。Day97〜104 runtimeのrollbackは不要である。
