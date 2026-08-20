import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_HISTORY_CONTRACT,
  FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
  FARM_OS_DAY150_PREFIX_QUALIFICATION_RESULT_SCHEMA,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN,
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_DIGEST,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS_DIGEST,
  FARM_OS_DAY150_EXACT_FIVE_APPROVED_AUTHORITY_REPOSITORY_PATH,
  compileFarmOsDay150ExpectedCatalogCandidate,
  compileFarmOsDay150QualificationCatalogRepresentation,
  createFarmOsDay150ApprovedExpectedCatalogBindingDigest,
  createFarmOsDay150ExpectedCatalogCandidateRegistry,
  createFarmOsDay150ExpectedCatalogCandidateSetDigest,
  createFarmOsDay150QualificationOnlyReferenceCapability,
  finalizeFarmOsDay150ReferenceCatalogRun,
  loadFarmOsDay150ApprovedExpectedCatalogExact,
  loadFarmOsDay150ExpectedCatalogApprovalExact,
  loadFarmOsDay150ExpectedCatalogCandidateExact,
  parseFarmOsDay150ExpectedCatalogCandidate,
  parseFarmOsDay150ReferenceCatalogRunReceiptCandidate,
  preflightFarmOsDay150PrefixReferenceSourceAuthority,
  readFarmOsDay150ApprovedExpectedCatalog,
  validateFarmOsDay150ExpectedCatalogSetApprovalCandidate,
  validateFarmOsDay150ExactFiveRepositoryPromotion,
  type FarmOsDay150ExpectedCatalogCandidateIdentity,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_STABLE_CHANGES_MIGRATION_METADATA,
  validExpectedCatalogAuthority,
} from "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";
import { FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2 } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
  validateFarmOsProductionIdentityCatalogReferenceResultSets,
  type FarmOsProductionIdentityCandidateResultSet,
  type FarmOsProductionIdentityCandidateRow,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";

const sha = (value: string) => `sha256:${value.repeat(64)}` as const;
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_HISTORY_CONTRACT.database_rows_required,
  false);
assert.equal(
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_HISTORY_CONTRACT
    .reference_executor_history_writes_authorized,
  false);
const RAW_FUNCTION = "raw-function-body-sentinel";
const RAW_PROCONFIG = "raw-proconfig-sentinel";
const RAW_DEFAULT = "raw-default-sentinel";
const RAW_DEFINITION = "raw-definition-sentinel";
const RAW_POLICY = "raw-policy-sentinel";
const row = (section_id: FarmOsProductionIdentityCandidateRow["section_id"], row_key: string,
  payload: Record<string, unknown>, sanitization_class:
  FarmOsProductionIdentityCandidateRow["sanitization_class"] = "SAFE_STRUCTURAL"):
  FarmOsProductionIdentityCandidateRow => ({ section_id, row_key, payload, sanitization_class });
const sorted = (rows: FarmOsProductionIdentityCandidateRow[]) => rows.sort((left, right) =>
  Buffer.compare(Buffer.from(left.row_key), Buffer.from(right.row_key)));
const splitScope = (scope: string): [string, string] => {
  const separator = scope.indexOf(":");
  return [scope.slice(0, separator), scope.slice(separator + 1)];
};

