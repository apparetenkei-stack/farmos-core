# Day11 Extracted Facts Review Foundation

## Day11の目的

Day11では、Day10で生成された `knowledge.extracted_facts` の構造化候補に対して、人間が安全にレビュー（承認・却下）できる基盤を構築する。

AIが生成した候補は業務事実ではない。

そのため、`verified=false` / `rejected=false` の候補を、人間が確認して `verified=true` または `rejected=true` にできる土台を作る。

## Day11スコープ

Day11は約2時間で完了できる範囲に限定する。

実施すること:

- Review Foundation設計
- Review CLI v1作成
- verify処理
- reject処理
- 状態遷移確認
- 権限確認
- backup / restore test
- Git commit

実施しないこと:

- app schemaへの書き込み
- crop_cycles / work_records / shipmentsへの反映
- OCR本格実行
- Whisper本格実行
- LLM呼び出し
- Qdrant embedding投入
- OpenClaw / Hermes導入
- 外部API呼び出し

## Human in the Loop

Day11はHuman in the Loopを強化する段階である。

AIまたはシステムが生成したFact候補は、必ず人間が確認する。

`verified=true` は、人間確認済みを意味する。

`rejected=true` は、候補として不採用を意味する。

## Day10候補をすぐapp schemaに入れない理由

Day10で生成されたFact候補は、まだ業務データではない。

OCR誤認識、抽出ミス、分類ミスが含まれる可能性がある。

そのため、候補を直接 `app.crop_cycles` / `app.work_records` / `app.shipments` へ入れない。

FarmOS Coreでは以下の順序を守る。

1. 原本保存
2. テキスト抽出
3. Fact候補生成
4. 人間レビュー
5. Projection候補生成
6. 人間承認
7. app schema反映

## verified=true の意味

`verified=true` は、人間が内容を確認し、候補として正しいと判断した状態である。

AIが正しいと判断した状態ではない。

そのため、`verified_by` と `verified_at` を必ず残す。

## rejected=true の意味

`rejected=true` は、候補として採用しない状態である。

これは削除ではない。

候補は履歴として残し、`rejection_reason` に理由を保存する。

## correction の扱い

Day11では、既存Factの値を上書きしない。

`fact_value_text` / `fact_value_json` は破壊しない。

修正が必要な場合は、既存Factを直接変更するのではなく、新しい修正候補または `audit.knowledge_feedback` として扱う。

## Raw First / No Destructive Import

Day11でもRaw Firstを守る。

以下は破壊しない。

- `knowledge.source_documents`
- `knowledge.document_extractions`
- `knowledge.document_extractions.extracted_text`
- `knowledge.extracted_facts.fact_value_text`
- `knowledge.extracted_facts.fact_value_json`

## AI Agent Isolation

AIエージェントにはReview権限を与えない。

AI Readonly RoleとAI Proposal Roleは、`knowledge.extracted_facts` をSELECTできてもUPDATEできない。

Reviewは人間またはapp worker相当の権限でのみ行う。

## Day11で外部APIを呼ばない理由

Day11はReview基盤の作成が目的である。

外部API、LLM、Embedding、Qdrant、OpenClaw、Hermesは不要である。

外部依存を増やさず、DBとCLIの安全な状態遷移だけを確認する。

## Review CLI v1

Day11では `scripts/ingest/review_extracted_fact.ts` を作成する。

主な操作:

- `verify`
- `reject`

verify時:

- `verified=true`
- `verified_by` を保存
- `verified_at` を保存
- `rejected=false` を維持

reject時:

- `rejected=true`
- `rejection_reason` を保存
- `verified=false` を維持

## 状態遷移ルール

許可:

- 未レビュー → verify
- 未レビュー → reject

拒否:

- verified済み → reject
- rejected済み → verify
- verified済み → 再verify
- rejected済み → 再reject

状態遷移を壊さないことを優先する。

## Day11でやっていないこと

Day11では以下を実施しない。

- app schemaへの書き込み
- `app.crop_cycles` への書き込み
- `app.work_records` への書き込み
- `app.shipments` への書き込み
- OCR本格実行
- Whisper本格実行
- PDF解析
- LLM抽出
- 外部API呼び出し
- Qdrant embedding投入
- OpenClaw導入
- Hermes導入
- n8n導入
- Paperless導入

## Day11完了時の期待状態

Day11完了時には以下を満たす。

- Review CLIが存在する
- Fact候補をverifyできる
- Fact候補をrejectできる
- 二重reviewを防止できる
- 不正状態遷移を防止できる
- AI readonly roleはUPDATEできない
- AI proposal roleはUPDATEできない
- app schemaに触れていない
- source_documentsを破壊していない
- document_extractionsを破壊していない
- backup / restore testが成功している
- Git commitが完了している

## Day12への引き継ぎ候補

Day12では、Verified Facts Projection Candidate Foundationへ進む。

`verified=true` のFactだけを対象に、app schemaへ直接入れる前のProjection候補を作る。

Day12でもまだ `app.crop_cycles` / `app.work_records` / `app.shipments` には直接書き込まない。

Projection候補を作り、さらに人間承認を挟むことで、Knowledge Pipelineを安全に前進させる。
