import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_AI_SCHEMA_ACL_ALLOWLIST_CANDIDATES,
  FARM_OS_AI_SCHEMA_ACL_QUERY_SHA256,
  FARM_OS_AI_SCHEMA_ACL_UNIVERSE_SHA256,
  FARM_OS_HISTORY_BRIDGE_POLICY,
  FARM_OS_MIGRATION_AUTHORITY_MODEL,
  FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION,
  FARM_OS_MIGRATION_CAPABILITY_PRINCIPAL_POLICY,
  FARM_OS_MIGRATION_HISTORY_QUERY_SHA256,
  FARM_OS_MIGRATION_TIMEOUT_POLICY,
  FARM_OS_MIGRATION_TRANSACTION_OWNERSHIP,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_RECONCILIATION_SAFETY_BOUNDARY,
  FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY,
  authorizeFarmOsMigrationApply,
  classifyFarmOsMigrationReconciliation,
  compareFarmOsProductionTargetIdentity,
  createFarmOsAiSchemaAclPolicyDigest,
  createFarmOsMigrationCommitReceiptDigest,
  createFarmOsMigrationObjectFingerprint,
  createFarmOsProductionTargetIdentityDigest,
  deriveFarmOsStableChangesMigrationRegistry,
  evaluateFarmOsAiSchemaAcl,
  evaluateFarmOsMaintenanceEvidence,
  evaluateFarmOsProviderCapacity,
  parseFarmOsMigrationReconciliationProvenance,
  planFarmOsMigrationApplyDryRun,
  planFarmOsMigrationHistoryCas,
  reconcileFarmOsUnknownApplyOutcome,
  transitionFarmOsApplyState,
  validateFarmOsMigrationObjectsHistoryIndependently,
  validateFarmOsMigrationCommitReceipt,
  type FarmOsMigrationCatalogObject,
  type FarmOsMigrationCatalogSnapshot,
} from "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";
import type { FarmOsStoredMigration } from "../../src/lib/hermes/farm_os_core_db_migration_manifest";

const D = `sha256:${"a".repeat(64)}` as const;
const D2 = `sha256:${"b".repeat(64)}` as const;
const D3 = `sha256:${"c".repeat(64)}` as const;
const NOW = "2026-08-08T00:00:00.000Z";
const LATER = "2026-08-08T00:00:30.000Z";
const MIGRATION_ID = "202608070001_stable_changes_consumer_persistence";
const QUERY_DIGEST = D3;
const executedRemediationFixtures = new Set<string>();
const fixture = (name: string, run: () => void): void => {
  run();
  assert.equal(executedRemediationFixtures.has(name), false, `duplicate fixture: ${name}`);
  executedRemediationFixtures.add(name);
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const sha = (value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;

const identity = {
  schema_version: FARM_OS_PRODUCTION_TARGET_IDENTITY_SCHEMA_VERSION,
  environment_id: "apparetenkei-production-primary",
  environment_class: "production",
  database_logical_name: "farmos_core_primary",
  provider_class: "managed_postgres",
  provider_resource_fingerprint: D,
  cluster_system_identifier_digest: D2,
  expected_postgres_major: 17,
  installation_id: "apparetenkei-farmos-core-mac-01",
  farm_scope: "apparetenkei-primary-farm",
  expected_operator_class: "stable-changes-migration-executor",
  manifest_version: "farmos.core-db-provisioning-manifest.v1",
  created_at: NOW,
  approved_by_reference: "approval/production-target/1",
} as const;
const targetDigest = createFarmOsProductionTargetIdentityDigest(identity);
assert.ok(targetDigest);
const live = {
  schema_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  environment_id: identity.environment_id,
  environment_class: identity.environment_class,
  database_name: identity.database_logical_name,
  provider_resource_fingerprint: identity.provider_resource_fingerprint,
  cluster_identifier_digest: identity.cluster_system_identifier_digest,
  server_version_num: 170010,
  installation_id: identity.installation_id,
  farm_scope: identity.farm_scope,
  operator_class: identity.expected_operator_class,
  manifest_version: identity.manifest_version,
  schema_existence: { ai: true, core_schema: true },
  transaction_read_only: true,
  collector_authority: "farmos.production-readonly-identity-collector.v1",
  query_authority_id: FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.query_authority_id,
  collector_query_sha256: FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.expected_query_sha256,
  observed_at: NOW,
  secret_exposed: false,
} as const;
const identityInput = { manifest: identity, evidence: live, evaluated_at: LATER, maximum_age_ms: 60_000 };
fixture("identity exact repository query authority", () =>
  assert.equal(compareFarmOsProductionTargetIdentity(identityInput).result, "MATCH"));
fixture("identity different digest same format", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, collector_query_sha256: D } }).result, "INSUFFICIENT_EVIDENCE"));
fixture("identity caller self-declared expected digest", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, collector_query_sha256: D, expected_query_sha256: D } }).result, "INSUFFICIENT_EVIDENCE"));
fixture("identity unknown collector authority", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, collector_authority: "caller.identity-collector.v1" } }).result, "INSUFFICIENT_EVIDENCE"));
const missingIdentityQueryDigest = Object.fromEntries(Object.entries(live).filter(([key]) => key !== "collector_query_sha256"));
fixture("identity missing query digest", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: missingIdentityQueryDigest }).result, "INSUFFICIENT_EVIDENCE"));
fixture("identity deprecated query authority", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, query_authority_id: "farmos.production-target-identity-query.v0" } }).result, "INSUFFICIENT_EVIDENCE"));
fixture("identity wrong-purpose query authority", () =>
  assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, query_authority_id: "farmos.ai-schema-acl-query.v1", collector_query_sha256: FARM_OS_AI_SCHEMA_ACL_QUERY_SHA256 } }).result, "INSUFFICIENT_EVIDENCE"));
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, environment_id: null } }).result, "INSUFFICIENT_EVIDENCE");
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, cluster_identifier_digest: D } }).result, "MISMATCH");
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evidence: { ...live, provider_resource_fingerprint: D2 } }).result, "MISMATCH");
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, evaluated_at: "2026-08-08T00:02:00.000Z" }).result, "INSUFFICIENT_EVIDENCE");
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, manifest: { ...identity, unexpected: true } }).result, "INVALID_MANIFEST");
assert.equal(compareFarmOsProductionTargetIdentity({ ...identityInput, manifest: { ...identity, environment_class: "staging" }, evidence: { ...live, environment_class: "staging" } }).result, "INVALID_MANIFEST");
assert.equal(createFarmOsProductionTargetIdentityDigest({ ...identity, environment_id: 7 }), null);