function fixtureSets(): { acl: FarmOsProductionIdentityCandidateResultSet;
  catalog: FarmOsProductionIdentityCandidateResultSet } {
  const aclActual = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES.map((roleName) =>
    row("F_ACL_PRINCIPAL_INVENTORY", `role_flags:${roleName}:${roleName}:::`, {
      collection_status: "complete", row_kind: "role_flags", object_identity: roleName,
      principal: roleName, privilege: null, grant_option: null, grantor: null,
      acl_default_class: null, relation_kind: null,
      role_flags: { exists: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
        rolinherit: true, rolreplication: false, rolbypassrls: false },
    }));
  const acl = { section_id: "F_ACL_PRINCIPAL_INVENTORY" as const,
    rows: sorted([row("F_ACL_PRINCIPAL_INVENTORY", "__collection_status__", {
      collection_status: "complete", inventory_complete: true,
      query_universe: "ai_audit_core_schema_all_acl_and_scoped_roles", row_count: aclActual.length,
    }), ...aclActual]) };
  const actual: FarmOsProductionIdentityCandidateRow[] = [];
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES) {
    const [migration_id, object_identity] = splitScope(scope);
    const first = scope === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0];
    actual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:table:${object_identity}`, {
      collection_status: "complete", migration_id, object_kind: "table", object_identity,
      attributes: { exists: true, relkind: "r", owner: "fixture_owner", rls_enabled: first,
        rls_forced: false }, raw_sensitive_texts: {},
    }), row("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:rls_policy_inventory:${object_identity}`, { collection_status: "complete",
        migration_id, object_kind: "rls_policy_inventory", object_identity,
        attributes: { inventory_complete: true, policy_count: first ? 1 : 0,
          rls_enabled: first, rls_forced: false }, raw_sensitive_texts: {} }));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES) {
    const [migration_id, functionName] = splitScope(scope);
    const object_identity = `${functionName}()`;
    actual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:function:${object_identity}`, {
      collection_status: "complete", migration_id, object_kind: "function", object_identity,
      attributes: { exists: true, owner: "fixture_owner", security_definer: false },
      raw_sensitive_texts: { definition: RAW_FUNCTION, proconfig: [RAW_PROCONFIG] },
    }, "INTERNAL_RAW_NEVER_PERSIST"));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES) {
    const [migration_id, object_identity] = splitScope(scope);
    actual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:role:${object_identity}`, {
      collection_status: "complete", migration_id, object_kind: "role", object_identity,
      attributes: { exists: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
        rolinherit: true, rolreplication: false, rolbypassrls: false }, raw_sensitive_texts: {},
    }));
  }
  const [migration, relation] = splitScope(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0]);
  actual.push(
    row("G_MIGRATION_CATALOG_INVENTORY", `${migration}:column:${relation}.fixture_col`, {
      collection_status: "complete", migration_id: migration, object_kind: "column",
      object_identity: `${relation}.fixture_col`, attributes: { data_type: "text", not_null: false },
      raw_sensitive_texts: { default_expression: RAW_DEFAULT },
    }, "INTERNAL_RAW_NEVER_PERSIST"),
    row("G_MIGRATION_CATALOG_INVENTORY", `${migration}:constraint:${relation}.fixture_check`, {
      collection_status: "complete", migration_id: migration, object_kind: "constraint",
      object_identity: `${relation}.fixture_check`, attributes: { type: "c" },
      raw_sensitive_texts: { definition: RAW_DEFINITION },
    }, "INTERNAL_RAW_NEVER_PERSIST"),
    row("G_MIGRATION_CATALOG_INVENTORY", `${migration}:index:${relation}.fixture_idx`, {
      collection_status: "complete", migration_id: migration, object_kind: "index",
      object_identity: `${relation}.fixture_idx`, attributes: { unique: false, valid: true },
      raw_sensitive_texts: { definition: RAW_DEFINITION },
    }, "INTERNAL_RAW_NEVER_PERSIST"),
    row("G_MIGRATION_CATALOG_INVENTORY", `${migration}:trigger:${relation}.fixture_trigger`, {
      collection_status: "complete", migration_id: migration, object_kind: "trigger",
      object_identity: `${relation}.fixture_trigger`,
      attributes: { enabled: "O", function_identity: "ai.fixture_trigger()" },
      raw_sensitive_texts: { definition: RAW_DEFINITION },
    }, "INTERNAL_RAW_NEVER_PERSIST"),
    row("G_MIGRATION_CATALOG_INVENTORY", `${migration}:rls_policy:${relation}.fixture_policy`, {
      collection_status: "complete", migration_id: migration, object_kind: "rls_policy",
      object_identity: `${relation}.fixture_policy`, attributes: { command: "SELECT",
        permissive: true, policy_name: "fixture_policy", roles: ["public"] },
      raw_sensitive_texts: { qual: RAW_POLICY, with_check: RAW_POLICY },
    }, "INTERNAL_RAW_NEVER_PERSIST"),
  );
  const catalog = { section_id: "G_MIGRATION_CATALOG_INVENTORY" as const,
    rows: sorted([row("G_MIGRATION_CATALOG_INVENTORY", "__collection_status__", {
      collection_status: "complete", inventory_complete: true,
      migration_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length,
      object_classes: [...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES],
      rls_policy_inventory_complete: true, row_count: actual.length,
    }), ...actual]) };
  return { acl, catalog };
}

