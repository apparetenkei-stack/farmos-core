# Day50 Hermes Business Prompt Policy Gate / Redaction Boundary

## 目的

Day50では、Day49の fixed business dummy prompt smoke test から、将来の実業務prompt送信へ進む前に必要な policy gate / redaction / restricted-domain blocker を追加する。

Day50は本番chat開始日ではない。
Day50は実業務prompt送信日ではない。
Day50はユーザー入力をLLMへ送る日ではない。
Day50は営農DBの実データをLLMへ送る日ではない。
Day50はproposal本文をLLMへ送る日ではない。
Day50はchat履歴保存日ではない。
Day50はproposal生成日ではない。
Day50はproposal apply接続日ではない。
Day50はUIから本番chat送信を有効化する日ではない。

Day50で作るものは、実業務prompt候補を受け取っても、LLMへ送る前に分類・遮断・redaction可否を判定する dry-run policy gate boundary である。

## 境界

- raw prompt全文は返さない
- sanitized prompt previewもsafe metadataのみに限定する
- endpoint実値は返さない
- model実値は返さない
- credentialsは要求しない・返さない
- response bodyは返さない
- request bodyは作らない
- request bodyは送らない
- local runtime callはしない
- external API callはしない
- DB writeはしない
- chat履歴は保存しない
- proposalは生成しない
- proposal applyは実行しない
- embeddings / vector search は実行しない

## 分類

prompt_category:

- operational_question
- planning_question
- proposal_related
- restricted_domain
- unknown

prompt_risk_level:

- low
- medium
- high
- blocked

redaction_decision:

- not_required
- required
- impossible
- blocked

send_decision:

- dry_run_only
- blocked
- not_configured

## blocked対象

以下を検出した場合は、Day50ではblockedにする。

- businessContext
- proposal本文
- crop_cycle_idなどの実業務ID
- customer / order / shipping / payment / payroll / salary / evaluation / personal
- 取引先 / 顧客 / 注文 / 出荷先 / 支払い / 金額 / 給与 / 評価 / 個人

## Day49 / Day48との関係

Day50 policy gate boundaryは、Day49 business prompt smoke boundaryとは別境界である。
Day49 smoke boundaryは fixed business dummy prompt only を維持する。
Day48 contract boundaryは business prompt dry-run contract only を維持する。

Day50は、Day48 contract status と Day49 smoke status を互換確認として参照するが、実promptをDay49 smokeへ渡さない。

## adapter switch

Day50では adapter switch に business_prompt_policy_gate_status を追加できる。

ただし、以下を維持する。

- selected_provider = mock
- fallback_provider = mock
- adapter_resultなし
- runtime callなし
- request bodyなし
- prompt送信なし

## Antigravity側

Day50時点ではAntigravity側の新規実装は原則不要。

営農アプリ側は引き続き `/dashboard/hermes` を mock / read-only / static preview のまま維持する。
送信フォーム、POST route、Server Action、Form Action、本番chat送信、LLM本番推論接続、DB書き込みはまだ追加しない。
