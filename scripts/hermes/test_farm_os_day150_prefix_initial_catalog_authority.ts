import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL,
  FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
  FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
  compileFarmOsDay150ReferenceInitialCatalogBootstrap,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
  computeFarmOsDay150InitialCatalogReviewDigest,
  createFarmOsDay150SemanticPrincipalFingerprint,
  loadFarmOsDay150ObservedTargetPrincipalBinding,
  normalizeFarmOsDay150ReferencePrincipal,
  readFarmOsDay150ObservedSemanticFingerprintEvidence,
  readFarmOsDay150TrustedEvaluationClock,
  validateFarmOsDay150ReferenceInitialCatalogBootstrap,
  validateFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
} from "../../src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority";
import {
  createFarmOsMigrationObjectFingerprint,
  type FarmOsMigrationCatalogSnapshot,
} from "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";
import { parseFarmOsDay150ReferenceCatalogRunReceiptCandidate } from
  "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import { completeFarmOsDay150AuthenticatedReferenceCatalogRun } from
  "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const historical = readFileSync("scripts/sql/day3_roles_and_proposal_inbox.sql", "utf8");
assert.equal(`sha256:${createHash("sha256").update(historical).digest("hex")}`,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.structural_source_lineage.historical_source_sha256);
assert.equal(historical.includes(FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL), true,
  "exact adopted table DDL must be a byte-exact historical structural slice");
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.structural_source_lineage
  .complete_day3_artifact_adopted, false);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.initial_objects.length, 2);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.initial_objects[1]!.base_column_count, 19);
assert.deepEqual(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.security_baseline, {
  policy: "OWNER_ONLY", explicit_application_or_user_grants: [],
  explicit_public_privileges: [], development_default_privileges: [],
});

const day146 = readFileSync("scripts/sql/day146_operational_memory_snapshot_persistence.sql", "utf8");
assert.equal(`sha256:${createHash("sha256").update(day146).digest("hex")}`,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.structural_source_lineage
    .operational_memory_preprefix.source_sha256);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.authority_id,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.historical_v11_authority_unchanged,
  true);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.structural_counts.preprefix_tables, 6);
assert.equal(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.structural_counts
  .preprefix_append_only_triggers, 6);
const planV2 = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
assert.equal(validateFarmOsDay150ReferenceInitialCatalogV2Bootstrap(planV2), true);
const planV2Sql = planV2.operations.map((operation) => operation.sql).join("\n");
const planV2StructuralSql = planV2.operations.filter((operation) =>
  operation.kind === "CREATE_PREPREFIX_STRUCTURE").map((operation) => operation.sql).join("\n");
for (const identity of ["ai.operational_memory_daily_projections",
  "ai.operational_memory_projection_state_events",
  "ai.operational_memory_projection_lineage",
  "ai.reject_operational_memory_immutable_mutation()",
  "ai.persist_operational_memory_bundle("]) assert.match(planV2Sql, new RegExp(
    identity.replace(/[().]/gu, "\\$&")));
assert.doesNotMatch(planV2StructuralSql, /\bPASSWORD\b|CREATE ROLE|GRANT\s/iu,
  "pre-prefix structural slice cannot add credentials, roles, or broad grants");
assert.equal(planV2Sql.includes("SET LOCAL ROLE farmos_day150_reference_migration_executor_v1"), true,
  "pre-prefix objects retain the authenticated executor ownership required by M4 preflight");

const plan = compileFarmOsDay150ReferenceInitialCatalogBootstrap();
assert.equal(validateFarmOsDay150ReferenceInitialCatalogBootstrap(plan), true);
const planSql = plan.operations.map((operation) => operation.sql).join("\n");
assert.equal(plan.operations[0]?.sql, "BEGIN;");
assert.equal(plan.operations.at(-1)?.sql, "COMMIT;");
assert.match(planSql, new RegExp(`CREATE ROLE ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME} NOLOGIN`));
assert.doesNotMatch(planSql, /\bLOGIN\b(?![\s\S]*NOLOGIN)|\bPASSWORD\b/iu);
assert.doesNotMatch(planSql, /change_me|farmos_app_local|farmos_ai_proposal_local/iu);
assert.doesNotMatch(planSql, /CREATE SCHEMA (?:app|knowledge)\b/iu);
assert.doesNotMatch(planSql, /day3_roles_and_proposal_inbox\.sql|day126_daily_farm_brief/iu,
  "full Day3 and isolated fixture artifacts cannot be execution inputs");
assert.match(planSql, /REVOKE ALL ON SCHEMA ai FROM PUBLIC;/u);
assert.match(planSql, /REVOKE ALL ON TABLE ai\.proposal_inbox FROM PUBLIC;/u);
assert.equal(plan.reference_role_profile.password, false);
assert.equal(plan.reference_role_profile.login, false);
assert.equal(plan.reference_role_profile.superuser, false);

for (const mutation of [
  { operations: [...plan.operations, { sequence: 6, kind: "CREATE_SCHEMA", sql: "CREATE SCHEMA app;" }] },
  { operations: [...plan.operations, { sequence: 6, kind: "CREATE_REFERENCE_ROLE",
    sql: "CREATE ROLE local LOGIN PASSWORD;" }] },
  { operations: plan.operations.map((operation) => operation.kind === "CREATE_BASE_RELATION"
    ? { ...operation, sql: operation.sql.replace("confidence numeric(4,3)", "confidence numeric(5,4)") }
    : operation) },
  { operations: plan.operations.map((operation) => operation.kind === "CREATE_BASE_RELATION"
    ? { ...operation, sql: operation.sql.replace("proposal_inbox_status_check", "status_check_changed") }
    : operation) },
  { operations: [...plan.operations, { sequence: 6, kind: "REVOKE_PUBLIC",
    sql: "GRANT SELECT ON ai.proposal_inbox TO PUBLIC;" }] },
]) {
  assert.equal(validateFarmOsDay150ReferenceInitialCatalogBootstrap({ ...plan, ...mutation }), false);
}