const manifestRaw = JSON.parse(readFileSync("db/provisioning/manifest.json", "utf8")) as unknown;
const registry = deriveFarmOsStableChangesMigrationRegistry(manifestRaw);
assert.ok(registry);
assert.equal(registry.length, 5);
assert.equal(registry.filter((entry) => entry.role === "prefix").length, 4);
assert.equal(registry.at(-1)?.migration_id, MIGRATION_ID);
const badManifest = structuredClone(manifestRaw) as { migrations: Array<{ checksum: string }> };
badManifest.migrations[0]!.checksum = D;
assert.equal(deriveFarmOsStableChangesMigrationRegistry(badManifest), null);

const catalogObject = (input: Partial<FarmOsMigrationCatalogObject> & Pick<FarmOsMigrationCatalogObject, "kind" | "identity">): FarmOsMigrationCatalogObject => ({
  kind: input.kind,
  identity: input.identity,
  definition: input.definition ?? "definition",
  attributes: input.attributes ?? {},
  owner: input.owner ?? "farmos_owner_local",
  security_definer: input.security_definer ?? null,
  proconfig: input.proconfig ?? null,
  body_sha256: input.body_sha256 ?? null,
  role_flags: input.role_flags ?? null,
  memberships: input.memberships ?? [],
  acl: input.acl ?? [],
  rls_enabled: input.rls_enabled ?? null,
  rls_forced: input.rls_forced ?? null,
});
const universe = (objects: readonly FarmOsMigrationCatalogObject[]) =>
  sha(objects.map((object) => `${object.kind}:${object.identity}`).sort());
