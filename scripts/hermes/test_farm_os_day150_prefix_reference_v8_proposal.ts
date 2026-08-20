import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST } from
  "../../src/lib/hermes/farm_os_day150_gate17_scope_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V7_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_APPROVAL_RECORD_CANDIDATE_IDENTITY,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXTERNAL_PLAN_IDENTITY_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_GATE17_SCOPE_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_BODY_RECOVERY_RESULT,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE,
  createFarmOsDay150PrefixReferenceExecutionApprovalRecord,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigest,
  loadFarmOsDay150PrefixReferenceHistoricalV7ExecutableBody,
  parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord,
  materializeFarmOsDay150PrefixReferenceExecutionProposal,
  validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History,
  validateFarmOsDay150PrefixReferenceExecutionDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT,
  loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord,
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository,
  parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord,
  selectFarmOsDay150PrefixReferenceRepositoryApproval,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_STATUS,
  createFarmOsDay150PrefixReferenceV8ProposalRequest,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_v8_proposal";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const canonical = (value: Json): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
};
const rehash = (record: Record<string, unknown>, version: 1 | 2 = 2) => {
  const { approval_record_digest: _digest, ...body } = record;
  return Object.freeze({ ...body, approval_record_digest:
    `sha256:${createHash("sha256").update(
      `farmos.day150-prefix-reference-execution-approval-record.v${version}\n${canonical(body as Json)}`,
    ).digest("hex")}` });
};
const approvalRegistry = (records: readonly unknown[]) => Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
  records: Object.freeze([...records]),
});
const selectV8 = (registry: unknown, observedAt: string) =>
  selectFarmOsDay150PrefixReferenceRepositoryApproval(
    registry, observedAt, FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE);

const proposalCreatedAt = "2026-08-16T11:00:00.000Z";
const approvedAt = "2026-08-16T11:01:00.000Z";
const observedAt = "2026-08-16T11:02:00.000Z";
const request = createFarmOsDay150PrefixReferenceV8ProposalRequest(proposalCreatedAt);
assert.ok(request);
assert.equal(request.invocation_allowed, false);
assert.equal(request.current_state, "EXHAUSTED_NON_RUNNABLE");
assert.equal(request.approval_materialization_allowed, false);
assert.equal(request.active_execution_binding, null);
assert.equal(request.proposal, null);
assert.equal(request.create_approved_record, null);
assert.equal(request.historical_status, FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_STATUS);
assert.equal(request.historical_status.execution_descriptor,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8);
assert.equal(request.historical_status.execution_descriptor_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST);
assert.equal(request.historical_status.external_plan_identity_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE
  .historical_state, "EXHAUSTED_NON_RUNNABLE");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE
  .approval_materialization_allowed, false);
assert.equal("request" in FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE,
  false);
assert.equal("approval_record_candidate" in
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE, false);
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(
  request.historical_status.execution_descriptor), true);
const qualificationProposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
  proposal_created_at: proposalCreatedAt,
});
assert.ok(qualificationProposal);
const approval = createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
  proposal: qualificationProposal,
  approved_at: approvedAt,
});
assert.ok(approval);
assert.equal(approval.gate17_scope_digest, FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST);
const repositoryRoot = mkdtempSync(join(tmpdir(), "farmos-day150-v8-repository-"));
const historicalRepositoryRegistry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path, "utf8"));
assert.equal(historicalRepositoryRegistry.records.length, 3);
const historicalV7 = historicalRepositoryRegistry.records[0];
assert.equal(historicalRepositoryRegistry.records[1]?.approval_record_digest,
  "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982");
assert.equal(historicalRepositoryRegistry.records[2]?.approval_record_digest,
  "sha256:cd66fc73e3f47833682937ea84dc7cc14551f8d5260c1f4c5aa18cbca293216e");
assert.deepEqual(historicalV7, FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD);
assert.deepEqual(parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord(historicalV7),
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD);
assert.ok(parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(historicalV7));
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_GATE17_SCOPE_DIGEST,
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST);
const currentDigest = deriveFarmOsDay150PrefixReferenceExecutableSourceDigest();
const mutatedCurrentDigest = deriveFarmOsDay150PrefixReferenceExecutableSourceDigest((path) =>
  Buffer.concat([readFileSync(path), Buffer.from("\nCURRENT_SOURCE_MUTATION")]));
assert.notEqual(currentDigest, mutatedCurrentDigest);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD
  .executable_source_digest,
"sha256:efc9ae9f354973eb48ea0abee41a16343c02cf84f532d94aeaec725ca22448f5");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
  .historical_body_status, "BODY_NOT_DURABLY_PRESERVED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_BODY_RECOVERY_RESULT
  .exact_historical_body_found, false);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_BODY_RECOVERY_RESULT
  .inspected_tree_recomputed_authorization_digest,
FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
  .historical_authorization_digest);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.selectable, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.runnable, false);
assert.equal(loadFarmOsDay150PrefixReferenceHistoricalV7ExecutableBody(), null,
  "an executable V7 body cannot be regenerated from current source");
