# Hermes Job Envelope Contract

## Business Value

`hermes.job.v1` は、利用者要求と実行単位を別IDで追跡し、業務payloadとruntime metadataを分離する。RedisやWorkerを導入する前に、status、TTL、Secret非混入、安全境界を固定する。

## Request ID and job ID

- `request_id`: 利用者の1要求を識別するserver-owned ID。同じ要求から派生する複数jobで共有できる。
- `job_id`: 1つの実行単位を識別するserver-owned UUID。同じrequestから複数jobを作る場合もjobごとに異なる。

両IDはクライアント、Secret、業務payloadから生成しない。Day97ではDBへ保存しない。

## Job status

- `queued`: 受理済みだがworker未実行
- `running`: workerが処理開始済み
- `succeeded`: 正常完了
- `failed`: 実行失敗。Day97では自動retryしない
- `cancelled`: 実行開始前または実行中にキャンセル済み。キャンセル機能自体は未実装
- `expired`: 期限切れで実行対象外

`succeeded`、`failed`、`cancelled`、`expired` はterminal statusである。

## Allowed transitions

- `queued` → `running`, `cancelled`, `expired`
- `running` → `succeeded`, `failed`, `cancelled`, `expired`

遷移時に変更するのは `status` と `updated_at` だけである。

## Forbidden transitions

直接の `queued` → `succeeded` / `failed`、`running` → `queued`、terminal statusからの全遷移を禁止する。不正遷移は状態を変更せず拒否する。

## Payload and runtime metadata

payloadは `message` と `include_readonly_context` だけを持つ。request/job ID、status、priority、model class、execution target、timestamp、TTLはruntime metadataに置く。

messageはtrim後に空でなく、500文字以下かつ単一行でなければならない。read-only context本文はpayloadへ格納しない。

## Forbidden payload fields

provider、model、model class、priority、timeout、base URL、API key、token、credentials、authorization、cookie、DB接続情報、service role、system prompt、proposal body、request/job ID、read-only context本文をpayloadへコピーしない。

providerとmodelの選択はDay100 Model Routerのサーバー側責務である。

## Secret isolation

payloadは許可された2項目から新規作成し、unknown fieldを保持しない。Secretらしい値を推測、変換、複製しない。previewもmessage本文を出力せず文字数だけを表示する。

## TTL

TTLはserver-ownedの固定5分である。`expires_at` は `created_at` から計算し、クライアントやpayloadから受け取らない。期限判定は純粋関数であり、自動削除、scheduler、DB更新を行わない。

## Day96 Runtime boundary

Day96の同期APIは `hermes.runtime.v1`、`execution_mode: synchronous`、`queue_used: false` を維持する。Day97の `hermes.job.v1` は独立したpreview契約であり、`execution_mode: queued`、`queue_persisted: false`、`worker_execution_performed: false` を表す。既存API responseへjob envelopeを追加しない。

## Day98 Redis Queue boundary

Day97はRedis接続、enqueue/dequeue、job persistenceを実装しない。Day98では `hermes.job.v1` を入力契約として利用できるが、永続化、配送保証、重複、障害時の扱いを別の安全境界として定義する必要がある。

## Rollback

Job Envelope実装、境界テスト、preview runner、package scripts、Day97文書追記を取り除く。Day96 Runtime、既存API、DB、RLS、Proposal、Applyに変更はないため、それらのrollbackは不要である。