const snapshot = (migrationId: string, objects: readonly FarmOsMigrationCatalogObject[], observed: boolean): FarmOsMigrationCatalogSnapshot => ({
  schema_version: FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION,
  migration_id: migrationId,
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1",
  target_identity_digest: observed ? targetDigest : null,
  observed_at: observed ? NOW : null,
  transaction_read_only: observed ? true : null,
  collector_authority: observed ? "farmos.production-readonly-catalog-collector.v1" : null,
  catalog_query_sha256: QUERY_DIGEST,
  object_universe_digest: universe(objects),
  collection_complete: true,
  objects,
});
const migrationObjects = (migrationId: string): readonly FarmOsMigrationCatalogObject[] => [
  catalogObject({ kind: "schema", identity: `ai.${migrationId}`, definition: `schema-marker:${migrationId}` }),
  catalogObject({ kind: "table", identity: `ai.object_${migrationId}`, definition: `table:${migrationId}`, rls_enabled: false, rls_forced: false }),
  catalogObject({ kind: "function", identity: `ai.verify_${migrationId}()`, definition: `function:${migrationId}`, security_definer: true, proconfig: ["search_path=pg_catalog"], body_sha256: sha(migrationId) }),
];
const entry = registry.at(-1)!;
const objects = migrationObjects(entry.migration_id);
const expected = snapshot(entry.migration_id, objects, false);
const observed = snapshot(entry.migration_id, [...objects].reverse(), true);
const expectedFingerprint = createFarmOsMigrationObjectFingerprint(expected);
assert.ok(expectedFingerprint);
assert.equal(expectedFingerprint, createFarmOsMigrationObjectFingerprint(observed));
for (const [name, value] of [["NaN", Number.NaN], ["Infinity", Number.POSITIVE_INFINITY], ["-Infinity", Number.NEGATIVE_INFINITY]] as const) {
  fixture(`catalog non-finite ${name} rejected`, () =>
    assert.equal(createFarmOsMigrationObjectFingerprint({ ...expected, objects: [{ ...objects[0]!, attributes: { value } }] }), null));
}
const nullAttributeFingerprint = createFarmOsMigrationObjectFingerprint({ ...expected, objects: [{ ...objects[0]!, attributes: { value: null } }] });
const zeroAttributeFingerprint = createFarmOsMigrationObjectFingerprint({ ...expected, objects: [{ ...objects[0]!, attributes: { value: 0 } }] });
fixture("catalog null remains distinct", () => {
  assert.ok(nullAttributeFingerprint);
  assert.ok(zeroAttributeFingerprint);
  assert.notEqual(nullAttributeFingerprint, zeroAttributeFingerprint);
});
const authority = {
  schema_version: "farmos.expected-catalog-fingerprint-authority.v1",
  migration_id: entry.migration_id,
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1",
  expected_fingerprint: expectedFingerprint,
  artifact_sha256: entry.apply_sha256,
  catalog_query_sha256: QUERY_DIGEST,
  object_universe_digest: universe(objects),
  expected_object_count: objects.length,
  git_authority: entry.git_authority,
  approval_reference: "approval/catalog-fingerprint/1",
  approved_at: NOW,
} as const;
const validate = (actual: unknown, expectedAuthority: unknown = authority) => validateFarmOsMigrationObjectsHistoryIndependently({
  expected, observed: actual, registry_entry: entry, expected_authority: expectedAuthority,
  target_identity_digest: targetDigest, evaluated_at: LATER, maximum_age_ms: 60_000,
});
const exactObjects = validate(observed);
assert.equal(exactObjects.result, "EXACT");
assert.equal(exactObjects.observed_evidence_validated, true);
assert.equal(validate({ ...observed, collection_complete: false }).result, "UNKNOWN");
assert.equal(validate({ ...observed, collector_authority: "caller/asserted-collector" }).result, "UNKNOWN");
assert.equal(validate({ ...observed, objects: [], object_universe_digest: universe(objects), collection_complete: false }).result, "UNKNOWN");
assert.equal(validate({ ...observed, target_identity_digest: D }).result, "UNKNOWN");
assert.equal(validate(observed, { ...authority, artifact_sha256: D }).result, "UNKNOWN");
assert.equal(validate({ ...observed, objects: [], object_universe_digest: universe(objects) }).result, "ABSENT");
assert.equal(validate({ ...observed, objects: objects.slice(0, 2) }).result, "PARTIAL");
assert.equal(validate({ ...observed, objects: [{ ...objects[0]!, definition: "conflict" }] }).result, "CONFLICT");
for (const migration of registry) {
  const required = migrationObjects(migration.migration_id);
  const expectedForMigration = snapshot(migration.migration_id, required, false);
  const fingerprint = createFarmOsMigrationObjectFingerprint(expectedForMigration)!;
  const result = validateFarmOsMigrationObjectsHistoryIndependently({
    expected: expectedForMigration,
    observed: snapshot(migration.migration_id, required, true),
    registry_entry: migration,
    target_identity_digest: targetDigest,
    evaluated_at: LATER,
    maximum_age_ms: 60_000,
    expected_authority: { ...authority, migration_id: migration.migration_id, expected_fingerprint: fingerprint, artifact_sha256: migration.apply_sha256, object_universe_digest: universe(required), expected_object_count: required.length, git_authority: migration.git_authority },
  });
  assert.equal(result.result, "EXACT", `${migration.migration_id} unique object universe`);
}