assert.equal("files" in FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1, false,
  "opaque history does not invent a historical closure file list");
assert.equal(validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History(
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1, historicalV7), true);
assert.equal(validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  authorization_body: qualificationProposal,
}, historicalV7), false, "current V8 metadata cannot be mislabeled as historical V7 body");
assert.deepEqual(Object.freeze({
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_source_digest,
  authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V7_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID,
  execution_descriptor_digest: FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXTERNAL_PLAN_IDENTITY_DIGEST,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V7_APPROVAL_RECORD_CANDIDATE_IDENTITY,
}), Object.freeze({
  executable_source_digest: historicalV7.executable_source_digest,
  authorization_digest: historicalV7.authorization_digest,
  plan_digest: historicalV7.plan_digest,
  run_identity: historicalV7.run_identity,
  attempt_identity: historicalV7.attempt_identity,
  execution_descriptor_digest: historicalV7.execution_descriptor_digest,
  external_plan_identity_digest: historicalV7.external_plan_identity_digest,
  approval_candidate_identity: historicalV7.approval_candidate_identity,
}), "all exported V7 identities are pinned to exact historical repository authority bytes");

const registry = approvalRegistry([historicalV7, approval]);
materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(repositoryRoot, registry);
assert.deepEqual(loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
  repository_root: repositoryRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => observedAt }),
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
}), approval);
assert.equal(registry.records.length, 2);
assert.equal(selectV8(
  historicalRepositoryRegistry, observedAt), null);
assert.deepEqual(selectV8(registry, observedAt),
  approval);
assert.equal(selectV8(
  approvalRegistry([historicalV7, approval, approval]), observedAt), null);
const conflictingV8 = rehash({ ...approval,
  approval_reference: "product-owner/day150/v8/conflicting" });
assert.equal(selectV8(
  approvalRegistry([historicalV7, approval, conflictingV8]), observedAt), null);
for (const [field, value] of [
  ["executable_source_digest", `sha256:${"0".repeat(64)}`],
  ["gate17_scope_digest", `sha256:${"1".repeat(64)}`],
  ["proposal_identity", `sha256:${"2".repeat(64)}`],
] as const) assert.equal(selectV8(
  approvalRegistry([historicalV7, rehash({ ...approval, [field]: value })]), observedAt), null,
field);
const unrelatedHistoricalV6 = rehash({ ...historicalV7,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
  authorization_revision: 6,
  approval_reference: "product-owner/day150/v6/unrelated-historical",
}, 1);
assert.ok(parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(unrelatedHistoricalV6));
assert.deepEqual(selectV8(
  approvalRegistry([historicalV7, unrelatedHistoricalV6, approval]), observedAt), approval);
for (const revision of [4, 5, 6] as const) {
  const olderHistorical = rehash({ ...historicalV7,
    execution_authorization_id: `DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V${revision}`,
    authorization_revision: revision,
    approval_reference: `product-owner/day150/v${revision}/unrelated-historical`,
  }, 1);
  assert.ok(parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(olderHistorical));
  assert.equal(selectV8(
    approvalRegistry([olderHistorical]), observedAt), null,
  `historical V${revision} cannot become active current authority`);
}
assert.equal(selectV8(
  approvalRegistry([historicalV7, { ...unrelatedHistoricalV6,
    approval_record_digest: `sha256:${"f".repeat(64)}` }, approval]), observedAt), null,
"malformed historical evidence fails the complete registry closed");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT.invocation_count, 1);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT.retry_allowed,
  false);
for (const field of ["gate17_scope_digest", "executable_source_digest", "authorization_digest",
  "plan_digest", "run_identity", "attempt_identity", "external_plan_identity_digest",
  "proposal_identity", "proposal_created_at", "approval_reference", "approved_at"] as const) {
  const value: string = approval[field];
  const mutated: string = value.startsWith("sha256:")
    ? `sha256:${value[7] === "0" ? "1" : "0"}${value.slice(8)}`
    : field.endsWith("_at") ? "2026-08-16T11:00:30.000Z" : `${value}-mutated`;
  assert.equal(selectV8({
    ...registry, records: [historicalV7, { ...approval, [field]: mutated }],
  }, observedAt), null, field);
}
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE.authorization_revision,
  8);
process.stdout.write(`${JSON.stringify({
  status: "DAY150_PREFIX_REFERENCE_V8_REPOSITORY_SOT_QUALIFIED",
  authorization_revision: qualificationProposal.authorization_revision,
  gate17_scope_digest: qualificationProposal.gate17_scope_digest,
  approval_schema: approval.schema_version,
  approval_revision: approval.approval_record_revision,
  repository_materialization: "ACTUAL_PATH_BYTES_LOADER_SELECTOR",
  registry_record_count: registry.records.length,
  historical_v7_selectable: false,
  approval_mutation_rejections: 11,
  docker_mutations: 0,
  postgres_operations: 0,
  migration_operations: 0,
})}\n`);
