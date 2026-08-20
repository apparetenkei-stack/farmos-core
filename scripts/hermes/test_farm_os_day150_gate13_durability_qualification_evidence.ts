import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY,
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS,
  computeFarmOsDay150Gate13DurabilityEvidenceDigest,
  computeFarmOsDay150Gate13ImplementationIdentityDigest,
  createFarmOsDay150Gate13D5RecoveryEvidence,
  createFarmOsDay150Gate13QualificationCaseResults,
  createFarmOsDay150Gate13QualificationResult,
  parseFarmOsDay150Gate13DurabilityEvidence,
  publishFarmOsDay150Gate13DurabilityEvidence,
  publishFarmOsDay150Gate13QualificationResult,
  validateFarmOsDay150Gate13DurabilityEvidenceLineage,
  type FarmOsDay150Gate13DurabilityEvidence,
} from "../../src/lib/hermes/farm_os_day150_gate13_durability_qualification_evidence";
import {
  claimFarmOsDay150Gate13FourthAttempt,
  createFarmOsDay150Gate13FourthAttemptAuthority,
  publishFarmOsDay150Gate13FourthAttemptTerminal,
  type FarmOsDay150Gate13DurableArtifactPort,
} from "../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";
import {
  FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS,
  createFarmOsDay150Gate13FourthExecutionSnapshot,
  createFarmOsDay150Gate13SourceSetManifest,
  publishFarmOsDay150Gate13FourthExecutionSnapshot,
} from "../../src/lib/hermes/farm_os_day150_gate13_qualification_source_set";
import { FarmOsDay150DurablePublicationError } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";
import {
  FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS,
  createFarmOsDay150Gate13FiniteExecutedCaseResult,
} from "./lib/farm_os_day150_gate13_finite_acceptance_qualification";

const D = (character: string) => `sha256:${character.repeat(64)}` as `sha256:${string}`;
const sourceDigest = D("a");
const startedAt = "2026-08-20T12:00:00.000Z";
const completedAt = "2026-08-20T12:10:00.000Z";
const d5RecoveryResult = createFarmOsDay150Gate13D5RecoveryEvidence({
  schema_version: "farmos.day150-gate13-d5-history-recovery-result.v1",
  case_id: "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK",
  database_identity_digest: D("9"), initial_durable_state: "ATTEMPT_STARTED",
  simulated_failure_recovery_boundary: "FINALIZATION_COMMIT_ACK_LOSS",
  authoritative_readback_result: "OUTCOME_UNKNOWN",
  recovery_action: "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN",
  recovery_result: "TERMINAL_HISTORY_PRESERVED", resulting_terminal_state: "OUTCOME_UNKNOWN",
  history_preserved: true, lifecycle_row_count: 1, receipt_row_count: 1,
  qualification_rerun_count: 0,
});
const finiteExecutedCaseResults = FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS.map(
  (case_id, index) => createFarmOsDay150Gate13FiniteExecutedCaseResult({ case_id,
    storage_identity_digest: `sha256:${(index + 1).toString(16).padStart(64, "0")}` }),
);