const fixture = fixtureSets();
assert.equal(validateFarmOsProductionIdentityCatalogReferenceResultSets(fixture), true);
const qualification = createFarmOsDay150QualificationOnlyReferenceCapability({
  acl_result_set: fixture.acl, catalog_result_set: fixture.catalog,
});
assert.ok(qualification);
const results = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => {
  const result = compileFarmOsDay150QualificationCatalogRepresentation({
    migration_id: spec.migration_id, qualification_capability: qualification,
  });
  assert.ok(result, spec.migration_id);
  return result;
});
assert.equal(results.length, 5);
assert.equal(results.every((result) => result.schema_version ===
  FARM_OS_DAY150_PREFIX_QUALIFICATION_RESULT_SCHEMA &&
  result.authority_state === "QUALIFICATION_ONLY_NOT_PROMOTABLE"), true);
const serialized = JSON.stringify(results);
for (const sentinel of [RAW_FUNCTION, RAW_PROCONFIG, RAW_DEFAULT, RAW_DEFINITION, RAW_POLICY]) {
  assert.equal(serialized.includes(sentinel), false, `${sentinel} must not persist`);
}
assert.equal(serialized.includes("INTERNAL_RAW_NEVER_PERSIST"), false);
assert.equal(Object.isFrozen(results[0]!.snapshot.catalog_snapshot.objects), true);
assert.equal(Object.isFrozen(results[0]!.snapshot.catalog_snapshot.objects[0]!.attributes), true);
assert.throws(() => {
  (results[0]!.snapshot.catalog_snapshot.objects as unknown as unknown[]).push("mutation");
}, "returned nested arrays are immutable");
assert.throws(() => {
  (results[0]!.snapshot.catalog_snapshot.objects[0]!.attributes as
    Record<string, unknown>).caller_mutation = true;
}, "returned nested objects are immutable");

const changed = structuredClone(fixture);
const changedFunction = changed.catalog.rows.find((candidate) =>
  candidate.row_key.includes(":function:"))!;
(changedFunction.payload.raw_sensitive_texts as Record<string, unknown>).definition =
  "changed-raw-function-body-sentinel";
const changedQualification = createFarmOsDay150QualificationOnlyReferenceCapability({
  acl_result_set: changed.acl, catalog_result_set: changed.catalog,
});
assert.ok(changedQualification);
const functionMigration = splitScope(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES[0])[0] as
  typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS[number];
const beforeChanged = compileFarmOsDay150QualificationCatalogRepresentation({
  migration_id: functionMigration, qualification_capability: qualification,
});
const afterChanged = compileFarmOsDay150QualificationCatalogRepresentation({
  migration_id: functionMigration, qualification_capability: changedQualification,
});
assert.ok(beforeChanged && afterChanged);
assert.notEqual(beforeChanged.candidate_fingerprint, afterChanged.candidate_fingerprint,
  "safe digest commitment changes with raw identity");

const ownedInput = structuredClone(fixture);
const ownedCapability = createFarmOsDay150QualificationOnlyReferenceCapability({
  acl_result_set: ownedInput.acl, catalog_result_set: ownedInput.catalog,
});
assert.ok(ownedCapability);
const ownedBefore = compileFarmOsDay150QualificationCatalogRepresentation({
  migration_id: functionMigration, qualification_capability: ownedCapability,
});
const mutableFunction = ownedInput.catalog.rows.find((candidate) =>
  candidate.row_key.includes(":function:"))!;
(mutableFunction.payload.raw_sensitive_texts as Record<string, unknown>).definition = "mutated-after-register";
const ownedAfter = compileFarmOsDay150QualificationCatalogRepresentation({
  migration_id: functionMigration, qualification_capability: ownedCapability,
});
assert.deepEqual(ownedAfter, ownedBefore, "caller mutation cannot affect owned capability state");

