import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS,
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  deriveFarmOsDay150PrefixReferenceAttemptIdentityFromDescriptor,
  validateFarmOsDay150PrefixReferenceExecutionDescriptor,
  validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
  type FarmOsDay150PrefixReferenceExecutionDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  deriveFarmOsDay150PrefixReferenceAttemptIdentity,
  parseFarmOsDay150PrefixReferenceAttemptClaim,
  parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor,
  parseFarmOsDay150PrefixReferenceConsumptionMarker,
  parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor,
  selectFarmOsDay150PrefixReferenceRepositoryApproval,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution,
} from "../../src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt";

const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string" ||
    typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`).digest("hex")}`;
const attemptInput = (value: FarmOsDay150PrefixReferenceExecutionDescriptor) => Object.freeze({
  authorization_digest: value.authorization_digest,
  execution_plan_digest: value.execution_plan_digest,
  pinned_migration_bundle_digest: value.pinned_migration_bundle_digest,
  run_identity: value.run_identity,
});

const expectedAttempts = Object.freeze({
  V4: "sha256:93ce91fa84fc02a17274fcac777828dc2ba7f2f5b5c3aae5fd9804bed7b3fe2e",
  V5: "sha256:488f06a42fd070ab158ec7e228527e220104a0d213b6829550e9c66c32566fb6",
  V6: "sha256:3923ae30523752ee0834f69ca47b8018ece0bc09fa955c0e4fc245c2b815e419",
} as const);
for (const version of ["V4", "V5", "V6", "V8", "V9", "V10", "V11", "V12", "V13"] as const) {
  const value = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS[version];
  assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(value), true, version);
  assert.equal(deriveFarmOsDay150PrefixReferenceAttemptIdentityFromDescriptor(value),
    version === "V13" ? FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID :
    version === "V12" ? FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_ATTEMPT_ID :
    version === "V11" ? FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_ATTEMPT_ID :
    version === "V10" ? FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID :
    version === "V9" ? FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID :
      version === "V8"
        ? "sha256:32db8bf71e3194a1414a0d04c13ee0466969dd4c6196cac79440c98bb8897d32" :
      expectedAttempts[version], version);
}
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V13);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8));
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  "sha256:7d8ac2065a5c92d822f8216541f810398d6b71a81b284ba26a781ef93d8cb8d3",
  "historical V8 descriptor identity remains the exact exhausted approval identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9));
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  "sha256:9e227f86626772f0b52ae3a12535a02883ca82f6a694142d86331a29e4a15441",
  "historical V9 descriptor identity remains the exact consumed terminal identity");
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  "historical V8 identity cannot alias historical V9 identity");
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  "opaque V7 history cannot alias historical V9 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10));
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  "stale V10 identity cannot alias historical V9 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V11));
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST,
  "historical V11 identity cannot alias stale V10 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V12));
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  "historical V12 identity cannot alias historical V11 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST,
  hash("farmos.day150-prefix-reference-execution-descriptor-digest.v1",
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V13));
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST,
  "active V13 identity cannot alias exhausted V12 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION
  .approved_attempt_identity, FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID);
assert.equal(deriveFarmOsDay150PrefixReferenceAttemptIdentity(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.pinned_migration_bundle_digest),
FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization
  .authorization_state, "PROPOSED_NOT_AUTHORIZED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization
  .product_owner_approval_reference, null);
const repositoryApprovalRegistry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path, "utf8")) as {
    schema_version: string; records: readonly Readonly<{ approval_record_digest?: unknown }>[] };
assert.equal(repositoryApprovalRegistry.schema_version,
  "farmos.day150-prefix-reference-execution-approval-registry.v1");
assert.equal(repositoryApprovalRegistry.records.length, 6);
assert.equal(repositoryApprovalRegistry.records[0]?.approval_record_digest,
  "sha256:503ec591b5e55aca220575a300a51cf22a20d3a4d713340f79cb063ef279d1b8");
assert.equal(repositoryApprovalRegistry.records[1]?.approval_record_digest,
  "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982");
assert.equal(repositoryApprovalRegistry.records[2]?.approval_record_digest,
  "sha256:cd66fc73e3f47833682937ea84dc7cc14551f8d5260c1f4c5aa18cbca293216e");