const expectedHistory: FarmOsStoredMigration = { migration_id: MIGRATION_ID, sequence: 202608070001, checksum: entry.apply_sha256 };
const commitReceiptPayload = {
  receipt_schema_version: "farmos.migration-commit-receipt.v1",
  receipt_id: "receipt/stable-changes/1",
  issuer_authority: "farmos.production-migration-executor-receipt-issuer.v1",
  target_identity_digest: targetDigest,
  migration_id: MIGRATION_ID,
  artifact_sha256: entry.apply_sha256,
  commit_outcome: "committed",
  committed_at: "2026-08-07T23:59:50.000Z",
  observed_at: "2026-08-07T23:59:55.000Z",
  executor_run_id: "executor-run/stable-changes/1",
  transaction_identity_digest: D3,
  issuer_signature: "aCHTwbrk/QdXTqWJqvZrLE/zuKHrNdwLyCmffAIbzRQ4IkxQita4fYXXZ6+WIbP5N77OXXZ8QCWubMX5UchKAw==",
} as const;
const validCommitReceipt = {
  ...commitReceiptPayload,
  receipt_digest: createFarmOsMigrationCommitReceiptDigest(commitReceiptPayload),
} as const;
const receiptWith = (overrides: Record<string, unknown>): unknown => {
  const payload = { ...commitReceiptPayload, ...overrides };
  return {
    ...payload,
    receipt_digest: createFarmOsMigrationCommitReceiptDigest(
      payload as Parameters<typeof createFarmOsMigrationCommitReceiptDigest>[0],
    ),
  };
};
const reconciliationBase = {
  object_result: "EXACT" as const,
  history: null,
  expected_history: expectedHistory,
  apply_commit_receipt: null,
  target_identity_digest: targetDigest,
  object_observed_at: NOW,
  evaluated_at: LATER,
};
fixture("trusted exact commit receipt", () => {
  assert.equal(validateFarmOsMigrationCommitReceipt({ receipt: validCommitReceipt, target_identity_digest: targetDigest, migration_id: MIGRATION_ID, artifact_sha256: entry.apply_sha256, catalog_observed_at: NOW, evaluated_at: LATER }).result, "VALID");
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: validCommitReceipt }).classification, "APPLIED_HISTORY_MISSING");
});
fixture("digest-shaped receipt alone not proven", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: D }).classification, "VERIFIED_EXISTING_STATE"));
fixture("unknown receipt issuer rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ issuer_authority: "caller.trusted.v1" }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("known issuer self-claim without valid signature rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ issuer_signature: `${"A".repeat(86)}==` }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("wrong receipt target rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ target_identity_digest: D }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("wrong receipt migration rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ migration_id: "202608070002_other_migration" }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("wrong receipt artifact rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ artifact_sha256: D }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("tampered receipt payload rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: { ...validCommitReceipt, executor_run_id: "executor-run/tampered" } }).classification, "VERIFIED_EXISTING_STATE"));
fixture("wrong receipt digest rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: { ...validCommitReceipt, receipt_digest: D } }).classification, "VERIFIED_EXISTING_STATE"));
fixture("future receipt committed_at rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ committed_at: "2026-08-08T00:01:00.000Z" }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("invalid receipt temporal ordering rejected", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ committed_at: NOW, observed_at: "2026-08-07T23:59:59.000Z" }) }).classification, "VERIFIED_EXISTING_STATE"));
fixture("non-committed outcome not proven", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: receiptWith({ commit_outcome: "rolled_back" }) }).classification, "VERIFIED_EXISTING_STATE"));
const callerBooleanClaim = { ...reconciliationBase, apply_commit_proven: true } as unknown as Parameters<typeof classifyFarmOsMigrationReconciliation>[0];
fixture("caller apply_commit_proven boolean ignored", () =>
  assert.equal(classifyFarmOsMigrationReconciliation(callerBooleanClaim).classification, "VERIFIED_EXISTING_STATE"));
fixture("exact object invalid receipt remains verified existing", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, apply_commit_receipt: { receipt_digest: D } }).classification, "VERIFIED_EXISTING_STATE"));
assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, object_result: "ABSENT" }).classification, "NOT_APPLIED");
fixture("valid receipt conflicts with absent objects", () =>
  assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, object_result: "ABSENT", apply_commit_receipt: validCommitReceipt }).classification, "INCONSISTENT"));
assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, history: expectedHistory }).classification, "APPLIED_AND_RECORDED");
assert.equal(classifyFarmOsMigrationReconciliation({ ...reconciliationBase, object_result: "ABSENT", history: expectedHistory }).classification, "INCONSISTENT");

