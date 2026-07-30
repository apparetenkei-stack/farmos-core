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

## Codex Usage Budget and Model Routing

Maintain implementation quality and FarmOS safety while minimizing weekly Codex usage.

### Default routing

- Use Luna-class work for deterministic read-only inspection, targeted searches, test execution, build, lint, typecheck, diff checks, evidence collection, log classification, and strictly mechanical edits.
- Use Terra-class work for normal implementation, multi-file changes, parser or validator work, ordinary debugging, and extensions that preserve existing contracts.
- Use Sol-class work only for architecture, source-of-truth changes, authorization, RLS, migrations, production writes, Execution Gateway, idempotency, rollback or compensation, secrets, unresolved complex failures, and final P1/P2 semantic review.
- Never claim that a model was changed or delegated unless the runtime confirms it.
- If model-specific delegation is unavailable, continue with the current model while applying the same task classification and usage controls.

### Escalation

- One failed Luna-class attempt for the same task escalates to Terra-class work.
- Two Terra-class attempts failing for the same root cause escalate to Sol-class work.
- Authorization, RLS, migration, production write, external execution, secret handling, rollback, and compensation require Sol-class review from the start.
- Do not repeatedly retry a lower-cost model after its escalation threshold is reached.

### Usage controls

- Do not scan the entire repository by default.
- Inspect in this order: Git state, explicitly named files, direct dependencies, related tests, then surrounding code only when necessary.
- Do not reread unchanged files or repeat successful commands without a concrete reason.
- Default to zero subagents. Use delegation only when it clearly reduces total work.
- Use at most one independent reviewer, only at the final semantic gate when required.
- Do not use Ultra or competitive multi-agent generation unless explicitly requested or required by an unresolved Sol-class problem.
- Subagents consume additional usage; do not delegate trivial work that the parent can complete with less total processing.
- Run validation in this order: targeted test, related regression tests, typecheck or build, then final diff checks.
- Do not repeat a full build while a targeted test still fails.
- Summarize long command output instead of reproducing successful logs.
- Implement one recommended solution rather than generating multiple complete alternatives unless an irreversible architectural tradeoff exists.

### Token management

- Maximize evidence per token: check the baseline once, inspect the current diff first, and prefer targeted search and targeted tests.
- Do not repeat an audit or root-cause investigation without new evidence.
- Stop when additional work cannot change the decision.
- Keep handoffs compact and evidence-based.

### Concrete model delegation

When model delegation is useful and reduces total work:

- Delegate deterministic read-only inspection, targeted searches,
  test execution, build/lint/typecheck, evidence collection,
  diff checks, and log classification to `farmos_luna_inspector`.

- Perform normal implementation in the current Terra parent session.
  Use `farmos_terra_worker` only when an isolated implementation
  thread materially reduces context pollution or coordination cost.

- Delegate architecture, authorization, RLS, migration,
  production persistence, Execution Gateway, idempotency,
  rollback, compensation, Secret-boundary, and final P1/P2 review
  to `farmos_sol_reviewer`.

- Do not spawn a subagent merely to relabel the same work.
- Default to no subagents.
- Spawn at most one Luna inspector and one Sol reviewer per Day
  unless the user explicitly authorizes more.
- Use `/agent` to inspect the actual spawned thread and model.
- If the expected custom agent cannot be spawned, report the failure
  and continue under the existing escalation policy.

### FarmOS safety invariants

Usage reduction must never bypass:

- Proposal First
- Human in the Loop
- Fail Closed
- server-side authorization
- no AI direct write to confirmed business data
- no secret exposure
- stale-data rejection
- idempotency
- audit
- rollback or compensation
- protected-file constraints
- explicit human approval before Level 2 or Level 3 execution

Do not commit, push, merge, rebase, deploy, apply migrations, change RLS, mutate production data, apply proposals, or execute external operations without explicit user authorization.

### Day execution

For every FarmOS Day task:

1. Classify the risk level and the minimum sufficient model class.
2. State the relevant safety boundary internally before editing.
3. Reuse existing contracts and patterns before creating new abstractions.
4. Prefer one vertical implementation slice over broad exploratory work.
5. Use bounded retries and escalate according to this policy.
6. Report actual model delegation only when confirmed by the runtime.
7. Include the applied model class, escalation history, tests, safety checks, and remaining risks in the final report.
8. Use the `farmos-efficient-execution` skill for implementation, review, debugging, testing, and Day handoff work.
9. Do not advance to the next Day until the current Day completion gates pass.
10. Resolve incomplete work as a supplement of the same Day unless the roadmap explicitly authorizes advancing.

## Coordination Shadow Reference

This repository uses the repository-owned `coordination.lock` only as a
Shadow version pin to the approved Coordination commit.

The lock is not a loader, approval, permission grant, automatic update
mechanism, or production authority. Shadow adoption is not active adoption.

Repository-local safety rules remain binding when they are stricter.
Missing, unavailable, stale, or mismatched Coordination state must not
expand authority. Fall back to read-only or proposal-only operation and
report the mismatch.

Do not modify the pinned Coordination reference automatically.
