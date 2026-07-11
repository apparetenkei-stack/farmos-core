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

Day96 は model class を `lightweight` に固定し、実ルーティングを行わない。Day100 の Model Router は routing policy、選択理由、fallback policy を独立した契約として追加し、ブラウザから model を指定可能にしてはならない。

## Rollback

Day96 の rollback は次の追加だけを取り除く。

1. API envelope の `runtime_metadata` と生成処理
2. Runtime contract、境界テスト、baseline runner
3. 追加した package scripts
4. Day96 の roadmap と architecture 文書

DB migration、RLS、永続データ変更はないため、DB rollback は不要である。既存 Hermes provider status と request body 契約は変更前のまま残る。
