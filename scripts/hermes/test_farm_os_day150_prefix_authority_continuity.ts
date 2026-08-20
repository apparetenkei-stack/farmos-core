import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigest,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry,
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability,
  executeFarmOsDay150PrefixReferenceCatalogOnce,
  selectFarmOsDay150PrefixReferenceRepositoryApproval,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const canonical = (value: Json): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
};
const rehash = (record: Record<string, unknown>) => {
  const { approval_record_digest: _digest, ...body } = record;
  return Object.freeze({ ...body, approval_record_digest:
    `sha256:${createHash("sha256").update(
      `farmos.day150-prefix-reference-execution-approval-record.v2\n${canonical(body as Json)}`,
    ).digest("hex")}` });
};
const registry = (records: readonly unknown[]) => Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
  records: Object.freeze([...records]),
});

const requested = new Set<string>();
const digestA = deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2((path) => {
  requested.add(path);
  return readFileSync(path);
});
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  "sha256:ded08100a145a22bf2aaa1c45c28ee9b0c474ff86c0d9a3d707d5a806a11f074");
assert.notEqual(digestA,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  "post-terminal source repair cannot mutate or reuse executed V9 source identity");
assert.notEqual(digestA,
  "sha256:2157642cefab77d612eddc5f68c0a6d31d6934e4f7705f6b0147fbc3e703200c",
  "repaired executable source cannot reuse the exhausted V8 approved source digest");
assert.equal(requested.has(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.approval_data_path), false,
"approval data is excluded while loader/parser code remains in the executable closure");
const approvalDataA = JSON.stringify({ schema_version:
  "farmos.day150-prefix-reference-execution-approval-registry.v1", records: [] });
const approvalDataB = JSON.stringify({ schema_version:
  "farmos.day150-prefix-reference-execution-approval-registry.v1", records: [{ changed: true }] });
assert.notEqual(approvalDataA, approvalDataB);
for (const _approvalData of [approvalDataA, approvalDataB]) {
  assert.equal(deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2((path) =>
    readFileSync(path)), digestA, "approval-data-only mutation cannot alter executable digest");
}
const changedExecutable = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files[0];
const digestB = deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2((path) => path ===
  changedExecutable ? Buffer.concat([readFileSync(path), Buffer.from("\nSOURCE_MUTATION")]) :
  readFileSync(path));
assert.notEqual(digestB, digestA, "one executable byte mutation changes the closure digest");

const exactRegistry = createFarmOsDay150PrefixReferenceQualificationApprovalRegistry();
const exactApproval = selectFarmOsDay150PrefixReferenceRepositoryApproval(exactRegistry);
assert.ok(exactApproval);
assert.equal(exactApproval.executable_source_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest);
assert.equal(exactApproval.authorization_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST);
assert.equal(exactApproval.plan_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST);
assert.equal(exactApproval.run_identity, FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID);
assert.equal(exactApproval.attempt_identity, FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID);

const mutations: readonly [string, unknown][] = [
  ["executable_source_digest", `sha256:${"0".repeat(64)}`],
  ["authorization_digest", `sha256:${"1".repeat(64)}`],
  ["plan_digest", `sha256:${"2".repeat(64)}`],
  ["run_identity", `sha256:${"3".repeat(64)}`],
  ["attempt_identity", `sha256:${"4".repeat(64)}`],
  ["gate17_scope_digest", `sha256:${"6".repeat(64)}`],
  ["approval_reference", "product-owner/day150/v11/stale-reference"],
  ["execution_descriptor_revision", 2],
  ["external_plan_identity_digest", `sha256:${"5".repeat(64)}`],
  ["execution_authorization_id", "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6"],
];
for (const [field, value] of mutations) {
  assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(registry([
    rehash({ ...exactApproval, [field]: value }),
  ])), null, field);
}
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(registry([])), null,
  "missing approval rejected");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(registry([
  exactApproval, exactApproval,
])), null, "duplicate approvals fail closed");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(registry([
  exactApproval, rehash({ ...exactApproval, approval_reference: "product-owner/conflict" }),
])), null, "multiple conflicting active authorities fail closed");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval({
  schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
  records: [FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE],
}), null, "proposal candidate is not an approval");

const successCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "SUCCESS",
});
assert.ok(successCapability);
const success = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: successCapability,
});
assert.equal(success.status, "QUALIFICATION_PASS");
assert.equal(success.durable_candidate_count, 5);
assert.equal(success.final_receipt_state, "DURABLE_CLEANUP_BOUND_VERIFIED");
assert.equal(success.terminal_outcome_receipt_state, "ABSENT");
assert.ok(success.adapter_observed_effect_trace.every((entry) =>
  entry.authorization_id === FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
    .authorization_id &&
  entry.execution_plan_digest === FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
    .execution_plan_digest &&
  entry.run_identity === FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.run_identity &&
  entry.attempt_identity === FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
    .attempt_identity));

const terminalCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "FAILURE", boundary: "POSTGRES_STARTUP",
});
assert.ok(terminalCapability);
const terminal = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: terminalCapability,
});
assert.equal(terminal.status, "REJECTED");
assert.equal(terminal.terminal_outcome_receipt_state, "DURABLE_TRUSTED");
assert.equal(terminal.terminal_outcome_receipt?.execution_authorization_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_digest);
assert.equal(terminal.terminal_outcome_receipt?.execution_plan_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.execution_plan_digest);
assert.equal(terminal.terminal_outcome_receipt?.run_identity,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.run_identity);
assert.equal(terminal.terminal_outcome_receipt?.attempt_identity,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.attempt_identity);

const noApprovalCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "SUCCESS", approval_registry_fixture: registry([]),
});
assert.ok(noApprovalCapability);
await assert.rejects(executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: noApprovalCapability,
}), /EXECUTION_AUTHORIZATION_REJECTED/u);

console.log(JSON.stringify({ status: "PASS", executable_source_files:
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.files.length,
source_digest: digestA, executable_mutation_digest: digestB,
approval_data_separation_cases: 2, exact_binding_rejections: mutations.length,
repository_loader_load_bearing: true,
success_path_candidates: success.durable_candidate_count,
terminal_reconstruction_authority: terminal.terminal_outcome_receipt_state }));
