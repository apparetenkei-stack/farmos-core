# Production Identity Query Authority v2 Amendment Review

## Decision boundary

```yaml
status: ADOPTED_REPOSITORY_AUTHORITY
production_connection: 0
credential_resolution: 0
collector_execution: 0
database_read: 0
database_write: 0
authority_adoption: farmos.production-target-identity-query.v2
stage: 0
commit: 0
push: 0
```

This document records the reviewed versioned query-authority amendment and its
Repository Authority Adoption. It does not change the runtime-bound authority in
`src/lib/hermes/farm_os_stable_changes_migration_reconciliation.ts`.

## Candidate authority proposal

```yaml
query_authority_id: farmos.production-target-identity-query.v2
purpose: production_target_identity_collection
target_identity_contract_version: farmos.production-target-live-evidence.v1
status: adopted
artifact: scripts/sql/farm_os_production_identity_readonly_v2.sql
computed_query_sha256: sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95
supersedes: farmos.production-target-identity-query.v1
review_status: approved
approval_review_reference: review/production-identity-query-authority-v2/sol-go
runtime_binding_status: NOT_RUNTIME_BOUND
```

The previous rejected candidate digest
`sha256:9d0f2cc06474fb30a20be879001ac12a0d0e710927e870eaac611e0ff117dc1f`
and the first remediation-review digest
`sha256:e4b525a0e24a719f222536c8bf10f165f68b75ffeb2321a735119bfbd00fdc90`
and the second remediation-review digest
`sha256:cab18bb51b0abc6fe4face62c2adf00140c0a9ba9cbcf184d80465a799fcd68f`
are retained only as review-history facts. None is reused as authority.

## Exact bytes and transaction ownership

The authority input is the complete file byte sequence: UTF-8 without BOM, LF
only, one trailing LF, whitespace/comments significant, and no semantic
normalization. Any byte change requires a new digest and review.