async function fixture(root: string, terminalResult: "QUALIFICATION_SUCCESS" |
"QUALIFICATION_FAILED" = "QUALIFICATION_SUCCESS") {
  const manifest = createFarmOsDay150Gate13SourceSetManifest(
    FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS.map(([path, role]) => ({ path, role,
      content_sha256: D("a") })));
  const snapshot = await publishFarmOsDay150Gate13FourthExecutionSnapshot({
    repository_root: root,
    snapshot: createFarmOsDay150Gate13FourthExecutionSnapshot(manifest),
  });
  const authority = createFarmOsDay150Gate13FourthAttemptAuthority({
    source_set_digest: manifest.qualification_source_set_digest,
    execution_snapshot_digest: snapshot.execution_snapshot_digest,
  });
  const claim = await claimFarmOsDay150Gate13FourthAttempt({ repository_root: root, authority,
    claimed_at: startedAt });
  const implementation = Object.freeze({
    persistence_port_version: "farmos.production-target-execution-persistence-port.v1" as const,
    postgres_schema_version: "farmos.production-target-execution-postgres-schema.v1" as const,
    migration_id: "202608110001_production_target_execution_durability" as const,
    migration_sha256: D("c"), repository_source_sha256: D("d"),
    qualification_source_sha256: D("e"), postgres_major: 17 as const,
    image: `docker.io/library/postgres@sha256:${"f".repeat(64)}` as const,
    platform: "linux/arm64/v8" as const,
  });
  const result = await publishFarmOsDay150Gate13QualificationResult({ repository_root: root,
    result: createFarmOsDay150Gate13QualificationResult({ attempt_identity: claim.attempt_identity,
      claim_digest: claim.claim_digest, qualification_source_set_digest: claim.source_set_digest,
      execution_snapshot_digest: claim.execution_snapshot_digest,
      implementation_identity_digest:
        computeFarmOsDay150Gate13ImplementationIdentityDigest(implementation),
      platform: "linux/arm64/v8",
      case_results: createFarmOsDay150Gate13QualificationCaseResults(
        FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS),
      finite_executed_case_results: finiteExecutedCaseResults,
      case_counts: { required: 31, executed: 31, validated: 31 },
      finite_case_counts: { required: 18, executed: 18, validated: 18 },
      d5_recovery_result: d5RecoveryResult,
      cleanup_zero_residual: true, started_at: startedAt, completed_at: completedAt }) });
  const terminal = await publishFarmOsDay150Gate13FourthAttemptTerminal({ repository_root: root,
    claim, qualification_result: terminalResult,
    qualification_result_digest: result.qualification_result_digest,
    failure_boundary: terminalResult === "QUALIFICATION_SUCCESS" ? null : "TEST_FAILURE",
    zero_residual: true, completed_at: completedAt });
  const material = Object.freeze({
    schema_version: FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION,
    authority_id: FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY,
    authority_revision: 1 as const,
    evidence_classification: "DAY150_GATE13_ISOLATED_STORAGE_QUALIFICATION_EVIDENCE" as const,
    qualification_scope: "DAY150_GATE2_GATE13_ONLY" as const,
    qualification_source_set_digest: claim.source_set_digest,
    execution_snapshot_digest: claim.execution_snapshot_digest,
    qualification_result_digest: result.qualification_result_digest,
    case_results: result.case_results,
    finite_executed_case_results: finiteExecutedCaseResults,
    case_counts: { required: 31 as const, executed: 31 as const, validated: 31 as const,
      evidence: 31 as const },
    finite_case_counts: { required: 18 as const, executed: 18 as const, validated: 18 as const },
    d5_recovery_result: d5RecoveryResult,
    durability_matrix: Object.freeze({ D1: "PASS" as const, D2: "PASS" as const,
      D3: "PASS" as const, D4: "PASS" as const, D5: "PASS" as const }),
    implementation,
    isolated_storage: Object.freeze({ class: "DISPOSABLE_LOCAL_POSTGRESQL_VOLUME" as const,
      identity_digest: D("1"), database_count: 21 as const, production: false as const,
      canonical: false as const, authoritative_root_access: false as const }),
    attempt_authority: Object.freeze({ attempt_identity: claim.attempt_identity,
      claim_digest: claim.claim_digest, terminal_digest: terminal.terminal_digest,
      execution_snapshot_digest: claim.execution_snapshot_digest,
      attempt_consumed: true as const, attempt_ordinal: 4 as const,
      automatic_retry_count: 0 as const, fifth_attempt_authorized: false as const }),
    approval_sot: Object.freeze({ exact_write: "PASS" as const, exact_readback: "PASS" as const,
      canonical_parser: "PASS" as const, canonical_digest: "PASS" as const,
      duplicate_identical: "EXISTING_IDENTICAL" as const,
      conflicting_approval: "FAIL_CLOSED" as const,
      revocation_append_and_readback: "PASS" as const,
      fresh_process_reconstruction: "PASS" as const, process_memory_authority: false as const }),
    command_receipt_lineage: Object.freeze({ command_write_readback: "PASS" as const,
      reservation_lineage: "PASS" as const, attempt_lineage: "PASS" as const,
      terminal_receipt_lineage: "PASS" as const, fresh_process_reconstruction: "PASS" as const,
      automatic_retry_count: 0 as const }),
    concurrency: Object.freeze({ contenders: 2 as const, durable_winners: 1 as const,
      durable_reservation_rows: 1 as const, losing_contender: "FAIL_CLOSED" as const,
      replay_after_restart: "REJECTED" as const, split_brain: false as const }),
    crash_ack_loss_restart: Object.freeze({
      before_durable_write: "ABSENT_AFTER_TRUSTED_READBACK" as const,
      commit_ack_loss: "OUTCOME_UNKNOWN_PRESERVED" as const,
      after_durable_write_before_ack: "DURABLE_STATE_RECONSTRUCTED" as const,
      attempt_ack_loss: "OUTCOME_UNKNOWN_PRESERVED" as const, container_restart: "PASS" as const,
      fresh_process_restart: "PASS" as const, conflicting_state_after_restart: "FAIL_CLOSED" as const }),
    cleanup: Object.freeze({ container: "ABSENT" as const, network: "ABSENT" as const,
      volume: "ABSENT" as const, zero_residual: true as const,
      unrelated_resources_touched: 0 as const }),
    operation_counts: Object.freeze({ qualification_docker_runs: 1 as const,
      isolated_migration_applications: 21 as const, production: 0 as const,
      canonical: 0 as const, b2: 0 as const, formal_gate2: 0 as const }),
    started_at: startedAt, completed_at: completedAt,
  });
  const evidence: FarmOsDay150Gate13DurabilityEvidence = Object.freeze({ ...material,
    evidence_digest: computeFarmOsDay150Gate13DurabilityEvidenceDigest(material) });
  return { evidence, claim, terminal, result };
}

