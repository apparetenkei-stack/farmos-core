# Production AI Runtime Contract

## Business Value

Hermes の運用 AI リクエストに、追跡可能な request ID、固定タスク分類、正規化 status、duration、readiness を付与する。既存 provider 情報を維持したまま、後続の Queue、Worker、Model Router、監視が依存できる server-owned 契約を提供する。

## Runtime contract

`hermes.runtime.v1` は interactive chat の同期実行メタデータである。Day96 の分類は `interactive_chat`、`interactive`、`synchronous`、`lightweight` に固定する。request ID と duration は DB に保存しない。

既存 Hermes API envelope のフィールドは削除、改名、再ネストせず、`runtime_metadata` を追加する。

## Status mapping

| Provider status | Runtime status |
| --- | --- |
| `ok`, `mock_fallback` | `succeeded` |
| `bad_request` | `rejected` |
| `blocked`, `disabled_by_env` | `blocked` |
| `timeout` | `timed_out` |
| `runtime_error`, unknown | `failed` |

`mock_fallback` は既存 provider status の名称であり、Day96 が自動 fallback を行ったことを意味しない。

## Readiness mapping

| Condition | Readiness |
| --- | --- |
| provider status が `ok` かつ runtime reachable | `ready` |
| `timeout` または `runtime_error` | `not_ready` |
| mock、bad request、blocked、disabled | `not_checked` |

mock は実 runtime の ready 判定に使用しない。

## Server-owned metadata

request ID は API 呼出しごとにサーバーが UUID として一度だけ生成する。JSON parse error、validation error、blocked、timeout、runtime error を含む全結果で同じ ID を返す。ID に prompt、ユーザー入力、Secret を含めない。

duration は単調増加時計を優先し、開始から結果確定までを0以上の整数ミリ秒で表す。時計が逆行した場合は0とする。

## Request body invariant

ブラウザ request body は次だけを受信する。

- `message`
- `includeReadonlyContext`
- `provider`

request ID、タスク分類、priority、model class、timeout、base URL、model、認証情報、token、DB 接続情報は受信しない。禁止フィールドまたは未知フィールドは実行前に拒否する。

## Fail-closed

Day96 metadata は常に `fail_closed: true`、`fallback_used: false`、`queue_used: false` とする。エラー時に Queue、retry、別 provider、重量モデルへ自動移行しない。既存の DB write、Proposal save/apply、audit write、Secret exposure の false 境界を維持する。

## Operational baseline

baseline は現在時点の制御された1〜10件のサンプル測定であり、過去の本番成功率や SLO ではない。既定は mock 5件で、件数、成功・失敗数、failure rate、duration の最小・平均・最大、status 集計だけを標準出力へ出す。

prompt、response、read-only context、Secret、認証情報、DB 接続情報を出力せず、DB に保存しない。`historical_metrics_available` と `db_write_performed` は false である。

## Day97 Queue boundary

Day96 は `queue_used: false` までを契約化する。Day97では、同期Runtimeを変更せず、独立した `hermes.job.v1` Job Envelope、request/job ID分離、status遷移、payload分離、固定TTLを確定した。Redis接続、enqueue/dequeue、job persistence、retryは行わず、実Queue接続はDay98の別境界とする。

Day98では既存同期RuntimeとAPIを変更せず、独立した `hermes.queue.v1` でRedisへの最小配送境界を追加した。Queueは明示runner/serviceからのみ利用し、Worker/model実行と自動retryは行わない。

## Day100 Model Router boundary

Day96 は model class を `lightweight` に固定し、実ルーティングを行わない。Day100ではDay99 Worker summaryを純粋入力とする `hermes.router.requirement.v1` と `hermes.router.decision.v1`、固定capability policy、eligibility、決定的ranking、fallback、failure分類を追加した。ブラウザやpromptからWorker/modelを選ばず、claimやmodel実行も行わない。

## Day101 Recovery boundary

Day101では同期APIとブラウザrequest bodyを変更せず、server-side timeout判定、固定retry分類、exponential backoff、schedule-only retry、user cancellation、claim/capacity解放を追加した。AI/model、DB、Proposal、Audit、公開APIは実行しない。

