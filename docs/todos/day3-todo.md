# Day 3 TODO - FarmOS Core

作成日: 2026-06-30

---

## Day 3の目的

Day 2で構築したローカルDocker基盤を壊さず、FarmOS Coreの安全なDB設計とAI提案受け皿を作る。

Day 3では、AIエージェントそのものは導入しない。

AIが将来入っても安全なように、DB権限、proposal_inbox、source_documents、extracted_facts、knowledge_feedback の基本設計を進める。

---

## 優先順位 1 - Docker Compose改善

現状、env_file により一部サービスへ不要な環境変数が渡っている。

Day 3では、各サービスに必要な環境変数だけ渡すように docker-compose.yml を改善する。

対象

* PostgreSQL
* Redis
* MinIO
* Qdrant

完了条件

* docker compose config が通る
* 不要な環境変数が各サービスへ渡らない
* 127.0.0.1 バインドは維持
* docker compose up -d が成功
* docker ps ですべて Up

---

## 優先順位 2 - PostgreSQLロール設計

ローカルDBに役割別ユーザーを設計する。

候補

* farmos_admin_local
* farmos_app_local
* farmos_ai_readonly_local
* farmos_ai_proposal_local

方針

* adminは管理用
* appはアプリ用
* ai_readonlyは読み取り専用
* ai_proposalはproposal_inboxへの提案作成のみ許可
* AIユーザーにはproduction schemaへの直接write権限を与えない
* DELETE権限は原則与えない
* migration権限はAIに与えない

完了条件

* ロール設計SQLを作成
* 権限一覧をdocsに記録
* psqlで権限確認

---

## 優先順位 3 - proposal_inbox設計

AI提案を直接本番反映せず、人間承認前の受け皿として proposal_inbox を設計する。

必要な要素

* id
* proposal_type
* title
* summary
* proposed_payload
* source_type
* source_id
* ai_model
* confidence_score
* reasoning
* status
* reviewed_by
* reviewed_at
* approved_at
* rejected_at
* rejection_reason
* created_at
* updated_at

状態候補

* pending
* approved
* rejected
* needs_review
* applied
* archived

完了条件

* CREATE TABLE SQL作成
* status制約を設計
* 人間承認フローを記録
* AIはproposal_inboxへのinsertまでに制限

---

## 優先順位 4 - source_documents設計

OCR、PDF、画像、音声、CSVなどの元データ管理テーブルを設計する。

対象

* 手書きメモ
* 作付け表
* 出荷履歴
* 音声作業メモ
* PDF
* 画像
* CSV
* Excel

必要な要素

* id
* document_type
* original_filename
* storage_uri
* mime_type
* file_hash
* captured_at
* uploaded_by
* source_note
* processing_status
* created_at
* updated_at

完了条件

* CREATE TABLE SQL作成
* MinIO保存方針とつなげる
* extracted_factsとの関係を設計

---

## 優先順位 5 - extracted_facts設計

OCRやWhisperから抽出した「事実」を保存するテーブルを設計する。

重要方針

AI推論ではなく、元資料から抽出された事実を保存する。

例

* 作業日
* 圃場名
* 品目
* 作業内容
* 数量
* 出荷先
* メモ
* 音声文字起こしの内容

必要な要素

* id
* source_document_id
* fact_type
* fact_value
* confidence_score
* extraction_method
* extracted_by
* needs_human_review
* reviewed_by
* reviewed_at
* created_at

完了条件

* CREATE TABLE SQL作成
* source_documentsとの外部キー設計
* AI推論と事実抽出を分離

---

## 優先順位 6 - knowledge_feedback設計

AI回答やRAG結果への人間フィードバックを保存するテーブルを設計する。

目的

* RAG改善
* 誤回答検知
* 農園Wiki改善
* 将来のAI朝礼品質向上

必要な要素

* id
* target_type
* target_id
* feedback_type
* rating
* comment
* created_by
* created_at

完了条件

* CREATE TABLE SQL作成
* knowledge_feedbackの利用方針をdocsに記録

---

## 優先順位 7 - バックアップ・復元テスト

Day 2では backup-postgres.sh の雛形を作成した。

Day 3では、実際にバックアップと復元テストを行う。

重要方針

バックアップが取れるだけでは不十分。

復元できて初めてバックアップ成功とみなす。

完了条件

* pg_dumpでバックアップ作成
* 復元用テストDBを作成
* pg_restoreで復元
* 復元後にテーブル確認
* 手順をdocsに記録

---

## 優先順位 8 - Node.js LTS検討

現在のNode.jsは v26.4.0。

最新版すぎるため、Next.jsや周辺ライブラリとの互換性に注意する。

Day 3では、無理に変更せず、以下を検討する。

* fnmを使うか
* nvmを使うか
* LTSへ切り替えるか
* 現状維持するか

完了条件

* 現状のNode.jsバージョンを記録
* LTS移行のメリット・デメリットを整理
* 変更する場合はDay 4以降に回す

---

## Day 3で禁止すること

* 本番DB接続
* Supabase Service Role Key配置
* 外部公開
* LAN公開
* Tailscale越し公開
* Port Forward
* AIエージェント導入
* OpenClaw導入
* Hermes Agent導入
* GitHub self-hosted runner導入
* n8n導入
* Paperless導入
* migration自動化
* main branchへの自動push
* AIへのDELETE権限付与
* AIへのproduction write権限付与

---

## Day 3完了条件

* Docker Composeの環境変数整理完了
* PostgreSQLロール設計完了
* proposal_inbox設計完了
* source_documents設計完了
* extracted_facts設計完了
* knowledge_feedback設計完了
* バックアップ・復元方針が明確
* Git commit済み
* working tree clean
* 本番DB未接続
* Service Role Key未配置
* 外部公開なし