const provenance = {
  schema_version: "farmos.migration-reconciliation-provenance.v1",
  reconciliation_id: "reconciliation/1", migration_id: MIGRATION_ID, target_identity_digest: targetDigest,
  artifact_sha256: entry.apply_sha256, object_fingerprint: expectedFingerprint,
  classification: "VERIFIED_EXISTING_STATE", evidence_sources: ["evidence/catalog/1"], observed_at: NOW,
  historical_apply_provenance: "unknown", historical_applied_at: null, historical_applied_by: null,
  historical_commit_receipt: null, adopted_at: LATER, adopted_by_reference: "operator/reconciliation",
  approval_reference: "approval/reconciliation/1", approved_at: "2026-08-08T00:00:15.000Z",
} as const;
assert.deepEqual(parseFarmOsMigrationReconciliationProvenance(provenance), provenance);
assert.equal(parseFarmOsMigrationReconciliationProvenance({ ...provenance, historical_apply_provenance: "known", historical_applied_at: NOW, historical_applied_by: "operator/x", historical_commit_receipt: { receipt_digest: D } }), null);
const knownProvenance = { ...provenance, classification: "APPLIED_HISTORY_MISSING", historical_apply_provenance: "known", historical_applied_at: validCommitReceipt.committed_at, historical_applied_by: validCommitReceipt.executor_run_id, historical_commit_receipt: validCommitReceipt } as const;
assert.deepEqual(parseFarmOsMigrationReconciliationProvenance(knownProvenance), knownProvenance);
assert.equal(parseFarmOsMigrationReconciliationProvenance({ ...knownProvenance, historical_applied_at: "2026-08-08T00:01:00.000Z" }), null);
assert.equal(FARM_OS_HISTORY_BRIDGE_POLICY.migration_history_semantics, "known_apply_only");
assert.equal(planFarmOsMigrationHistoryCas({ existing: null, proposed: expectedHistory }).result, "INSERT_REQUIRED");
assert.equal(planFarmOsMigrationHistoryCas({ existing: expectedHistory, proposed: expectedHistory }).result, "IDEMPOTENT");
assert.equal(planFarmOsMigrationHistoryCas({ existing: { ...expectedHistory, checksum: D }, proposed: expectedHistory }).result, "INCONSISTENT");

const expectedAcl = FARM_OS_AI_SCHEMA_ACL_ALLOWLIST_CANDIDATES.filter((grant) => grant.status === "expected").map((grant) => ({ principal: grant.principal, privilege: grant.privilege, grant_option: grant.grant_option }));
const aclEvidence = (grants: readonly { principal: string | null; privilege: "CREATE" | "USAGE"; grant_option: boolean }[]) => ({
  schema_version: "farmos.ai-schema-acl-evidence.v1", target_identity_digest: targetDigest,
  policy_digest: createFarmOsAiSchemaAclPolicyDigest(), grants, transaction_read_only: true,
  collection_complete: true, catalog_query_sha256: FARM_OS_AI_SCHEMA_ACL_QUERY_SHA256,
  grant_universe_sha256: FARM_OS_AI_SCHEMA_ACL_UNIVERSE_SHA256,
  collector_authority: "farmos.production-readonly-acl-collector.v1", observed_at: NOW,
} as const);
const aclInput = (grants: readonly { principal: string | null; privilege: "CREATE" | "USAGE"; grant_option: boolean }[]) => ({ target_manifest: identity, evidence: aclEvidence(grants), evaluated_at: LATER, maximum_age_ms: 60_000 });
assert.equal(evaluateFarmOsAiSchemaAcl(aclInput(expectedAcl)).result, "MATCH");
assert.equal(evaluateFarmOsAiSchemaAcl(aclInput([...expectedAcl, { principal: "farmos_app_local", privilege: "USAGE", grant_option: false }])).result, "UNKNOWN_GRANT");
assert.equal(evaluateFarmOsAiSchemaAcl(aclInput([...expectedAcl, { principal: "public", privilege: "CREATE", grant_option: false }])).result, "FORBIDDEN_GRANT");
assert.equal(evaluateFarmOsAiSchemaAcl(aclInput(expectedAcl.slice(1))).result, "MISSING_REQUIRED_GRANT");
assert.equal(evaluateFarmOsAiSchemaAcl(aclInput([{ principal: null, privilege: "CREATE", grant_option: false }])).result, "UNKNOWN_GRANT");
assert.equal(evaluateFarmOsAiSchemaAcl({ ...aclInput(expectedAcl), evidence: { ...aclEvidence(expectedAcl), policy_digest: D } }).result, "UNKNOWN_GRANT");
assert.equal(evaluateFarmOsAiSchemaAcl({ ...aclInput(expectedAcl), evidence: { ...aclEvidence(expectedAcl), collection_complete: false } }).result, "UNKNOWN_GRANT");

