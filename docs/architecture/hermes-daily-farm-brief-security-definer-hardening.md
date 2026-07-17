# Hermes Daily Farm Brief security-definer hardening

## Purpose

Day123 hardens Daily Brief persistence so the runtime principal can persist only through `ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)`. The runtime principal does not receive direct INSERT, UPDATE, or DELETE privileges on Daily Brief relations. This boundary does not authorize writes to farming-application business tables and does not change Proposal First or Human in the Loop.

## Owner and runtime separation

The function owner is a dedicated `NOLOGIN`, non-superuser, non-BYPASSRLS role. It receives only schema usage and the relation capabilities required by the fixed function body. The runtime role receives schema usage, read access to persisted Daily Brief records for the existing latest-read repository, and EXECUTE on the persistence function. It receives no command-receipt read or direct relation DML capability.

The hardening SQL accepts owner and runtime names only as explicit psql variables. Missing, malformed, identical, unavailable, superuser, or BYPASSRLS roles stop the script before the transaction. It does not create roles or infer principal names.

## Function boundary

The function is changed to `SECURITY DEFINER` with the exact signature and a fixed `search_path` of `pg_catalog, ai`. `public` and temporary schemas are excluded. EXECUTE is revoked from PUBLIC and granted only to the reviewed runtime role. The function contains no caller-selected relation, schema, identifier interpolation, or dynamic SQL.

The Day114 function continues to enforce idempotency, source-execution uniqueness, canonical version transition, expected-version matching, and transaction rollback. Malformed commands remain rejected by the server command parser before repository execution.

## Review and application gates

[`day123_hermes_daily_farm_brief_security_definer_hardening.sql`](../../scripts/sql/day123_hermes_daily_farm_brief_security_definer_hardening.sql) is review-only in Day123. Production ALTER, GRANT, and REVOKE are not run automatically. Manual application requires a separate approval after the safe preflight confirms eligible owner/runtime candidates and the exact function and relations.

After manual privilege application, the rollback-only readiness diagnostic must report the definer mode, fixed search path, absent PUBLIC EXECUTE, present runtime EXECUTE, absent runtime direct DML, safe owner role and capabilities, compatible canonical state, and verified rollback. Actual Daily Brief persistence is a further, separate approval gate.

## Catalog-owned candidate resolution

The production preflight does not accept owner or runtime role names from environment, CLI, HTTP, or other caller input. In one server-side read-only transaction it resolves the function owner, both relation owners, and `current_user` from PostgreSQL catalogs and then rolls back. Raw role names remain in an in-process opaque token backed by a `WeakMap`; safe output contains only resolved, eligible, principal-match, and ownership-alignment booleans.

The candidate token is bound to the repository-bundle instance and contains the pre-change catalog fingerprint and rollback evidence. A forged token, token from another bundle, caller role override, missing confirmation, or changed catalog fingerprint is rejected before an apply transaction.

The reviewed administrator executor uses a separate server-only connection configuration. It never reuses the normal runtime credential and accepts no caller-provided role, SQL, schema, function, or relation. The configured target must exactly match the validated runtime target internally. Its rollback-only preflight confirms that the administrator principal is a non-superuser, non-BYPASSRLS member of the existing safe owner role and that the current catalog fingerprint still matches the opaque token. Safe output contains booleans only.

The administrator configuration uses only `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_ENABLED`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD`, `HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_SSL_MODE`, and the corresponding `CONNECT_TIMEOUT_MS`, `STATEMENT_TIMEOUT_MS`, and `LOCK_TIMEOUT_MS` settings. Values are never included in safe output. Missing, malformed, disabled, or target-mismatched configuration selects the deny-by-default adapter.

The apply transaction is limited to the exact Daily Brief function, schema, and two relations. It keeps the existing owner, sets `SECURITY DEFINER` and the fixed search path, removes PUBLIC EXECUTE, grants runtime EXECUTE, preserves runtime schema usage and records read access, and removes direct runtime DML. It then validates the complete post-state before commit; fingerprint drift, post-state mismatch, or transaction failure rolls back. The executor has one-transaction, zero-retry semantics and remains default-disabled behind the exact CLI, environment, confirmation, candidate, administrator, and repository-identity gates. Production privilege application and actual Daily Brief persistence are separate human approvals and were not performed in Day123.

## Isolated PostgreSQL evidence

The Day123 isolated test uses only `farmos_core_day114_test`. Test-only owner/runtime roles have no credential and no production name. It verifies catalog state, function insert, idempotent replay, conflict rejection, injected rollback, denied direct INSERT and UPDATE, absent DELETE privilege, and authenticated latest read. It runs two independent scenarios without DELETE, TRUNCATE, reset, migration, or production access.

## Rollback plan

Rollback is manual and must use pre-application evidence; current state must not be guessed.

1. Record safe classifications for the prior function owner, security mode, search-path presence, PUBLIC EXECUTE state, named runtime EXECUTE state, and relation privilege state. Do not record raw principal or connection values in review output.
2. Prepare a reviewed inverse transaction that restores the recorded owner, security mode, function configuration, PUBLIC/named EXECUTE ACLs, and relation ACLs.
3. Run the inverse transaction only under a separately approved production change window.
4. Run the rollback-only readiness diagnostic and authenticated read regression.
5. Do not use DROP, DELETE, TRUNCATE, RLS changes, or automatic rollback execution.

Day123 creates no production privilege change and performs no actual Daily Brief persistence.