assert.equal(repositoryApprovalRegistry.records[3]?.approval_record_digest,
  "sha256:f82ee57d9825b0bf09e6401c45dd3a24ccc73a4c333752c3bc27acc90844d1af");
assert.equal(repositoryApprovalRegistry.records[4]?.approval_record_digest,
  "sha256:1745f4892c2846a6753ef36c94b404be88fc7e596d4b88e7cc7df9e8fdf8799c");
assert.equal(repositoryApprovalRegistry.records[5]?.approval_record_digest,
  "sha256:e35d50770df1afed49e507559c067c1bcaf10f675af391cf2e80a1aedf1c7dd9");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(repositoryApprovalRegistry,
  new Date().toISOString()), null,
"the historical registry cannot authorize a new post-success V13 invocation");
assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING), true);

const defectiveAttempt = hash(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.attempt,
  attemptInput(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6));
assert.equal(defectiveAttempt,
  "sha256:22072724e4031f8a7882ce6b3a3e1b1f23788bdb1409a2fc8d3e3a94b5a0e5ad");
const defectiveDescriptor = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6,
  attempt_identity: defectiveAttempt,
  digest_domains: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6.digest_domains,
    attempt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.attempt,
  }),
}) as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(defectiveDescriptor), false);

assert.equal(validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History(
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  repositoryApprovalRegistry.records[0]), true, "opaque V7 historical parse remains valid");
const fabricatedV7Descriptor = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7",
  authorization_revision: 7,
  durable_paths: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths,
    attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths
      .attempt_claim.replace("/v8/", "/v7/"),
    consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths
      .consumption_marker.replace("/v8/", "/v7/"),
    success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths
      .success_receipt.replace("/v8/", "/v7/"),
    terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8
      .durable_paths.terminal_outcome_receipt!.replace("/v8/", "/v7/"),
  }),
  postgres_application_name: "farmos-day150-prefix-reference-v7",
}) as unknown as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(fabricatedV7Descriptor), false,
  "opaque historical V7 can never validate as an executable descriptor");
for (const unsupportedRevision of [0, 7, 11, Number.MAX_SAFE_INTEGER]) {
  const unsupported = Object.freeze({ ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
    authorization_revision: unsupportedRevision,
  }) as unknown as FarmOsDay150PrefixReferenceExecutionDescriptor;
  assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(unsupported), false,
    `unsupported revision ${unsupportedRevision} must fail closed`);
}
const crossGenerationV4Paths = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V4,
  durable_paths: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths,
}) as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(crossGenerationV4Paths), false,
  "V4 cannot borrow V8 durable paths");
const arbitraryV8Path = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
  durable_paths: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths,
    attempt_claim:
      "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v8/arbitrary.authorization-attempt-claim",
  }),
}) as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(arbitraryV8Path), false,
  "an arbitrary path within the V8 directory is not authority");
const missingV8TerminalPath = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
  durable_paths: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths,
    terminal_outcome_receipt: null,
  }),
}) as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(missingV8TerminalPath), false,
  "V8 terminal receipt presence is exact");
const inventedV5TerminalPath = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5,
  durable_paths: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5.durable_paths,
    terminal_outcome_receipt:
      "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/invented-terminal.json",
  }),
}) as FarmOsDay150PrefixReferenceExecutionDescriptor;
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(inventedV5TerminalPath), false,
  "V5 cannot invent a terminal receipt authority");

const root = "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/" +
  "reference-catalog-run-receipt-candidate.json";
const claimBytes = readFileSync(`${root}.authorization-attempt-claim`);
const markerBytes = readFileSync(`${root}.authorization-consumed`);
const receiptBytes = readFileSync(
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/" +
  "reference-catalog-terminal-outcome-receipt.json");
const claim = JSON.parse(claimBytes.toString("utf8")) as unknown;
const marker = JSON.parse(markerBytes.toString("utf8")) as unknown;
const receipt = JSON.parse(receiptBytes.toString("utf8")) as unknown;
assert.ok(parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(claim, defectiveDescriptor));
assert.ok(parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor(marker,
  defectiveDescriptor));
assert.ok(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(receipt));
assert.ok(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(receipt,
  defectiveDescriptor));