assert.equal(compileFarmOsDay150ExpectedCatalogCandidate({
  migration_id: functionMigration, run_capability: qualification,
}), null, "qualification capability rejected by promotable path");
assert.equal(compileFarmOsDay150ExpectedCatalogCandidate({
  migration_id: functionMigration, run_capability: Object.freeze({}),
}), null, "structurally forged run capability rejected");
for (const forgedRun of [
  { reference_image: "docker.io/library/postgres@sha256:wrong" },
  { reference_platform: "linux/amd64" },
  { run_id: "wrong run id" },
  { source: "PRODUCTION_COLLECTOR", provenance: "ISOLATED_REFERENCE" },
  { source: "FIXTURE", snapshot_point: "wrong-migration" },
]) {
  assert.equal(compileFarmOsDay150ExpectedCatalogCandidate({
    migration_id: functionMigration, run_capability: Object.freeze(forgedRun),
  }), null, "wrong image, platform, and run provenance cannot authenticate a source");
  assert.equal(parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(forgedRun), null,
    "partial or wrong receipt provenance is rejected");
}
assert.equal(finalizeFarmOsDay150ReferenceCatalogRun({ executor_completion: Object.freeze({}) }), null,
  "structurally forged executor completion rejected");
assert.equal(parseFarmOsDay150ExpectedCatalogCandidate(results[0]), null,
  "qualification representation is not a candidate artifact");
assert.equal(createFarmOsDay150ExpectedCatalogCandidateRegistry(results, qualification), null,
  "qualification artifacts cannot enter candidate registry");
assert.equal(createFarmOsDay150ExpectedCatalogCandidateRegistry({} as unknown as readonly unknown[],
  qualification), null, "non-array registry input fails closed");
assert.equal(loadFarmOsDay150ExpectedCatalogCandidateExact({ registry: Object.freeze({}),
  candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.candidate_id,
  candidate_revision: 1, migration_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.migration_id }), null);

const identities: FarmOsDay150ExpectedCatalogCandidateIdentity[] =
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec, index) => ({
    candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: spec.candidate_id, candidate_revision: 1, migration_id: spec.migration_id,
    candidate_identity_digest: sha(String(index + 1)),
    candidate_expected_fingerprint: sha(String(index + 1)), snapshot_digest: sha("a"),
    artifact_sha256: spec.artifact_sha256, catalog_query_sha256: spec.catalog_query_sha256,
    object_universe_digest: spec.object_universe_digest, expected_object_count: index + 1,
    git_authority: spec.git_authority, reference_run_provenance_digest: sha("b"),
    reference_capture_digest: sha("c"),
  }));
const setDigest = createFarmOsDay150ExpectedCatalogCandidateSetDigest(identities);
assert.ok(setDigest);
const decision = { schema_version: "farmos.day150-prefix-expected-catalog-set-approval.v1",
  status: "AUTHENTICATED_PRODUCT_OWNER_APPROVED_EXACT_FIVE",
  approval_authority_id: "farmos.day150-product-owner-expected-catalog-approval.v1",
  approval_revision: 1, candidate_set_digest: setDigest, candidates: identities,
  approval_reference: "qualification/product-owner/exact-five",
  approved_at: "2026-08-13T00:00:00.000Z" } as const;
assert.equal(validateFarmOsDay150ExpectedCatalogSetApprovalCandidate(decision), true);
const approvedBeforeFailedDecisions = loadFarmOsDay150ApprovedExpectedCatalogExact({
  authority_id: `farmos.expected-catalog-fingerprint.${identities[0]!.migration_id}.v1`,
  authority_revision: 1, migration_id: identities[0]!.migration_id,
});
assert.ok(approvedBeforeFailedDecisions);
const approvedBeforeFailedDecisionReadback =
  readFarmOsDay150ApprovedExpectedCatalog(approvedBeforeFailedDecisions);
assert.ok(approvedBeforeFailedDecisionReadback);
assert.equal(validateFarmOsDay150ExpectedCatalogSetApprovalCandidate({ ...decision,
  candidates: identities.slice(1) }), false, "4/5 rejected");
