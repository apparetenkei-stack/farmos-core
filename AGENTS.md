# Project purpose

このプロジェクトは、単なる作業記録アプリではなく、農場全体の意思決定を支援する Agricultural Knowledge OS を構築する。

# System responsibilities

- FarmOS Core: Proposal、Knowledge、Policy、Audit、AI 推論、RAG、予測、提案
- 営農アプリ: 作業、圃場、作期、人員、資材、在庫などの業務事実、現場入力、承認 UI、業務実行結果

FarmOS Core を営農アプリの代替業務 DB にしてはならない。

# Safety rules

- Proposal First
- Human in the Loop
- AI は app 業務テーブルへ直接 write しない
- AI は Sales 業務テーブルへ直接 write しない
- AI は外部サービスへ直接公開しない
- 人間承認なしの Apply を行わない

AI に write 権限を与える場合でも、その上限は明示的に許可された Proposal フローの `ai.proposal_inbox` のみとする。通常の Chat、RAG、分析、Runtime 処理は write を行わない。

次を禁止する。

- `DELETE`
- 無承認の業務 DB write
- DB migration の自動実行
- RLS の無断変更
- Secret の参照・表示
- `.env.local` 内容の表示
- `git commit` の自動実行
- `git push` の自動実行
- `main` への自動 push
- 会計・給与・契約・決済・発注の AI 単独実行

# Data contract rules

次を別状態として扱う。

- 0件
- 未取得
- 未接続
- 取得失敗
- 権限なし
- データが古い

欠損値を推測して業務事実として補完してはならない。

Hermes chat のブラウザ request body は、明示的な仕様変更がない限り次の3項目だけとする。

- `message`
- `includeReadonlyContext`
- `provider`

Secret、base URL、model、timeout、token、DB 接続情報をブラウザから送信してはならない。

# Development rules

- 実装前に既存構造を調査する
- 既存 API 契約を不用意に変更しない
- 変更を小さくコミット可能な単位にする
- 失敗時は fail-closed とする
- テスト、build、diff check、rollback 方法を確認する

長い heredoc による docs 生成コマンドは作らない。

Next.js の現在バージョンに固有の実装を行う場合は、必要に応じて `node_modules/next/dist/docs/` の該当ドキュメントを確認する。

# Codex execution authority

Codex は、このリポジトリ内に限り、次を承認なしで実行してよい。

- 既存構造、コード、テスト、docs の調査
- ソースコード、テスト、scripts、docs の編集
- package.json に既に定義された test、check、lint、typecheck、build の実行

- `pnpm test` は未構成で意図的に失敗するため使用しない。
- 対象機能に対応する既存の個別 test script を package.json から選択して実行する。
- 失敗したテストの原因調査、限定的な修正、再実行
- `git status`
- `git diff`
- `git diff --check`
- `git log`
- `git show`
- fake adapter、fixture、mock、隔離テスト環境を使った検証
- 最終差分と検証結果の報告

次のためだけに承認を要求してはならない。

- 失敗したテストの再実行
- package.json に既に存在する安全な検証 script の実行
- リポジトリ内の実装に必要なファイル編集
- read-only Git コマンドの実行

次は実行前に人間承認を必要とする。

- dependency の追加、削除、更新
- Node.js または package manager のバージョン変更
- Docker service の起動、停止、再起動、build、削除
- 明示された隔離テスト DB 以外への DB write
- migration の作成または適用
- schema、RLS、role、permission の変更
- `.env`、Secret、credential、token の参照または変更
- 本番サービスへのアクセス
- `git commit`
- `git push`
- merge、rebase、tag、release、deploy
- Proposal の Apply
- 業務データの確定変更
- 外部通知または外部公開

次は常時禁止する。

- `git push --force`
- `git reset --hard`
- `git clean -fd`
- `git clean -fdx`
- destructive Docker prune
- `docker compose down -v`
- 本番環境での `DELETE`
- `DROP`
- `TRUNCATE`
- Secret、private key、token、credential の表示
- Supabase service role credential の使用
- AI 生成処理から app または Sales 業務 schema への直接 write
- Proposal First または Human in the Loop の回避
- ユーザーから明示指示されていない `.codex/` セキュリティ設定の変更