const capacity = {
  environment_id: identity.environment_id, target_identity_digest: targetDigest, provider_class: identity.provider_class,
  provider_resource_fingerprint: identity.provider_resource_fingerprint, storage_quota_bytes: 10_000_000_000,
  available_storage_bytes: 5_000_000_000, database_bytes: 11_359_923, wal_bytes_or_headroom: 5_000_000_000,
  observed_at: NOW, source_authority: "provider/read-only-capacity/1", status: "available",
} as const;
assert.equal(evaluateFarmOsProviderCapacity({ evidence: null, target_manifest: identity, evaluated_at: LATER }).result, "MISSING_CAPACITY");
assert.equal(evaluateFarmOsProviderCapacity({ evidence: capacity, target_manifest: identity, evaluated_at: LATER }).result, "MATCH");
assert.equal(evaluateFarmOsProviderCapacity({ evidence: { ...capacity, provider_resource_fingerprint: D2 }, target_manifest: identity, evaluated_at: LATER }).result, "MISSING_CAPACITY");
assert.equal(evaluateFarmOsProviderCapacity({ evidence: { ...capacity, available_storage_bytes: 50_000_000 }, target_manifest: identity, evaluated_at: LATER }).result, "INSUFFICIENT_CAPACITY");
assert.equal(evaluateFarmOsProviderCapacity({ evidence: { ...capacity, storage_quota_bytes: 1_000_000 }, target_manifest: identity, evaluated_at: LATER }).result, "INSUFFICIENT_CAPACITY");

const WINDOW = "change-window/stable-changes/1";
const maintenance = {
  environment_id: identity.environment_id, target_identity_digest: targetDigest, change_window_id: WINDOW,
  backup_receipt_digest: D, monitoring_receipt_digest: D2, source_authority: "operations/maintenance-readiness/1",
  waiting_locks: 0, long_transactions: 0, idle_in_transaction: 0, active_connections: 1,
  monitoring_ready: true, backup_ready: true, poller_disabled: true, feature_disabled: true, observed_at: NOW,
} as const;
const maintenanceInput = { evidence: maintenance, target_manifest: identity, expected_change_window_id: WINDOW, evaluated_at: LATER, maximum_age_ms: 60_000 };
assert.equal(evaluateFarmOsMaintenanceEvidence(maintenanceInput).result, "MATCH");
assert.equal(evaluateFarmOsMaintenanceEvidence({ ...maintenanceInput, evidence: { ...maintenance, waiting_locks: 1 } }).result, "BLOCKED");
assert.equal(evaluateFarmOsMaintenanceEvidence({ ...maintenanceInput, expected_change_window_id: "change-window/other" }).result, "BLOCKED");

const unknownOutcomeBase = {
  identity_result: "MATCH" as const, object_validation: exactObjects, history_state: "ABSENT" as const,
  artifact_sha_exact: true, verify_result: "PASS" as const, apply_commit_receipt: validCommitReceipt,
  target_identity_digest: targetDigest, migration_id: MIGRATION_ID, artifact_sha256: entry.apply_sha256,
  catalog_observed_at: NOW, evaluated_at: LATER,
};
assert.deepEqual(reconcileFarmOsUnknownApplyOutcome(unknownOutcomeBase), { result: "APPLIED_HISTORY_MISSING", replay_allowed: false });
fixture("unknown outcome exact without trusted receipt not elevated", () =>
  assert.deepEqual(reconcileFarmOsUnknownApplyOutcome({ ...unknownOutcomeBase, apply_commit_receipt: null }), { result: "VERIFIED_EXISTING_STATE", replay_allowed: false }));
assert.deepEqual(reconcileFarmOsUnknownApplyOutcome({ ...unknownOutcomeBase, object_validation: validate({ ...observed, objects: [], object_universe_digest: universe(objects) }), verify_result: "FAIL", apply_commit_receipt: null }), { result: "NOT_APPLIED", replay_allowed: true });
fixture("unknown outcome valid receipt conflicts with absent objects", () =>
  assert.deepEqual(reconcileFarmOsUnknownApplyOutcome({ ...unknownOutcomeBase, object_validation: validate({ ...observed, objects: [], object_universe_digest: universe(objects) }), verify_result: "FAIL" }), { result: "INCONSISTENT", replay_allowed: false }));
assert.equal(reconcileFarmOsUnknownApplyOutcome({ ...unknownOutcomeBase, history_state: "CONFLICT" }).result, "INCONSISTENT");