## Day102 RTX startup request boundary

Day102では既存同期APIとrequest bodyを変更せず、RTX必須taskの `no_ready_worker` をserver-sideで分類し、実行前のwake requestだけをRedisへ原子的に保存する。起動信号、remote接続、GPU/model実行、DB writeは行わない。

## Day103 Approved Wake Execution boundary

Day103は公開APIを追加せず、明示operator approvalとatomic reservationを通る専用runnerだけに1回のwake送信を限定する。送信後もremote接続、GPU/model実行、DB writeを行わない。

## Day104 Wake Confirmation boundary

Day104はsent executionとacknowledged requestから3分のconfirmationを作成し、対象RTXのfresh heartbeat、health、readiness、runtime、capability、capacityをread-only評価する。Router、Queue、retry、remote接続、model、DBへ副作用を持たない。

## Rollback

Day96 の rollback は次の追加だけを取り除く。

1. API envelope の `runtime_metadata` と生成処理
2. Runtime contract、境界テスト、baseline runner
3. 追加した package scripts
4. Day96 の roadmap と architecture 文書

DB migration、RLS、永続データ変更はないため、DB rollback は不要である。既存 Hermes provider status と request body 契約は変更前のまま残る。
## Day105 phase gate

Post-wake routing resumeはDay96〜105 Phase Aの最終gateである。confirmed RTXを既存Routerへ再提示するが、Queue write、Worker claim、model execution、業務DB writeは行わない。
## Day106 Daily Farm Brief production boundary

Day106 adds isolated, read-only snapshot and brief contracts with explicit freshness, empty, unavailable, unknown, provenance, limitation, and deterministic truncation semantics. It does not connect the brief to Runtime dispatch, models, APIs, notifications, or business databases.

## Day107 Daily Farm Brief real-data integration

Day107 reuses the existing Operational Read-only and Memory Context readers through an injected integration boundary. It normalizes reader failure, preserves unknown source timestamps, and emits only a count/status safe preview without persistence, notification, LLM execution, Queue/Worker activity, or database writes.

## Day108 Daily Farm Brief scoped role projection

Day108 derives deterministic crop, redacted field, and redacted Crop Cycle scope indexes from explicit references only, then applies a server-owned administrator/general_staff disclosure boundary. General staff receives only exact server-owned allow-list matches; an empty list yields zero scopes. Raw identifiers, source bodies, internal diagnostics, writes, persistence, notifications, and model or Runtime operations remain outside the boundary.

## Day109 Daily Farm Brief generation orchestration

Day109 adds a fixture-only, read-only decision boundary for Asia/Tokyo business dates, server-owned scheduled/manual requests, same-day duplicate prevention, bounded failed-state retry, and explicit stale display. The production schedule remains unconfigured and fails closed; no Brief persistence, scheduler, API, notification, Queue/Worker, model, or database operation is added.

## Day110 Daily Farm Brief execution and latest read

Day110 enforces the strict Day109 decision before one Day107 integration and one Day108 scope/role projection pass. It returns a canonical execution result and injected-state latest candidate without persistence, API/UI, retry, notification, Queue/Worker, model, scheduler, Redis, or database operations.

## Day111 Daily Farm Brief authenticated latest read API

Day111 adds a GET-only, no-store response boundary around the strict Day110 latest candidate parser. Authentication precedes server-owned role/scope resolution; unauthenticated access returns 401, unknown or forbidden roles return 403, and neither path invokes the at-most-once, no-retry source reader. Its strict discriminated union separates projectable Brief data from status-only in-progress, failed, and unavailable states without accepting a completed candidate or raw execution result. The service applies server-owned exact projection only to projectable sources and uses Day110 zero-scope semantics for status sources, then parses both candidates strictly. Current, stale, in-progress, failed, and unavailable return safe 200 responses; invalid sources return 500. Raw source/scope/snapshot identifiers remain internal. The production adapter has no auth/source provider and denies by default. No writes, persistence, scheduler, Queue/Worker, Redis, LLM, notification, UI, migration, or RLS change is added.

## Day112 Daily Farm Brief persistence contract and read repository

