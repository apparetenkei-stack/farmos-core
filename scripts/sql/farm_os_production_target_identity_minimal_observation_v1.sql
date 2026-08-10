-- Authority: farmos.production-target-identity-minimal-observation-query.v1
-- Exact-byte policy: UTF-8, no BOM, LF, trailing newline, entire-file SHA-256.
-- Execution: collector-owned single REPEATABLE READ READ ONLY transaction; rollback required.

select
  current_setting('transaction_read_only')::text as transaction_read_only,
  current_database()::text as database_logical_name,
  (current_setting('server_version_num')::integer / 10000)::integer as postgres_major,
  control.system_identifier::text as cluster_system_identifier_internal
from pg_catalog.pg_control_system() as control;