const authorityEvidence = FARM_OS_MIGRATION_AUTHORITY_MODEL.capabilities.map((capability) => ({
  schema_version: "farmos.migration-operator-authority-evidence.v1" as const,
  capability,
  principal_class: FARM_OS_MIGRATION_CAPABILITY_PRINCIPAL_POLICY[capability],
  target_identity_digest: targetDigest,
  transaction_read_only: true as const,
  collector_authority: "farmos.production-readonly-authority-collector.v1" as const,
  principal_is_superuser: false as const,
  capability_confirmed: true as const,
  capability_evidence_digest: sha(capability),
  runtime_role_state: capability === "ROLE_ADMIN" ? "EXACT" as const : null,
  runtime_role_flags: capability === "ROLE_ADMIN" ? FARM_OS_MIGRATION_AUTHORITY_MODEL.expected_runtime_role_flags : null,
  observed_at: NOW,
  expires_at: "2026-08-08T00:05:00.000Z",
}));
const reconciliationEvidence = registry.map((migration) => {
  const required = migrationObjects(migration.migration_id);
  const expectedCatalog = snapshot(migration.migration_id, required, false);
  const expectedCatalogFingerprint = createFarmOsMigrationObjectFingerprint(expectedCatalog)!;
  const applied = migration.role === "prefix";
  return {
    migration_id: migration.migration_id,
    expected_catalog: expectedCatalog,
    observed_catalog: applied
      ? snapshot(migration.migration_id, required, true)
      : { ...snapshot(migration.migration_id, [], true), object_universe_digest: universe(required) },
    expected_catalog_authority: {
      ...authority, migration_id: migration.migration_id, expected_fingerprint: expectedCatalogFingerprint,
      artifact_sha256: migration.apply_sha256, object_universe_digest: universe(required),
      expected_object_count: required.length, git_authority: migration.git_authority,
    },
    history_evidence: {
      schema_version: "farmos.migration-history-evidence.v1", target_identity_digest: targetDigest,
      migration_id: migration.migration_id, status: "AVAILABLE",
      row: applied ? { migration_id: migration.migration_id, sequence: migration.sequence, checksum: migration.apply_sha256 } : null,
      collection_complete: true, transaction_read_only: true,
      collector_authority: "farmos.production-readonly-history-collector.v1",
      catalog_query_sha256: FARM_OS_MIGRATION_HISTORY_QUERY_SHA256, observed_at: NOW,
    },
    apply_commit_receipt: null,
  };
});
const dryRunInput = {
  target_manifest: identity, live_identity_evidence: live, evaluated_at: LATER,
  execution_id: "execution/stable-changes/1", change_window_id: WINDOW,
  registry, target_migration_id: MIGRATION_ID, observed_apply_sha256: entry.apply_sha256, observed_verify_sha256: entry.verify_sha256,
  reconciliation_evidence: reconciliationEvidence, authority_evidence: authorityEvidence, acl_evidence: aclEvidence(expectedAcl),
  capacity_evidence: capacity, maintenance_evidence: maintenance,
} as const;
const readyPlan = planFarmOsMigrationApplyDryRun(dryRunInput);
assert.equal(readyPlan.result, "READY_TO_PROPOSE_APPLY");
assert.equal(readyPlan.apply_authorized, false);
assert.ok(readyPlan.precheck_receipt);
assert.equal(readyPlan.precheck_receipt.expires_at, "2026-08-08T00:01:00.000Z");
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, authority_evidence: authorityEvidence.slice(1) }).block_codes.includes("AUTHORITY_MISSING"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, authority_evidence: authorityEvidence.map((item) => item.capability === "SCHEMA_OWNER_APPLY" ? { ...item, principal_is_superuser: true } : item) }).block_codes.includes("AUTHORITY_MISSING"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, authority_evidence: authorityEvidence.map((item) => item.capability === "ROLE_ADMIN" ? { ...item, runtime_role_state: null, runtime_role_flags: null } : item) }).block_codes.includes("AUTHORITY_MISSING"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, authority_evidence: authorityEvidence.map((item) => item.capability === "HISTORY_WRITER" ? { ...item, principal_class: FARM_OS_MIGRATION_CAPABILITY_PRINCIPAL_POLICY.SCHEMA_OWNER_APPLY } : item) }).block_codes.includes("AUTHORITY_MISSING"), true);
const absentHistory = (item: typeof reconciliationEvidence[number]) => ({ ...item.history_evidence, row: null });
const allNotApplied = reconciliationEvidence.map((item) => ({ ...item, observed_catalog: { ...(item.observed_catalog as FarmOsMigrationCatalogSnapshot), objects: [], object_universe_digest: (item.expected_catalog as FarmOsMigrationCatalogSnapshot).object_universe_digest }, history_evidence: absentHistory(item) }));
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: allNotApplied }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
const gapThenApplied = reconciliationEvidence.map((item, index) => index === 0 ? { ...item, observed_catalog: { ...(item.observed_catalog as FarmOsMigrationCatalogSnapshot), objects: [], object_universe_digest: (item.expected_catalog as FarmOsMigrationCatalogSnapshot).object_universe_digest }, history_evidence: absentHistory(item) } : item);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: gapThenApplied }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
const targetApplied = reconciliationEvidence.map((item, index) => index === reconciliationEvidence.length - 1 ? { ...item, observed_catalog: snapshot(item.migration_id, migrationObjects(item.migration_id), true), history_evidence: { ...item.history_evidence, row: { migration_id: entry.migration_id, sequence: entry.sequence, checksum: entry.apply_sha256 } } } : item);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: targetApplied }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: reconciliationEvidence.map((item, index) => index === 0 ? { ...item, history_evidence: { ...item.history_evidence, status: "UNAVAILABLE", collection_complete: false } } : item) }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: reconciliationEvidence.map((item, index) => index === 0 ? { ...item, history_evidence: { ...item.history_evidence, target_identity_digest: D } } : item) }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, reconciliation_evidence: reconciliationEvidence.map((item, index) => index === 0 ? { ...item, history_evidence: { ...item.history_evidence, observed_at: "2026-08-07T23:00:00.000Z" } } : item) }).block_codes.includes("MIGRATION_HISTORY_NOT_RECONCILED"), true);
assert.equal(planFarmOsMigrationApplyDryRun({ ...dryRunInput, capacity_evidence: { ...capacity, target_identity_digest: D } }).block_codes.includes("CAPACITY_NOT_CONFIRMED"), true);
assert.deepEqual(transitionFarmOsApplyState({ current: "MAINTENANCE_CONFIRMED", next: "APPLY_AUTHORIZED" }), { result: "REJECTED", state: "MAINTENANCE_CONFIRMED" });
const receipt = readyPlan.precheck_receipt!;
const approval = {
  schema_version: "farmos.migration-apply-approval.v1", status: "authenticated_human_approved",
  approval_reference: "approval/apply/1", target_identity_digest: receipt.target_identity_digest,
  migration_id: receipt.migration_id, artifact_sha256: receipt.artifact_sha256,
  precheck_receipt_digest: sha(receipt), migration_plan_digest: receipt.migration_plan_digest,
  execution_id: receipt.execution_id, change_window_id: receipt.change_window_id,
  approved_at: LATER, expires_at: "2026-08-08T00:02:00.000Z",
} as const;
assert.equal(authorizeFarmOsMigrationApply({ receipt, dry_run_input: dryRunInput, approval, evaluated_at: "2026-08-08T00:00:45.000Z" }).result, "REJECTED");
assert.equal(authorizeFarmOsMigrationApply({ receipt, dry_run_input: dryRunInput, approval: { ...approval, execution_id: "execution/fabricated" }, evaluated_at: "2026-08-08T00:00:45.000Z" }).result, "REJECTED");
assert.equal(authorizeFarmOsMigrationApply({ receipt: { ...receipt, evidence_bundle_digest: D }, dry_run_input: dryRunInput, approval, evaluated_at: "2026-08-08T00:00:45.000Z" }).result, "REJECTED");
assert.equal(authorizeFarmOsMigrationApply({ receipt, dry_run_input: dryRunInput, approval, evaluated_at: "2026-08-08T00:03:00.000Z" }).result, "REJECTED");