Day112 defines a strict persisted-record union and an at-most-once, no-retry, read-only repository boundary that converts validated canonical records to the Day111 latest-source union. Selection prioritizes current completed, current in-progress, current failed, the latest unambiguous previous completed source, then unavailable. Unknown fields, any invalid or future record, invalid repository envelopes, version gaps/conflicts, duplicate versions, and same-priority ambiguity fail closed; invalid records are never skipped. Record IDs, versions, repository metadata, and storage timestamps do not cross the Day111 adapter.

This boundary is fixture-only. No database table exists, no migration or RLS change was created or executed, Brief persistence was not performed, and the production repository remains deny-by-default and unconnected. Day111 production authentication also remains unconnected, so the API continues to return 401 with no-store. Day113 may evaluate a write-command boundary only after separate review of storage ownership, transactions, idempotency, RLS, retention, rollback, and production readiness.

## Day113 Daily Farm Brief persistence write command

Day113 assigns Daily Brief storage to FarmOS Core and introduces strict server-owned projectable/status command builders, Day112 record revalidation, idempotent replay/conflict semantics, optimistic expected-version checks, and an atomic canonical transition behind one repository method. The fixture repository simulates v1 creation, v1 supersede plus v2 canonical creation, rollback, and read-after-write without exposing record IDs or versions in the service result.

Semantic duplicate prevention independently enforces uniqueness of command type, business date, and source execution reference, so changing an idempotency key cannot persist the same execution twice. A distinct valid execution is required for the next canonical version. The write service rejects future command/record timestamps against an injected server clock before repository access. Completed Day110 results bind their exact snapshot and scope index with an internal canonical fingerprint; the persistence builder rejects substituted payloads even when business date and generated timestamp match.

This is not a Runtime, Worker, LLM, API, Proposal, Audit, or business-database write path. Production database writes remain false, the production repository denies by default, and there is no table, migration, RLS change, SQL, credential access, scheduler, notification, Queue/Worker change, or production connection. Day114 may evaluate an isolated local DB vertical slice after explicit storage, transaction, idempotency, permission, retention, and rollback review.

## Day114 isolated PostgreSQL persistence

Day114 connects the Day113 command and Day112 reader only to the dedicated local Docker database `farmos_core_day114_test`. FarmOS Core owns two `ai` tables. READ COMMITTED plus advisory transaction locks, unique receipts/canonical constraints, one-connection transactions, zero retry, rollback injection, real concurrency, read-only DTO reconstruction, Day112 selection, and Day111 current/stale output are verified. Production migration/write/RLS remain false and production adapters still deny by default.

## Day115 production readiness and farming-application proxy

Day115 defines strict safe production-read configuration, target classification, a lazy `pg` read-only repository, server authentication/provider and actor-directory bridges, latest-route dependency composition, and a Core-side farming-application proxy contract. The reader uses explicit columns, 500 records maximum, UTC, bounded timeouts, transaction-read-only verification, future-row exclusion, and zero retry. Passwords, connection strings, database/user identities, raw rows, exceptions, and upstream bodies never reach API results.

Production configuration, database, authentication, and actor-directory providers remain unconnected and deny by default. No production connection/read/write, migration, RLS/role change, browser/UI change, or farming-application repository change occurs. Day116 is the approval-gated manual generation → persist → authenticated read E2E handoff; Day117 remains farming-application display.

## Day116 manual generation to authenticated read E2E

Day116 composes the unchanged Day109–115 boundaries in one deterministic manual-administrator runner. It connects only to `farmos_core_day114_test` through the Day114 target/current-database guards and only to Day115 fixture authentication and actor mapping. One integration, scope build, projection, atomic persistence transaction, and read occur with zero retry. Server-owned identifiers and source fingerprints preserve idempotency and provenance; a distinct execution advances v1 to v2, while injected failure after supersede rolls back records and receipts and leaves the prior authenticated current result observable.

Production database, migration, RLS/role, authentication, and actor directory remain unconnected. Browser input, farming-application changes, scheduler, Queue/Worker, LLM, notification, Proposal, and Audit operations remain absent. Day117 is the farming-application display handoff; Day118 scheduler work requires a separate gate.
