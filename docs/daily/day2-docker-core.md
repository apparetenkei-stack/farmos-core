# Day 2 - FarmOS Core Docker 基盤構築ログ

作成日: 2026-06-30

---

## 目的

Mac mini M4 16GB / SSD 256GB を、FarmOS Core の常時稼働ローカル基盤として使うため、Docker Compose による最小サービス構成を構築した。

Day 2では、本番環境には一切接続せず、ローカル検証専用の安全なDocker基盤を作ることを目的とした。

---

## Day 2で構築したサービス

Docker Composeで以下の4サービスを構築した。

* PostgreSQL 17
* Redis 8
* MinIO
* Qdrant

すべてローカル専用。

すべて 127.0.0.1 バインド。

外部公開なし。

LAN公開なし。

Tailscale越し公開なし。

---

## 作成・更新したファイル

作成または更新したファイルは以下。

* .gitignore
* .env.example
* docker-compose.yml
* docs/day1-setup.md
* scripts/backup-postgres.sh

---

## Git管理から除外したもの

.gitignore により、以下をGit管理から除外した。

* .env
* .env.*
* data/
* backups/
* *.sql
* *.dump
* *.pem
* *.key
* .DS_Store
* node_modules/
* .next/
* dist/

ただし、共有用の .env.example はGit管理対象にした。

---

## セキュリティ方針

Day 2では以下を徹底した。

* 本番DBには接続しない
* Supabase Service Role Keyを置かない
* .env や .env.local をGit管理しない
* PostgreSQLを外部公開しない
* Redisを外部公開しない
* MinIOを外部公開しない
* Qdrantを外部公開しない
* ルーターのポート開放をしない
* Tailscale越し公開をしない
* AIエージェントを導入しない
* migrationを自動実行しない
* GitHub self-hosted runnerを導入しない

---

## Docker起動確認

実行コマンド

docker compose up -d

確認コマンド

docker ps

結果

以下の4コンテナが Up 状態になった。

* farmos-postgres
* farmos-redis
* farmos-minio
* farmos-qdrant

確認時点で約11時間継続稼働していた。

---

## Dockerポート確認

docker ps で以下を確認した。

PostgreSQL

127.0.0.1:5432->5432/tcp

Redis

127.0.0.1:6379->6379/tcp

Qdrant

127.0.0.1:6333-6334->6333-6334/tcp

MinIO

127.0.0.1:9000-9001->9000-9001/tcp

すべて 127.0.0.1 バインドであり、0.0.0.0 公開はなし。

---

## PostgreSQL確認

PostgreSQLに接続できた。

実行コマンド

docker exec -it farmos-postgres psql -U farmos_local_admin -d farmos_core_local

確認SQL

SELECT version();

結果

PostgreSQL 17.10 (Debian 17.10-1.pgdg13+1) on aarch64-unknown-linux-gnu

正常にPostgreSQLが動作していることを確認した。

---

## Qdrant確認

実行コマンド

curl -H "api-key: local_dev_qdrant_api_key_change_later" http://127.0.0.1:6333/healthz

結果

healthz check passed

Qdrantの正常動作を確認した。

---

## Redis確認

Redisコンテナが Up 状態であることを確認した。

Day 2では起動確認まで完了。

---

## MinIO確認

MinIOコンテナが Up 状態であることを確認した。

ローカルConsole用ポート

127.0.0.1:9001

Day 2ではローカル起動確認まで完了。

---

## Git履歴

Day 2終了時点のGit履歴。

303b9c9 chore: initialize FarmOS Core workspace

b799d39 docs: add Day 1 setup log

60133ee chore: add local docker core services

Day 2終了時点で working tree clean を確認した。

---

## 発生した問題

### PostgreSQLがRestartingを繰り返した

症状

docker ps で farmos-postgres が Restarting 状態になった。

psql接続時に以下のエラーが出た。

Container is restarting, wait until the container is running

---

## 原因

docker compose config 実行時に、以下の警告が出ていた。

The "POSTGRES_DB" variable is not set. Defaulting to a blank string.

The "POSTGRES_USER" variable is not set. Defaulting to a blank string.

The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string.

つまり、docker-compose.yml 内の ${POSTGRES_DB} などが空文字に展開されていた。

.env.local はコンテナに環境変数を渡す用途では使われていたが、Composeファイル自体の変数展開には使われていなかった。

そのため、PostgreSQLの初期化に失敗していた。

---

## 対応

実行用の .env を作成した。

.env に以下を設定した。

POSTGRES_DB=farmos_core_local

POSTGRES_USER=farmos_local_admin

POSTGRES_PASSWORD=local_dev_postgres_password_change_later

REDIS_PASSWORD=local_dev_redis_password_change_later

MINIO_ROOT_USER=farmos_minio_admin

MINIO_ROOT_PASSWORD=local_dev_minio_password_change_later

QDRANT_API_KEY=local_dev_qdrant_api_key_change_later

その後、以下を実行した。

docker compose down

rm -rf data/postgres

docker compose config

docker compose up -d

docker ps

PostgreSQLが Restarting ではなく Up になったことを確認した。

---

## 今後の改善点

Day 2時点では、docker-compose.yml の env_file により、一部サービスへ不要な環境変数も渡っている。

Day 3で以下を改善する。

* 各サービスに必要な環境変数だけ渡す
* PostgreSQLロールを分離する
* AI用read-onlyユーザーを設計する
* proposal_inbox用ユーザーを設計する
* proposal_inbox テーブルを作成する
* source_documents テーブルを作成する
* extracted_facts テーブルを作成する
* knowledge_feedback テーブルを作成する
* バックアップだけでなく復元テストまで行う

---

## Day 2完了判定

以下をすべて満たしたため、Day 2は完了。

* Docker Compose構築完了
* PostgreSQL起動確認済み
* Redis起動確認済み
* MinIO起動確認済み
* Qdrant起動確認済み
* PostgreSQL接続確認済み
* PostgreSQL version確認済み
* Qdrant healthz確認済み
* 全ポート127.0.0.1限定
* 0.0.0.0公開なし
* 本番DB接続なし
* Service Role Key配置なし
* 外部公開なし
* Git commit済み
* working tree clean確認済み

---

## Day 3への引き継ぎ

Day 3では以下を優先する。

1. Docker Composeの環境変数整理
2. PostgreSQLロール設計
3. proposal_inbox設計
4. source_documents設計
5. extracted_facts設計
6. knowledge_feedback設計
7. PostgreSQLバックアップ・復元テスト
8. Node.js LTS移行の検討

Day 3でも本番DB接続、Service Role Key配置、外部公開、AIエージェント導入は行わない。