The future collector owns the transaction:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
ROLLBACK;
```

The candidate artifact contains eleven fixed `SELECT` or `WITH ... SELECT`
statements. It contains no transaction command, mutation, role change, dynamic
SQL, external copy, network call, or caller substitution.

## Exact result plan

The sections, result-set order, and row schema are fixed:

1. `A_TRANSACTION_SERVER_GATE`
2. `B_CLUSTER_IDENTITY_SOURCE`
3. `C_SCHEMA_IDENTITY`
4. `D_OPERATOR_AUTHORITY`
5. `E_INSTALLATION_FARM_BINDING_AVAILABILITY`
6. `F_ACL_PRINCIPAL_INVENTORY`
7. `G_MIGRATION_CATALOG_INVENTORY`
8. `H1_MIGRATION_HISTORY_EXISTENCE`
9. `H2_MIGRATION_HISTORY_ROWS_IF_PRESENT`
10. `I_ACTIVITY_LOCK_AGGREGATES`
11. `J_DATABASE_SIZE`

Every raw row has exactly `section_id`, `row_key`, `payload`, and
`sanitization_class`. The parser rejects unknown keys, wrong scalar types,
unsafe/non-finite integers, duplicate keys, missing/extra section result sets,
and rows not in bytewise `COLLATE "C"` order.

Section A requires exactly one `server` row. `transaction_read_only` must be
the literal `on`; server version must be an integer from 140000 through 999999;
database and operator identifiers are non-empty bounded strings; recovery is a
boolean. A failed read-only gate invalidates the complete result.

Section C requires exactly `ai` then `core_schema`. Section E requires exactly
`farm_scope` then `installation_id`. Unavailable bindings are represented by
`available=false` and an empty `catalog_sources` array; they are not silently
omitted or inferred.

## Completeness proofs

Section F has exactly one `__collection_status__` proof row containing:

- `inventory_complete=true`;
- an exact query-universe identifier;
- `row_count` equal to the actual ACL/role inventory row count.

The exact SQL always emits one placeholder row for each of eight scoped roles,
so F can never validate as zero-row inventory. The parser requires all eight
role identities, binds every row key to its payload identity/grant tuple, and
rejects a status-only or self-consistent spoofed inventory.

Section G's proof row binds the five migrations, all ten covered object
classes, `rls_policy_inventory_complete=true`, and an exact actual row count.
The parser requires exact placeholder coverage for all 20 relation scopes, 21
function scopes, and 8 role scopes. Derived column, constraint, index, trigger,
membership, and policy rows remain catalog-observed. Every relation scope must
have exactly one matching RLS-policy-inventory proof.

Section H uses two fixed result contracts. H1 reads relation existence. If the
history relation is absent, the collector does not execute the relation-reading
H2 SQL statement and supplies an exact `not_applicable` proof with zero rows.
If present, H2 is mandatory and its proof includes five queried targets and an
exact returned-row count. A present H1 with missing/not-applicable H2 is
invalid. History absence never means `NOT_APPLIED`.

Activity counts and database bytes must be safe integers greater than or equal
to zero. Counts are capped at one billion. Database bytes are capped at
JavaScript's safe-integer maximum. Numeric string coercion is forbidden.

## Sensitive catalog text policy

Catalog-derived arbitrary text is never a safe structural field. The raw
candidate result may contain it only under `raw_sensitive_texts` with
`INTERNAL_RAW_NEVER_PERSIST`:

- column default expressions;
- function definitions and `proconfig`;
- constraint and index definitions;
- trigger definitions;
- RLS policy `qual` and `with_check` expressions.

The pure candidate transformer canonicalizes each value, computes SHA-256, and
replaces the raw object with exact `*_digest` fields. Raw source values are not
copied to the transformed evidence. The final sanitized contract rejects raw
catalog keys, credential/connection keys, raw cluster identifiers, and business
record identifiers. Function owner, signature, SECURITY DEFINER state and
digest fields remain available for structural comparison without persisting a
body or configuration literal.

## Cluster identity

`pg_control_system().system_identifier` is returned only by the internal B
result as `raw_cluster_identifier` with
`INTERNAL_RAW_NEVER_PERSIST`. The transformer immediately replaces it with
`cluster_system_identifier_digest`. The final evidence type has no raw cluster
field. Permission failure remains `INSUFFICIENT_IDENTITY_EVIDENCE`; there is no
database-name fallback.

## RLS policy inventory

For every migration-scoped relation, G returns one
`rls_policy_inventory` row containing table RLS flags, exact policy count, and
`inventory_complete=true`. All matching `pg_policy` entries are returned as
`rls_policy` rows with:

- stable schema/table/policy identity;
- command and permissive flag;
- bytewise-ordered roles;
- internal-only raw `qual` and `with_check`, transformed to digests.

The parser verifies that each table has exactly one inventory row and that its
declared count equals the policy rows for that migration/relation. RLS enabled
with zero policies is valid only through this explicit zero-policy proof. A
missing inventory or partial policy set is invalid. Policy identity must equal
`relation_identity.policy_name`, a policy cannot attach to an absent table, and
role-membership rows must touch an exact migration-scoped role. The SQL resolves
each catalog membership before deriving distinct scoped migration IDs, so member
and granted-role matches within one migration emit one row, not two. The positive
fixture includes the three Day147 memberships in catalog direction:
`proposal_transaction` (member) to each granted writer role.

## ACL object-type semantics

Null ACL expansion uses explicit PostgreSQL object defaults:

- schema: `acldefault('n', owner)`;
- table-like relations: `acldefault('r', owner)`;
- sequence: `acldefault('s', owner)`;
- function: `acldefault('f', owner)`.

The SQL returns both `relation_kind` and `acl_default_class`. The candidate
parser independently maps `relkind` to the required class and rejects sequence
rows marked as table defaults. Unknown relation kinds fail closed. Grant option
and grantor remain exact structural evidence.

## Sanitization classes

The labels are enforced behavior, not advisory metadata:

- `SAFE_STRUCTURAL`: exact allowlisted structural fields only;
- `AGGREGATE_ONLY`: bounded numeric/boolean aggregates only;
- `INTERNAL_RAW_NEVER_PERSIST`: accepted only at the raw transform boundary;
- `DIGEST_ONLY`: emitted only by the transformer after raw removal.

No `INTERNAL_RAW_NEVER_PERSIST` row can appear in the final transformed type.

## Activity and capacity separation

Activity/lock evidence is aggregate-only and scoped to the current database.
The SQL marks collection `incomplete` unless the operator is superuser or a
member of `pg_monitor`/`pg_read_all_stats`; the parser requires the visibility
flag to be true. Redacted activity state can therefore never become complete.
No session SQL, PID, application name, client address, or per-session row is
returned. Database capacity is limited to
`pg_database_size(current_database())`. Provider quota, free capacity, WAL
headroom, and provider APIs remain outside this authority, so
`BLOCKED_PROVIDER_CAPACITY_DESIGN` is unchanged.

## Test authority boundary

The candidate test verifies exact bytes/digest, SELECT-only statements, fixed
sections and order, forbidden mutation/network/business reads, ACL-default
mapping, `pg_policy` coverage, raw-text isolation, and the UTF-8/BOM/LF policy.

The complete fixture is registry-derived from 20 relation, 21 function, and 8
role scopes, and includes the three existing Day147 transaction-member-to-writer
role memberships exactly once each. Twenty-five negative fixtures cover missing/wrong A, read-only off,
missing C rows, E/F/G status-only evidence, missing sentinels/object classes,
H1/H2 mismatch, duplicate/unknown/out-of-order rows, negative/unsafe numbers,
activity visibility denial, missing policy inventory, partial/orphan/spoofed
RLS policies, orphan role membership, F role/row-key spoofing, and sequence
misclassification. Final transformed evidence is independently revalidated
against every section's exact raw contract, not merely a forbidden-key scan.
Credential-like default, proconfig, function, constraint, index, trigger, and
policy text plus the raw cluster identifier are asserted absent from final
evidence while their digests remain present.

Fixtures are parser/test authority only. They are not promoted to an expected
production catalog fingerprint. `PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED`
therefore remains a separate blocker.

## v1 disposition and runtime-adoption gate

v1 remains the unchanged active runtime constant and is classified for audit as
`LEGACY_UNMATERIALIZED_AUTHORITY`; its tracked preimage remains unavailable.
The immutable v1-to-v2 Repository authority supersession relationship is
recorded separately from runtime binding. v2 is `ADOPTED` and `APPROVED`, while
its runtime status is `NOT_RUNTIME_BOUND`. Therefore `V2_ADOPTED` does not imply
`RUNTIME_BOUND_TO_V2`.

Runtime adoption is a separate future approval gate. This adoption does not
authorize collector implementation or execution, target-manifest approval,
connection or credential authority, execution-approval lineage, production
access, migration or history writes, role/grant changes, deploy, stage, commit,
or push. `PRODUCTION_TARGET_MANIFEST_REQUIRED`, `BLOCKED_CONNECTION_AUTHORITY`,
`BLOCKED_PROVIDER_CAPACITY_DESIGN`, and
`PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED` remain unresolved.