assert.equal(FARM_OS_MIGRATION_TRANSACTION_OWNERSHIP.outer_single_transaction_allowed, false);
assert.equal(FARM_OS_MIGRATION_TRANSACTION_OWNERSHIP.psql_single_transaction_allowed, false);
assert.equal(FARM_OS_MIGRATION_TIMEOUT_POLICY.automatic_retry, 0);
assert.equal(FARM_OS_MIGRATION_AUTHORITY_MODEL.broad_superuser_allowed, false);
assert.equal(FARM_OS_RECONCILIATION_SAFETY_BOUNDARY.production_connection, 0);
assert.equal(FARM_OS_RECONCILIATION_SAFETY_BOUNDARY.credential_lookup, 0);
assert.equal(FARM_OS_RECONCILIATION_SAFETY_BOUNDARY.migration_apply, 0);
assert.equal(FARM_OS_RECONCILIATION_SAFETY_BOUNDARY.consumer_entrypoint_status, "PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED");

console.log(JSON.stringify({ result: "pass", remediation_fixtures: executedRemediationFixtures.size, identity_freshness: true, migration_specific_object_universes: registry.length, observed_catalog_complete: true, false_history_rejected: true, blind_replay_rejected: true, acl_auto_revoke: false, capacity_policy_server_owned: true, approval_receipt_bound: true, broad_superuser: false, production_operations: 0, secret_exposed: false }));
