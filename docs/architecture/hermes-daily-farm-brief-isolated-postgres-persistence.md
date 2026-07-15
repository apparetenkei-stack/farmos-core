# Hermes Daily Farm Brief isolated PostgreSQL persistence vertical slice

> Day115 does not reuse this isolated target as production. `farmos_core_day114_test` is explicitly classified and rejected by the production repository factory; the Day114 adapter and database behavior are unchanged.

Day114 completes the first write/read vertical slice in the dedicated Docker PostgreSQL database `farmos_core_day114_test`. FarmOS Core owns both `ai.daily_farm_brief_records` and `ai.daily_farm_brief_persistence_commands`; no Daily Brief is stored in the farming application, Sales, or Brand schemas.

The target classifier accepts only the exact isolated database name before starting `psql`. Each connection also checks `current_database()`. The verified server path is the local container Unix socket; credentials and connection strings are never printed. The known preimplementation local-development credential exposure is recorded separately and no new implementation exposure occurred.

The transactional migration creates the two tables, strict projectable/generation-state checks, positive version checks, `(record_id, version)` primary key, unique idempotency and source-execution receipts, and a partial unique canonical index on `(record_kind, business_date)`. It adds an atomic command function. The migration was first evaluated with its final commit replaced by rollback, leaving no Day114 objects, then applied to the isolated DB and rerun idempotently. It was not applied to production.

Writes use one `psql` process and connection per repository call with READ COMMITTED, a three-second lock timeout, `pg_advisory_xact_lock` over record kind/business date/logical record ID, DB unique constraints, zero retry, and the Day113 command parser/server clock. Transaction order is lock, receipt checks, chain/current-version validation, supersede, insert canonical, insert receipt, commit. Injected failure after supersede rolls back records and receipts.

Reads use one read-only transaction, verify `transaction_read_only`, select explicit columns only, cap at 500 rows, exclude future generated records, construct only Day112 DTO fields, and return no raw row/client. The PostgreSQL records feed the unchanged Day112 selector and Day111 service; current and previous-date stale behavior are verified.

Production adapters remain deny-by-default. No production migration/write, production RLS/role, Supabase, farming-application write, scheduler, Queue/Worker, LLM, notification, Proposal, Audit, or UI change is included.

Rollback is migration-transaction rollback before application and repository transaction rollback per operation. Destructive schema rollback after any future production application requires a separate Day115-or-later approval gate; no down migration, DROP, TRUNCATE, or DELETE is provided.

Day115 begins production-readiness, authentication/provider, and farming-application Proxy evaluation. Production RLS/roles, retention, backup, migration approval, and write readiness remain explicit gates.