assert.equal(validateFarmOsDay150ExpectedCatalogSetApprovalCandidate({ ...decision,
  candidates: [...identities, identities[0]!] }), false, "6 entries rejected");
assert.equal(createFarmOsDay150ExpectedCatalogCandidateSetDigest([
  identities[0]!, identities[0]!, ...identities.slice(2),
]), null, "duplicate candidate and migration rejected");
const wrongPrefix = structuredClone(identities);
wrongPrefix[0] = { ...wrongPrefix[0]!, migration_id: "unknown-prefix" as
  typeof wrongPrefix[0]["migration_id"] };
assert.equal(createFarmOsDay150ExpectedCatalogCandidateSetDigest(wrongPrefix), null,
  "unknown prefix rejected");
const oneInvalid = structuredClone(identities);
oneInvalid[2] = { ...oneInvalid[2]!, expected_object_count: 0 };
assert.equal(createFarmOsDay150ExpectedCatalogCandidateSetDigest(oneInvalid), null,
  "one invalid candidate rejects the complete set");
assert.equal(createFarmOsDay150ExpectedCatalogCandidateSetDigest([
  identities[1]!, identities[0]!, ...identities.slice(2),
]), null, "reordered set is rejected rather than ambiguously normalized");
const changedIdentities = structuredClone(identities);
changedIdentities[0] = { ...changedIdentities[0]!, candidate_identity_digest: sha("d") };
assert.equal(validateFarmOsDay150ExpectedCatalogSetApprovalCandidate({ ...decision,
  candidates: changedIdentities }), false, "candidate changed after set digest rejected");
const approvedAfterFailedDecisions = loadFarmOsDay150ApprovedExpectedCatalogExact({
  authority_id: `farmos.expected-catalog-fingerprint.${identities[0]!.migration_id}.v1`,
  authority_revision: 1, migration_id: identities[0]!.migration_id,
});
assert.ok(approvedAfterFailedDecisions);
assert.deepEqual(readFarmOsDay150ApprovedExpectedCatalog(approvedAfterFailedDecisions),
  approvedBeforeFailedDecisionReadback,
  "failed decisions leave the atomic approved-set registry unchanged");

const approvedFixture = { schema_version: "farmos.expected-catalog-fingerprint-authority.v1",
  migration_id: identities[0]!.migration_id, fingerprint_version: "farmos.pg-catalog-fingerprint.v1",
  expected_fingerprint: identities[0]!.candidate_expected_fingerprint,
  artifact_sha256: identities[0]!.artifact_sha256,
  catalog_query_sha256: identities[0]!.catalog_query_sha256,
  object_universe_digest: identities[0]!.object_universe_digest,
  expected_object_count: identities[0]!.expected_object_count,
  git_authority: identities[0]!.git_authority,
  approval_reference: "qualification/product-owner/exact-five",
  approved_at: "2026-08-13T00:00:00.000Z" } as const;
assert.equal(validExpectedCatalogAuthority(approvedFixture), true);
assert.equal(validExpectedCatalogAuthority({ ...approvedFixture, approval_reference: null }), false);
assert.equal(validExpectedCatalogAuthority({ ...approvedFixture, approved_at: null }), false);
assert.equal(loadFarmOsDay150ExpectedCatalogApprovalExact({
  approval_authority_id: decision.approval_authority_id, approval_revision: 1,
  candidate_set_digest: setDigest }), null,
"a non-repository synthetic approval cannot enter the repository approval registry");
assert.equal(validateFarmOsDay150ExactFiveRepositoryPromotion(), true);
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.approved_at,
  "2026-08-20T06:43:00.000Z");
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.candidate_set_digest,
  "sha256:658b3765e28dd8050da393a167f812364887887bbe40fac7860206d9ccecaab2");
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.source_qualification_evidence_digest,
  "sha256:f34b2609279cfb801e732c535181a05828815dcfbd40ba89292b31f41dbdf382");
assert.match(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS_DIGEST, /^sha256:[0-9a-f]{64}$/u);
assert.match(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_DIGEST, /^sha256:[0-9a-f]{64}$/u);
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
  `product-owner/day150/exact-five/${FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS_DIGEST.slice(7)}`);