const alteredAuthority = structuredClone(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY);
(alteredAuthority.initial_objects[1] as unknown as { definition: string }).definition += " ";
assert.notEqual(computeFarmOsDay150InitialCatalogReviewDigest(alteredAuthority),
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.canonical_initial_state_digest,
  "structural/security changes alter the initial-state review digest");

assert.equal(normalizeFarmOsDay150ReferencePrincipal({
  raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  binding: { semantic: FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC },
}), null, "caller-supplied semantic mapping cannot forge authority");
assert.equal(loadFarmOsDay150ObservedTargetPrincipalBinding({
  target_authority_id: "unknown-target", target_identity_digest: `sha256:${"9".repeat(64)}`,
  raw_principal: "unknown_owner",
}), null, "unknown and unapproved observed owners fail closed");
assert.equal(parseFarmOsDay150ReferenceCatalogRunReceiptCandidate({
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  initial_catalog_digest: `sha256:${"0".repeat(64)}`,
}), null, "reference receipt with the wrong initial-state digest is rejected");
assert.equal(completeFarmOsDay150AuthenticatedReferenceCatalogRun({
  execution_authorization: {}, reference_capture: {}, initial_state_readback: {},
  snapshots: [],
}), null, "executor completion requires repository authorization and exact readback");

const snapshot: FarmOsMigrationCatalogSnapshot = {
  schema_version: "farmos.migration-catalog-snapshot.v1",
  migration_id: "202607260001_eligible_proposal_persistence",
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1",
  target_identity_digest: null, observed_at: null, transaction_read_only: null,
  collector_authority: null,
  catalog_query_sha256: `sha256:${"a".repeat(64)}`,
  object_universe_digest: `sha256:${"b".repeat(64)}`,
  collection_complete: true,
  objects: [{ kind: "table", identity: "ai.proposal_inbox", definition: "safe-commitment",
    attributes: {}, owner: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
    security_definer: null, proconfig: null, body_sha256: null, role_flags: null,
    memberships: [], acl: [], rls_enabled: false, rls_forced: false }],
};
const oldFingerprint = createFarmOsMigrationObjectFingerprint(snapshot);
assert.ok(oldFingerprint, "historical v1 fingerprint remains supported and unchanged");
const aclEvidence = [{ object_identity: "ai.proposal_inbox",
  principal: "farmos_core_proposal_writer", privilege: "INSERT", grant_option: false,
  grantor: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME }];
const v2 = createFarmOsDay150SemanticPrincipalFingerprint({ snapshot,
  authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: aclEvidence, object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" });
assert.ok(v2);
assert.equal(v2, createFarmOsDay150SemanticPrincipalFingerprint({ snapshot,
  authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: aclEvidence, object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }));
assert.notEqual(v2, oldFingerprint);
assert.equal(readFarmOsDay150ObservedSemanticFingerprintEvidence({
  migration_id: snapshot.migration_id, fingerprint: v2,
}), null, "caller-built observed fingerprint evidence is rejected");
assert.equal(readFarmOsDay150TrustedEvaluationClock({
  observed_at: "2026-08-13T00:00:00.000Z", server_owned_record: true,
}), null, "structural or caller-backdated clock objects are rejected");
assert.equal(FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
  "farmos.pg-catalog-semantic-principal-fingerprint.v2");
assert.equal(createFarmOsDay150SemanticPrincipalFingerprint({ snapshot,
  authenticated_raw_principal: "", acl_evidence: aclEvidence,
  object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }), null);
const unknownOwnerSnapshot: FarmOsMigrationCatalogSnapshot = {
  ...snapshot, objects: [{ ...snapshot.objects[0]!, owner: "unknown_owner" }],
};
assert.equal(createFarmOsDay150SemanticPrincipalFingerprint({ snapshot: unknownOwnerSnapshot,
  authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: aclEvidence, object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }), null,
"unknown or unapproved catalog owner cannot be fingerprinted as expected or observed authority");
assert.equal(createFarmOsDay150SemanticPrincipalFingerprint({ snapshot,
  authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: [{ ...aclEvidence[0]!, grantor: "unknown_grantor" }],
  object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }), null,
"unknown or unapproved ACL grantor is rejected");
assert.notEqual(createFarmOsDay150SemanticPrincipalFingerprint({ snapshot,
  authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: [{ ...aclEvidence[0]!, privilege: "SELECT" }],
  object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }), v2,
"ACL security or grantor evidence changes semantic fingerprint");

assert.equal(FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY.previous_execution_authorization,
  "SUPERSEDED_UNCONSUMED");
assert.equal(FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY.docker_operations, 0);
assert.equal(FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY.postgres_operations, 0);
assert.equal(FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY.migration_operations, 0);

console.log(JSON.stringify({ status: "PASS", authority:
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID, structural_objects: 2,
  base_columns: 19, adversarial_cases: 18, fingerprint_v1_preserved: true,
  semantic_fingerprint_v2: true, docker_operations: 0, postgres_operations: 0,
  migration_operations: 0, production_operations: 0 }));