assert.equal(parseFarmOsDay150PrefixReferenceAttemptClaim(claim), null);
assert.equal(parseFarmOsDay150PrefixReferenceConsumptionMarker(marker), null);
assert.equal(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(receipt,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR), null);
assert.equal(createHash("sha256").update(claimBytes).digest("hex"),
  "df139b4ea05b19b6d81f6f91ccfaf4522cf401e151676df9822a2de70bb07321");
assert.equal(createHash("sha256").update(markerBytes).digest("hex"),
  "6276fe71c1eb6c9d488a9680b9eaa2ee979891edad64b31c32965ee93fb30b8a");
assert.equal(createHash("sha256").update(receiptBytes).digest("hex"),
  "44ced707d509f5fd8cebbb16f50a8d537f089a78ff14405f906be8ff9f3b11d0");

const active = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
const mutations: FarmOsDay150PrefixReferenceExecutionDescriptor[] = [
  { ...active, authorization_revision: 5 },
  { ...active, authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5" },
  { ...active, run_identity: expectedAttempts.V5 },
  { ...active, attempt_identity: defectiveAttempt },
  { ...active, digest_domains: { ...active.digest_domains,
    authorization: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.authorization } },
  { ...active, digest_domains: { ...active.digest_domains,
    plan: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.plan } },
  { ...active, digest_domains: { ...active.digest_domains,
    run: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.run } },
  { ...active, digest_domains: { ...active.digest_domains,
    attempt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.attempt } },
  { ...active, durable_paths: { ...active.durable_paths,
    attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5.durable_paths
      .attempt_claim } },
  { ...active, durable_paths: { ...active.durable_paths,
    consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5.durable_paths
      .consumption_marker } },
  { ...active, durable_paths: { ...active.durable_paths,
    success_receipt: active.durable_paths.terminal_outcome_receipt! } },
  { ...active, durable_paths: { ...active.durable_paths,
    terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5
      .durable_paths.success_receipt } },
  { ...active, postgres_application_name: "farmos-day150-prefix-reference-v5" },
  { ...active, schema_revisions: { ...active.schema_revisions,
    attempt_claim: 0 } as unknown as typeof active.schema_revisions },
  { ...active, schema_revisions: { ...active.schema_revisions,
    consumption_marker: 2 } as unknown as typeof active.schema_revisions },
  { ...active, schema_revisions: { ...active.schema_revisions,
    terminal_outcome_receipt: null } as unknown as typeof active.schema_revisions },
  { ...active, digest_domains: { ...active.digest_domains,
    candidate_provenance: "farmos.day150-prefix-reference-run-provenance.v0" } },
  { ...active, digest_domains: { ...active.digest_domains,
    attempt: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.attempt } },
  { ...active, durable_paths: { ...active.durable_paths,
    attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6.durable_paths
      .attempt_claim } },
];
for (const [index, mutation] of mutations.entries()) {
  assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(
    mutation as FarmOsDay150PrefixReferenceExecutionDescriptor), false, `drift-${index}`);
}
const bindingMutations = [
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5 },
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    authorization: { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization,
      stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6.run_identity } },
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    external_execution_plan: {
      ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.external_execution_plan,
      execution_authorization_revision: 5 } },
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    external_execution_plan: {
      ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.external_execution_plan,
      candidate_output_paths: ["artifacts/day150/incorrect-candidate.json"] } },
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    external_execution_plan: {
      ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.external_execution_plan,
      b2_operations: 1 } },
  { ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    authorization: {
      ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization,
      gate17_scope_authority: {
        ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization
          .gate17_scope_authority,
        authority_digest: `sha256:${"0".repeat(64)}` } } },
] as const;
for (const [index, mutation] of bindingMutations.entries()) {
  assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
    mutation as unknown as typeof FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING), false,
  `binding-drift-${index}`);
}

process.stdout.write(JSON.stringify({ status: "PASS", descriptors: 7,
  exact_v6_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  v7_executable_descriptor: "BODY_NOT_DURABLY_PRESERVED",
  exact_v8_attempt_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.attempt_identity,
  exact_v9_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID,
  exact_v10_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID,
  exact_v11_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_ATTEMPT_ID,
  stale_v5_domain_historical_fixture_only: defectiveAttempt,
  cross_version_drift_rejections: mutations.length + bindingMutations.length,
  defective_v6_evidence_preserved: true, v6_retry_authorities: 0 }) + "\n");