assert.equal(FARM_OS_DAY150_EXACT_FIVE_APPROVED_AUTHORITY_REPOSITORY_PATH,
  "src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation.ts#" +
  "REPOSITORY_APPROVED_BINDING_SET");
const repositoryApproval = loadFarmOsDay150ExpectedCatalogApprovalExact({
  approval_authority_id: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.approval_authority_id,
  approval_revision: 1,
  candidate_set_digest: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.candidate_set_digest,
});
assert.ok(repositoryApproval);
const approvedBindingDigests = FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.candidates.map(
  (candidate) => {
    const capability = loadFarmOsDay150ApprovedExpectedCatalogExact({
      authority_id: `farmos.expected-catalog-fingerprint.${candidate.migration_id}.v1`,
      authority_revision: 1, migration_id: candidate.migration_id,
    });
    assert.ok(capability, candidate.migration_id);
    const binding = readFarmOsDay150ApprovedExpectedCatalog(capability);
    assert.ok(binding, candidate.migration_id);
    assert.equal(binding.candidate_identity.candidate_identity_digest,
      candidate.candidate_identity_digest);
    assert.equal(binding.approval_reference, FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE);
    assert.equal(binding.approved_at, "2026-08-20T06:43:00.000Z");
    const bindingDigest = createFarmOsDay150ApprovedExpectedCatalogBindingDigest(binding);
    assert.ok(bindingDigest);
    return bindingDigest;
  });
assert.equal(new Set(approvedBindingDigests).size, 5);
assert.equal(loadFarmOsDay150ApprovedExpectedCatalogExact({ authority_id: "sixth-authority",
  authority_revision: 1, migration_id: "sixth-migration" }), null);

assert.equal(Object.isFrozen(FARM_OS_STABLE_CHANGES_MIGRATION_METADATA), true);
assert.equal(Object.isFrozen(FARM_OS_STABLE_CHANGES_MIGRATION_METADATA[0]), true);
assert.throws(() => { (FARM_OS_STABLE_CHANGES_MIGRATION_METADATA as unknown as unknown[])[0] = []; });
assert.throws(() => { (FARM_OS_STABLE_CHANGES_MIGRATION_METADATA[0] as unknown as unknown[])[0] = "changed"; });
assert.equal(FARM_OS_STABLE_CHANGES_MIGRATION_METADATA[0]![0], identities[0]!.migration_id);

assert.deepEqual(preflightFarmOsDay150PrefixReferenceSourceAuthority(), {
  status: "BLOCKED", reason: "SOURCE_AUTHORITY_MISMATCH",
  checked_manifest: "db/provisioning/manifest.json",
  checked_query: "scripts/sql/farm_os_production_identity_readonly_v5.sql",
  checked_migration_count: 5,
  checked_source_candidate_count:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files.length,
  docker_operations: 0, postgres_operations: 0,
  migration_operations: 0, production_operations: 0, canonical_operations: 0,
}, "post-V13 promotion source cannot be mistaken for historical V13 executable source");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.execution_authorized, true);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.execution_authorization_revision, 4);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.snapshot_points.length, 5);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.previous_authorization,
  "V3_SUPERSEDED_UNCONSUMED");
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.attempt_claim_artifact, {
  path: "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim",
  schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
  operation: "ONE_CANONICAL_EXCLUSIVE_DURABLE_PUBLICATION_AND_TRUSTED_READBACK",
});
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.bootstrap_plan.reference_role_profile.login,
  false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.migration_execution_role,
  "REFERENCE_MIGRATION_EXECUTOR_FOR_ALL_FIVE_MIGRATIONS");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.docker_operations, 0);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.postgres_operations, 0);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.migration_operations, 0);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.production_operations, 0);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.canonical_operations, 0);

console.log(JSON.stringify({ status: "PASS", privacy_cases: 7, reference_auth_cases: 7,
  immutability_cases: 5, atomic_five_cases: 6, prefix_count: results.length,
  real_candidate_count: 0, approved_registry_entries: 1, approved_authority_count: 5,
  docker_operations: 0,
  postgres_operations: 0, migration_operations: 0, production_operations: 0,
  canonical_operations: 0 }));