const root = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-evidence-"));
const missingRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-evidence-missing-"));
const failedRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-evidence-failed-"));
try {
  const { evidence } = await fixture(root);
  assert.ok(parseFarmOsDay150Gate13DurabilityEvidence(evidence));
  assert.ok(await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: root, evidence }));
  assert.equal(await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: missingRoot, evidence }), null);
  const wrongClaimMaterial = { ...evidence, attempt_authority: { ...evidence.attempt_authority,
    claim_digest: D("9") } };
  const { evidence_digest: _ignored, ...wrongClaimBody } = wrongClaimMaterial;
  const wrongClaim = { ...wrongClaimBody,
    evidence_digest: computeFarmOsDay150Gate13DurabilityEvidenceDigest(wrongClaimBody) };
  assert.equal(await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: root, evidence: wrongClaim }), null);
  const failed = await fixture(failedRoot, "QUALIFICATION_FAILED");
  assert.equal(await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: failedRoot, evidence: failed.evidence }), null);
  for (const mutation of [
    { ...evidence, qualification_source_set_digest: D("8") },
    { ...evidence, case_results: evidence.case_results.slice(1) },
    { ...evidence, case_results: evidence.case_results.map((entry, index) => index === 0
      ? { ...entry, accepted_result: "FAIL" } : entry) },
    { ...evidence, finite_executed_case_results:
      evidence.finite_executed_case_results.slice(0, -1) },
    { ...evidence, finite_executed_case_results: [...evidence.finite_executed_case_results,
      evidence.finite_executed_case_results[0]!] },
    { ...evidence, d5_recovery_result: { ...evidence.d5_recovery_result,
      history_preserved: false } },
    { ...evidence, finite_case_counts: { ...evidence.finite_case_counts, executed: 17 } },
    { ...evidence, durability_matrix: { ...evidence.durability_matrix, D4: "FAIL" } },
  ]) assert.equal(parseFarmOsDay150Gate13DurabilityEvidence(mutation), null);

  let weakArtifact: unknown = null;
  const weakStore: FarmOsDay150Gate13DurableArtifactPort = {
    async publishExclusive(_path, value) { weakArtifact = value; },
    async reconcileDurability() { throw new FarmOsDay150DurablePublicationError("OUTCOME_UNKNOWN"); },
    async reopen() { return weakArtifact; },
  };
  await assert.rejects(publishFarmOsDay150Gate13DurabilityEvidence({ repository_root: root,
    evidence, durable_store: weakStore }), /OUTCOME_UNKNOWN/u);
  const published = await publishFarmOsDay150Gate13DurabilityEvidence({ repository_root: root,
    evidence });
  assert.deepEqual(published, evidence);
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(missingRoot, { recursive: true, force: true });
  rmSync(failedRoot, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ status: "PASS",
  exact_cases: FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.length,
  missing_or_wrong_claim_rejected: true, missing_or_non_success_terminal_rejected: true,
  source_set_mismatch_rejected: true, missing_or_false_result_rejected: true,
  durable_pass_publication: true, weak_publication_rejected: true })}\n`);
