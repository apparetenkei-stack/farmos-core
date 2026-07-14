# FarmOS Core Master Roadmap

## North Star

Agricultural Knowledge OS を構築し、農場全体の知識、方針、提案、承認、実行結果を安全につなぐ。

FarmOS Core は Proposal、Knowledge、Policy、Audit、AI 推論、RAG、予測、提案を担う。営農アプリが保持する作業、圃場、作期、人員、資材、在庫などの業務事実を代替しない。

## Milestones

- Day120: 農園主向け AI 参謀
- Day130: Proposal 運用
- Day145: 承認後 Apply
- Day160: 現場中核業務
- Day180: 生産・販売統合参謀
- Day200: Brand / Content
- Day220: 統合安定稼働

## Production AI Runtime Platform

Day96〜105 は Production AI Runtime Platform フェーズとする。運用 AI リクエストの共通契約を起点に、後続の Queue、Worker、監視、Model Router を安全境界ごとに段階導入する。

このフェーズでも Proposal First、Human in the Loop、fail-closed、業務 DB への AI 直接 write 禁止を維持する。各段階は独立して rollback 可能であり、未接続、未取得、失敗、権限なしを同一状態として扱わない。

Day97では、Redis接続前の独立した `hermes.job.v1` Job Envelope、status遷移、payload分離、固定TTLを確定する。実Queue接続とjob persistenceはDay98の別境界とする。

Day98では `hermes.job.v1` を維持したまま、Redis primitiveによる `hermes.queue.v1`、重複抑止、dequeue、status、retry count保持、dead-letter隔離、TTL、停止時fail-closedを確定する。常駐WorkerとAI実行はDay99以降の別境界とする。

Day99では `hermes.worker.v1`、Mac mini/RTX capability、health/readiness、heartbeat、Redis Worker registry、job claim/resultを確定する。常駐Worker、AI/model実行、WOL、SSH、GPU検出、worker routingは実装しない。

Day100では `hermes.router.requirement.v1` と `hermes.router.decision.v1`、固定task/capability policy、effective readiness、capacity filtering、決定的ranking、軽量task fallback、failure分類を確定する。claim、Queue更新、model実行は行わない。

Day101では `hermes.timeout.policy.v1`、`hermes.retry.policy.v1`、`hermes.retry.schedule.v1`、`hermes.cancel.request.v1`、固定retry分類、exponential backoff、duplicate防止、user cancellation、claim/capacityのatomic解放を確定する。常駐scheduler、自動retry、Worker signal、model実行、公開APIは行わない。

Day102では `hermes.worker.startup.requirement.v1`、`hermes.worker.startup.policy.v1`、`hermes.worker.wake.request.v1`、RTX-only eligibility、duplicate/cooldown、canonical replay、absolute TTL、atomic Redis persistenceを確定する。実際の起動信号、remote接続、GPU/model実行、公開APIは行わない。

Day103では `hermes.wake.execution.approval.v1`、`hermes.wake.execution.policy.v1`、`hermes.wake.execution.v1`、server-side target resolver、magic packet、atomic reservation、sent/failed確定、request acknowledgmentを確定する。実行は明示runnerの1 packetに限定し、起動確認はDay104へ分離する。

Day104では `hermes.wake.confirmation.policy.v1`、requirement、confirmation record、post-wake heartbeat、readiness/runtime/capability/capacity評価、atomic create/update、timeoutを確定する。Router/Queue再開はDay105以降へ分離する。
### Day105 complete candidate

Hermes Post-Wake Routing ResumeとRuntime Phase Gateを追加し、current Worker再検証、既存Router再利用、atomic duplicate/concurrent preventionを固定した。dispatch/claim/model executionはDay106以降へ分離する。
### Day106 — Hermes Daily Farm Brief Production Contract

Production snapshot, source-state freshness, deterministic fact, provenance, limitation, strict parser, preview, and regression boundaries are implemented without external connections or writes. The Day90 prototype remains intact.

### Day107 — Hermes Daily Farm Brief Real Data Integration Boundary

The existing read-only Operational and Memory Context paths are integrated with the Day106 canonical snapshot and brief builder. Unit and fixture preview remain connection-free; real read-only smoke is separately opt-in and outputs only safe aggregate metadata.

### Day108 — Hermes Daily Farm Brief Scoped and Role-aware Projection Boundary

The unchanged canonical snapshot and brief now feed deterministic crop, redacted field, and redacted Crop Cycle scope indexes. Server-owned administrator/general_staff projection, strict allow-list filtering, explicit unresolved/unscoped semantics, fixture-only safe preview, and fail-closed parsers are implemented without API, UI, persistence, notification, model, Queue, Worker, migration, or RLS work. Day109 retains scheduling, manual regeneration, same-day duplicate prevention, and stale-brief display.

### Day109 — Hermes Daily Farm Brief Generation Orchestration Boundary

Server-owned request normalization, Asia/Tokyo business-date derivation, strict injected existing-state parsing, same-day duplicate/in-progress protection, bounded failed-state retry, and explicit stale display are implemented as deterministic fixture-only decisions. The formal schedule remains unconfigured and fail-closed; persistence, cron, API/UI, notification, Queue/Worker, model execution, and DB writes remain Day110-or-later concerns.
