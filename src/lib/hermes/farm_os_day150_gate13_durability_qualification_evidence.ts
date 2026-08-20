import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  canonicalFarmOsDay150Json,
  publishCanonicalFarmOsDay150ArtifactExclusive,
  reconcileCanonicalFarmOsDay150ArtifactDurability,
  reopenCanonicalFarmOsDay150Artifact,
} from "./farm_os_day150_prefix_reference_durable_store";
import {
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH,
  parseFarmOsDay150Gate13FourthAttemptClaim,
  parseFarmOsDay150Gate13FourthAttemptTerminal,
  type FarmOsDay150Gate13DurableArtifactPort,
} from "./farm_os_day150_gate13_third_attempt_authority";
import {
  FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH,
  parseFarmOsDay150Gate13FourthExecutionSnapshot,
} from "./farm_os_day150_gate13_qualification_source_set";

export const FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION =
  "farmos.day150-gate13-isolated-durability-qualification-evidence.v1" as const;
export const FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY =
  "DAY150_GATE13_ISOLATED_DURABILITY_QUALIFICATION_AUTHORITY_V1" as const;
export const FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/isolated-storage-backed-durability-evidence.json" as const;
export const FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA =
  "farmos.day150-gate13-qualification-result.v1" as const;
export const FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/fourth-real-attempt-qualification-result.json" as const;

export const FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS = Object.freeze([
  "DURABLE_APPROVAL_WRITE_READBACK", "DUPLICATE_AND_CONFLICT",
  "APPROVAL_COMMAND_RECEIPT_LINEAGE", "STORAGE_BACKED_CONCURRENCY",
  "CRASH_BEFORE_WRITE", "AMBIGUOUS_PUBLICATION", "ACK_LOSS", "RESTART",
  "STALE_ENDPOINT_PREVENTION", "REPLAY_REJECTION", "PROCESS_LOSS_RECONSTRUCTION",
  "EXACT_CLEANUP", "ZERO_RESIDUAL",
  "D1_CANONICAL_DURABLE_LINEAGE",
  "D2_ONE_DURABLE_WINNER_REPLAY_REJECTED",
  "D3_RESERVATION_STALE_REJECTED", "D3_RESERVATION_EXPIRED_REJECTED",
  "D3_RESERVATION_REVOKED_REJECTED", "D3_ATTEMPT_START_STALE_REJECTED",
  "D3_ATTEMPT_START_EXPIRED_REJECTED", "D3_ATTEMPT_START_REVOKED_REJECTED",
  "D3_CLOCK_REGRESSION_REJECTED", "D3_DEPENDENCY_MISMATCH_REJECTED",
  "D4_SUCCESS_ATOMIC_RECEIPT", "D4_FAILURE_ATOMIC_RECEIPT",
  "D4_BEFORE_TERMINAL_WRITE_ROLLS_BACK",
  "D4_AFTER_MUTATION_BEFORE_COMMIT_ROLLS_BACK",
  "D4_RECEIPT_APPEND_FAILURE_ROLLS_BACK", "D4_COMMIT_ACK_AMBIGUITY_READBACK",
  "D4_OUTCOME_UNKNOWN_DISTINCT", "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK",
] as const);
export const FARM_OS_DAY150_GATE13_FINITE_CASE_IDS = Object.freeze(
  FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.filter((caseId) => /^D[1-5]_/u.test(caseId)),
);
export type FarmOsDay150Gate13CaseResult = Readonly<{
  case_id: typeof FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS[number];
  accepted_result: "PASS";
  result_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FiniteExecutedCaseEvidence = Readonly<{
  case_id: typeof FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS[number];
  accepted_result: "PASS";
  storage_identity_digest: `sha256:${string}`;
  result_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13D5RecoveryEvidence = Readonly<{
  schema_version: "farmos.day150-gate13-d5-history-recovery-result.v1";
  case_id: "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK";
  database_identity_digest: `sha256:${string}`;
  initial_durable_state: "ATTEMPT_STARTED";
  simulated_failure_recovery_boundary: "FINALIZATION_COMMIT_ACK_LOSS";
  authoritative_readback_result: "OUTCOME_UNKNOWN";
  recovery_action: "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN";
  recovery_result: "TERMINAL_HISTORY_PRESERVED";
  resulting_terminal_state: "OUTCOME_UNKNOWN";
  history_preserved: true;
  lifecycle_row_count: 1;
  receipt_row_count: 1;
  qualification_rerun_count: 0;
  result_digest: `sha256:${string}`;
}>;
type FarmOsDay150Gate13FiniteCaseCounts = Readonly<{
  required: 18; executed: 18; validated: 18;
}>;
type FarmOsDay150Gate13FullCaseCounts = Readonly<{
  required: 31; executed: 31; validated: 31;
}>;
export type FarmOsDay150Gate13QualificationResult = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA;
  attempt_identity: `sha256:${string}`;
  claim_digest: `sha256:${string}`;
  qualification_source_set_digest: `sha256:${string}`;
  execution_snapshot_digest: `sha256:${string}`;
  implementation_identity_digest: `sha256:${string}`;
  platform: "linux/arm64/v8" | "linux/amd64";
  case_results: readonly FarmOsDay150Gate13CaseResult[];
  finite_executed_case_results: readonly FarmOsDay150Gate13FiniteExecutedCaseEvidence[];
  case_counts: FarmOsDay150Gate13FullCaseCounts;
  finite_case_counts: FarmOsDay150Gate13FiniteCaseCounts;
  d5_recovery_result: FarmOsDay150Gate13D5RecoveryEvidence;
  cleanup_zero_residual: true;
  started_at: string;
  completed_at: string;
  qualification_result_digest: `sha256:${string}`;
}>;

export type FarmOsDay150Gate13DurabilityEvidence = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION;
  authority_id: typeof FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY;
  authority_revision: 1;
  evidence_classification: "DAY150_GATE13_ISOLATED_STORAGE_QUALIFICATION_EVIDENCE";
  qualification_scope: "DAY150_GATE2_GATE13_ONLY";
  qualification_source_set_digest: `sha256:${string}`;
  execution_snapshot_digest: `sha256:${string}`;
  qualification_result_digest: `sha256:${string}`;
  case_results: readonly FarmOsDay150Gate13CaseResult[];
  finite_executed_case_results: readonly FarmOsDay150Gate13FiniteExecutedCaseEvidence[];
  case_counts: Readonly<{ required: 31; executed: 31; validated: 31; evidence: 31 }>;
  finite_case_counts: FarmOsDay150Gate13FiniteCaseCounts;
  d5_recovery_result: FarmOsDay150Gate13D5RecoveryEvidence;
  durability_matrix: Readonly<{
    D1: "PASS"; D2: "PASS"; D3: "PASS"; D4: "PASS"; D5: "PASS";
  }>;
  implementation: Readonly<{
    persistence_port_version: "farmos.production-target-execution-persistence-port.v1";
    postgres_schema_version: "farmos.production-target-execution-postgres-schema.v1";
    migration_id: "202608110001_production_target_execution_durability";
    migration_sha256: `sha256:${string}`;
    repository_source_sha256: `sha256:${string}`;
    qualification_source_sha256: `sha256:${string}`;
    postgres_major: 17;
    image: `docker.io/library/postgres@sha256:${string}`;
    platform: "linux/arm64/v8" | "linux/amd64";
  }>;
  isolated_storage: Readonly<{
    class: "DISPOSABLE_LOCAL_POSTGRESQL_VOLUME";
    identity_digest: `sha256:${string}`;
    database_count: 21;
    production: false;
    canonical: false;
    authoritative_root_access: false;
  }>;
  attempt_authority: Readonly<{
    attempt_identity: `sha256:${string}`;
    claim_digest: `sha256:${string}`;
    terminal_digest: `sha256:${string}`;
    execution_snapshot_digest: `sha256:${string}`;
    attempt_consumed: true;
    attempt_ordinal: 4;
    automatic_retry_count: 0;
    fifth_attempt_authorized: false;
  }>;
  approval_sot: Readonly<{
    exact_write: "PASS";
    exact_readback: "PASS";
    canonical_parser: "PASS";
    canonical_digest: "PASS";
    duplicate_identical: "EXISTING_IDENTICAL";
    conflicting_approval: "FAIL_CLOSED";
    revocation_append_and_readback: "PASS";
    fresh_process_reconstruction: "PASS";
    process_memory_authority: false;
  }>;
  command_receipt_lineage: Readonly<{
    command_write_readback: "PASS";
    reservation_lineage: "PASS";
    attempt_lineage: "PASS";
    terminal_receipt_lineage: "PASS";
    fresh_process_reconstruction: "PASS";
    automatic_retry_count: 0;
  }>;
  concurrency: Readonly<{
    contenders: 2;
    durable_winners: 1;
    durable_reservation_rows: 1;
    losing_contender: "FAIL_CLOSED";
    replay_after_restart: "REJECTED";
    split_brain: false;
  }>;
  crash_ack_loss_restart: Readonly<{
    before_durable_write: "ABSENT_AFTER_TRUSTED_READBACK";
    commit_ack_loss: "OUTCOME_UNKNOWN_PRESERVED";
    after_durable_write_before_ack: "DURABLE_STATE_RECONSTRUCTED";
    attempt_ack_loss: "OUTCOME_UNKNOWN_PRESERVED";
    container_restart: "PASS";
    fresh_process_restart: "PASS";
    conflicting_state_after_restart: "FAIL_CLOSED";
  }>;
  cleanup: Readonly<{
    container: "ABSENT";
    network: "ABSENT";
    volume: "ABSENT";
    zero_residual: true;
    unrelated_resources_touched: 0;
  }>;
  operation_counts: Readonly<{
    qualification_docker_runs: 1;
    isolated_migration_applications: 21;
    production: 0;
    canonical: 0;
    b2: 0;
    formal_gate2: 0;
  }>;
  started_at: string;
  completed_at: string;
  evidence_digest: `sha256:${string}`;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
const exactIso = (value: unknown): value is string => typeof value === "string" &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(",")}}`;
}

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\0${canonical(value)}`, "utf8").digest("hex")}`;
export function createFarmOsDay150Gate13D5RecoveryEvidence(input: Omit<
  FarmOsDay150Gate13D5RecoveryEvidence, "result_digest"
>): FarmOsDay150Gate13D5RecoveryEvidence {
  return Object.freeze({ ...input, result_digest: hash(
    "farmos.day150-gate13-d5-history-recovery-result.v1", input) });
}
export function parseFarmOsDay150Gate13D5RecoveryEvidence(
  value: unknown,
): FarmOsDay150Gate13D5RecoveryEvidence | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "case_id",
    "database_identity_digest", "initial_durable_state", "simulated_failure_recovery_boundary",
    "authoritative_readback_result", "recovery_action", "recovery_result",
    "resulting_terminal_state", "history_preserved", "lifecycle_row_count",
    "receipt_row_count", "qualification_rerun_count", "result_digest"])) return null;
  const { result_digest: supplied, ...body } = value;
  return value.schema_version === "farmos.day150-gate13-d5-history-recovery-result.v1" &&
    value.case_id === "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK" &&
    DIGEST.test(String(value.database_identity_digest)) &&
    value.initial_durable_state === "ATTEMPT_STARTED" &&
    value.simulated_failure_recovery_boundary === "FINALIZATION_COMMIT_ACK_LOSS" &&
    value.authoritative_readback_result === "OUTCOME_UNKNOWN" && value.recovery_action ===
      "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN" && value.recovery_result ===
      "TERMINAL_HISTORY_PRESERVED" && value.resulting_terminal_state === "OUTCOME_UNKNOWN" &&
    value.history_preserved === true && value.lifecycle_row_count === 1 &&
    value.receipt_row_count === 1 && value.qualification_rerun_count === 0 && supplied === hash(
      "farmos.day150-gate13-d5-history-recovery-result.v1", body)
    ? Object.freeze(value as FarmOsDay150Gate13D5RecoveryEvidence) : null;
}
export const computeFarmOsDay150Gate13ImplementationIdentityDigest =
  (value: FarmOsDay150Gate13DurabilityEvidence["implementation"]): `sha256:${string}` =>
    hash("farmos.day150-gate13-implementation-identity.v1", value);
const exactCaseResults = (value: unknown): value is readonly FarmOsDay150Gate13CaseResult[] => {
  if (!Array.isArray(value) || value.length !== FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.length) {
    return false;
  }
  const expected = [...FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS].sort();
  const actual = value.map((entry) => record(entry) && typeof entry.case_id === "string"
    ? entry.case_id : "").sort();
  return actual.every((id, index) => id === expected[index]) && value.every((entry) => {
    if (!record(entry) || !exactKeys(entry, ["case_id", "accepted_result", "result_digest"]) ||
      entry.accepted_result !== "PASS" ||
      !FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.includes(entry.case_id as never)) return false;
    return entry.result_digest === hash("farmos.day150-gate13-case-result.v1", {
      case_id: entry.case_id, accepted_result: entry.accepted_result });
  });
};

const exactFiniteExecutedCaseResults = (
  value: unknown,
): value is readonly FarmOsDay150Gate13FiniteExecutedCaseEvidence[] => {
  if (!Array.isArray(value) || value.length !== FARM_OS_DAY150_GATE13_FINITE_CASE_IDS.length) {
    return false;
  }
  const expected = [...FARM_OS_DAY150_GATE13_FINITE_CASE_IDS].sort();
  const actual = value.map((entry) => record(entry) && typeof entry.case_id === "string"
    ? entry.case_id : "").sort();
  return actual.every((caseId, index) => caseId === expected[index]) && value.every((entry) => {
    if (!record(entry) || !exactKeys(entry, ["case_id", "accepted_result",
      "storage_identity_digest", "result_digest"]) || entry.accepted_result !== "PASS" ||
      !FARM_OS_DAY150_GATE13_FINITE_CASE_IDS.includes(entry.case_id as never) ||
      !DIGEST.test(String(entry.storage_identity_digest))) return false;
    return entry.result_digest === hash("farmos.day150-gate13-finite-executed-case-result.v1", {
      case_id: entry.case_id, accepted_result: entry.accepted_result,
      storage_identity_digest: entry.storage_identity_digest });
  });
};

export function deriveFarmOsDay150Gate13DurabilityMatrix(input: Readonly<{
  case_results: readonly FarmOsDay150Gate13CaseResult[];
  finite_executed_case_results: readonly FarmOsDay150Gate13FiniteExecutedCaseEvidence[];
  d5_recovery_result: unknown;
}>): Readonly<Record<"D1" | "D2" | "D3" | "D4" | "D5", "PASS" | "FAIL">> {
  const fullAccepted = exactCaseResults(input.case_results);
  const accepted = exactFiniteExecutedCaseResults(input.finite_executed_case_results)
    ? new Set(input.finite_executed_case_results.map((entry) => entry.case_id)) : new Set<string>();
  const matrix = Object.fromEntries(["D1", "D2", "D3", "D4", "D5"].map((property) => {
    const required = FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.filter((caseId) =>
      caseId.startsWith(`${property}_`));
    const d5Observed = property !== "D5" ||
      parseFarmOsDay150Gate13D5RecoveryEvidence(input.d5_recovery_result) !== null;
    return [property, fullAccepted && required.every((caseId) => accepted.has(caseId)) && d5Observed
      ? "PASS" : "FAIL"];
  })) as Record<"D1" | "D2" | "D3" | "D4" | "D5", "PASS" | "FAIL">;
  return Object.freeze(matrix);
}

export function createFarmOsDay150Gate13QualificationCaseResults(
  acceptedCaseIds: readonly typeof FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS[number][],
):
readonly FarmOsDay150Gate13CaseResult[] {
  const accepted = new Set(acceptedCaseIds);
  if (accepted.size !== FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.length ||
    FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.some((caseId) => !accepted.has(caseId))) {
    throw new Error("GATE13_QUALIFICATION_REQUIRED_CASE_NOT_PROVEN");
  }
  return Object.freeze(FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS.map((case_id) => Object.freeze({
    case_id, accepted_result: "PASS" as const, result_digest: hash(
      "farmos.day150-gate13-case-result.v1", { case_id, accepted_result: "PASS" }),
  })));
}

export function createFarmOsDay150Gate13QualificationResult(input: Omit<
  FarmOsDay150Gate13QualificationResult, "schema_version" | "qualification_result_digest"
>): FarmOsDay150Gate13QualificationResult {
  if (!exactCaseResults(input.case_results) ||
    !exactFiniteExecutedCaseResults(input.finite_executed_case_results) ||
    !DIGEST.test(input.attempt_identity) ||
    !DIGEST.test(input.claim_digest) || !DIGEST.test(input.qualification_source_set_digest) ||
    !DIGEST.test(input.execution_snapshot_digest) ||
    !DIGEST.test(input.implementation_identity_digest) || input.cleanup_zero_residual !== true ||
    canonical(input.case_counts) !== canonical({ required: 31, executed: 31, validated: 31 }) ||
    canonical(input.finite_case_counts) !== canonical({ required: 18, executed: 18,
      validated: 18 }) || !parseFarmOsDay150Gate13D5RecoveryEvidence(input.d5_recovery_result)) {
    throw new Error("GATE13_QUALIFICATION_RESULT_INPUT_INVALID");
  }
  const material = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA,
    ...input, case_results: Object.freeze([...input.case_results]) });
  return Object.freeze({ ...material, qualification_result_digest: hash(
    `${FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA}:result`, material) });
}

export function parseFarmOsDay150Gate13QualificationResult(
  value: unknown,
): FarmOsDay150Gate13QualificationResult | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "attempt_identity", "claim_digest",
    "qualification_source_set_digest", "execution_snapshot_digest",
    "implementation_identity_digest", "platform",
    "case_results", "finite_executed_case_results", "case_counts", "finite_case_counts",
    "d5_recovery_result",
    "cleanup_zero_residual", "started_at", "completed_at", "qualification_result_digest"]) ||
    value.schema_version !== FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA ||
    !DIGEST.test(String(value.attempt_identity)) || !DIGEST.test(String(value.claim_digest)) ||
    !DIGEST.test(String(value.qualification_source_set_digest)) ||
    !DIGEST.test(String(value.execution_snapshot_digest)) ||
    !DIGEST.test(String(value.implementation_identity_digest)) ||
    !["linux/arm64/v8", "linux/amd64"].includes(String(value.platform)) ||
    value.cleanup_zero_residual !== true || !exactCaseResults(value.case_results) ||
    !exactFiniteExecutedCaseResults(value.finite_executed_case_results) ||
    canonical(value.case_counts) !== canonical({ required: 31, executed: 31, validated: 31 }) ||
    canonical(value.finite_case_counts) !== canonical({ required: 18, executed: 18,
      validated: 18 }) || !parseFarmOsDay150Gate13D5RecoveryEvidence(value.d5_recovery_result) ||
    !exactIso(value.started_at) || !exactIso(value.completed_at) ||
    Date.parse(value.started_at) > Date.parse(value.completed_at)) return null;
  const { qualification_result_digest: supplied, ...material } = value;
  return DIGEST.test(String(supplied)) && supplied === hash(
    `${FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_SCHEMA}:result`, material)
    ? Object.freeze(value as FarmOsDay150Gate13QualificationResult) : null;
}

export async function publishFarmOsDay150Gate13QualificationResult(input: Readonly<{
  repository_root: string; result: FarmOsDay150Gate13QualificationResult;
}>): Promise<FarmOsDay150Gate13QualificationResult> {
  const path = resolve(input.repository_root, FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH);
  await publishCanonicalFarmOsDay150ArtifactExclusive(path, input.result);
  await reconcileCanonicalFarmOsDay150ArtifactDurability(path, input.result);
  const readback = parseFarmOsDay150Gate13QualificationResult(
    await reopenCanonicalFarmOsDay150Artifact(path));
  if (!readback || canonicalFarmOsDay150Json(readback) !== canonicalFarmOsDay150Json(input.result)) {
    throw new Error("GATE13_QUALIFICATION_RESULT_DURABLE_READBACK_FAILED");
  }
  return readback;
}

export function computeFarmOsDay150Gate13DurabilityEvidenceDigest(
  value: Omit<FarmOsDay150Gate13DurabilityEvidence, "evidence_digest">,
): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(
    `${FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION}\0${canonical(value)}`,
    "utf8",
  ).digest("hex")}`;
}

export function parseFarmOsDay150Gate13DurabilityEvidence(
  value: unknown,
): FarmOsDay150Gate13DurabilityEvidence | null {
  if (!record(value) || !record(value.implementation) || !record(value.isolated_storage) ||
    !record(value.attempt_authority) ||
    !record(value.durability_matrix) ||
    !record(value.case_counts) || !record(value.finite_case_counts) ||
    !record(value.d5_recovery_result) ||
    !record(value.approval_sot) || !record(value.command_receipt_lineage) ||
    !record(value.concurrency) || !record(value.crash_ack_loss_restart) ||
    !record(value.cleanup) || !record(value.operation_counts)) return null;
  const candidate = value as unknown as FarmOsDay150Gate13DurabilityEvidence;
  const { evidence_digest: supplied, ...material } = candidate;
  const digest = /^sha256:[a-f0-9]{64}$/u.test(String(supplied)) &&
    computeFarmOsDay150Gate13DurabilityEvidenceDigest(material) === supplied;
  const times = Number.isFinite(Date.parse(candidate.started_at)) &&
    Number.isFinite(Date.parse(candidate.completed_at)) &&
    new Date(candidate.started_at).toISOString() === candidate.started_at &&
    new Date(candidate.completed_at).toISOString() === candidate.completed_at &&
    Date.parse(candidate.started_at) <= Date.parse(candidate.completed_at);
  return candidate.schema_version === FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION &&
    candidate.authority_id === FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY &&
    candidate.authority_revision === 1 && candidate.qualification_scope ===
      "DAY150_GATE2_GATE13_ONLY" &&
    candidate.evidence_classification ===
      "DAY150_GATE13_ISOLATED_STORAGE_QUALIFICATION_EVIDENCE" &&
    DIGEST.test(candidate.qualification_source_set_digest) &&
    DIGEST.test(candidate.execution_snapshot_digest) &&
    DIGEST.test(candidate.qualification_result_digest) && exactCaseResults(candidate.case_results) &&
    exactFiniteExecutedCaseResults(candidate.finite_executed_case_results) &&
    canonical(candidate.case_counts) === canonical({ required: 31, executed: 31,
      validated: 31, evidence: 31 }) && canonical(candidate.finite_case_counts) === canonical({
      required: 18, executed: 18, validated: 18 }) &&
    parseFarmOsDay150Gate13D5RecoveryEvidence(candidate.d5_recovery_result) !== null &&
    exactKeys(candidate.durability_matrix, ["D1", "D2", "D3", "D4", "D5"]) &&
    canonical(candidate.durability_matrix) === canonical(deriveFarmOsDay150Gate13DurabilityMatrix({
      case_results: candidate.case_results,
      finite_executed_case_results: candidate.finite_executed_case_results,
      d5_recovery_result: candidate.d5_recovery_result })) &&
    Object.values(candidate.durability_matrix).every((result) => result === "PASS") &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.implementation.migration_sha256) &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.implementation.repository_source_sha256) &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.implementation.qualification_source_sha256) &&
    candidate.implementation.persistence_port_version ===
      "farmos.production-target-execution-persistence-port.v1" &&
    candidate.implementation.postgres_schema_version ===
      "farmos.production-target-execution-postgres-schema.v1" &&
    candidate.implementation.migration_id ===
      "202608110001_production_target_execution_durability" &&
    candidate.implementation.postgres_major === 17 &&
    /^docker\.io\/library\/postgres@sha256:[a-f0-9]{64}$/u.test(
      candidate.implementation.image) &&
    ["linux/arm64/v8", "linux/amd64"].includes(candidate.implementation.platform) &&
    candidate.isolated_storage.class === "DISPOSABLE_LOCAL_POSTGRESQL_VOLUME" &&
    candidate.isolated_storage.database_count === 21 &&
    candidate.isolated_storage.production === false &&
    candidate.isolated_storage.canonical === false &&
    candidate.isolated_storage.authoritative_root_access === false &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.attempt_authority.attempt_identity) &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.attempt_authority.claim_digest) &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.attempt_authority.terminal_digest) &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.attempt_authority.execution_snapshot_digest) &&
    candidate.attempt_authority.attempt_consumed === true &&
    candidate.attempt_authority.attempt_ordinal === 4 &&
    candidate.attempt_authority.automatic_retry_count === 0 &&
    candidate.attempt_authority.fifth_attempt_authorized === false &&
    candidate.approval_sot.exact_write === "PASS" &&
    candidate.approval_sot.exact_readback === "PASS" &&
    candidate.approval_sot.canonical_parser === "PASS" &&
    candidate.approval_sot.canonical_digest === "PASS" &&
    candidate.approval_sot.duplicate_identical === "EXISTING_IDENTICAL" &&
    candidate.approval_sot.conflicting_approval === "FAIL_CLOSED" &&
    candidate.approval_sot.revocation_append_and_readback === "PASS" &&
    candidate.approval_sot.fresh_process_reconstruction === "PASS" &&
    candidate.approval_sot.process_memory_authority === false &&
    candidate.command_receipt_lineage.command_write_readback === "PASS" &&
    candidate.command_receipt_lineage.reservation_lineage === "PASS" &&
    candidate.command_receipt_lineage.attempt_lineage === "PASS" &&
    candidate.command_receipt_lineage.terminal_receipt_lineage === "PASS" &&
    candidate.command_receipt_lineage.fresh_process_reconstruction === "PASS" &&
    candidate.command_receipt_lineage.automatic_retry_count === 0 &&
    candidate.concurrency.contenders === 2 && candidate.concurrency.durable_winners === 1 &&
    candidate.concurrency.durable_reservation_rows === 1 &&
    candidate.concurrency.losing_contender === "FAIL_CLOSED" &&
    candidate.concurrency.replay_after_restart === "REJECTED" &&
    candidate.concurrency.split_brain === false &&
    candidate.crash_ack_loss_restart.before_durable_write ===
      "ABSENT_AFTER_TRUSTED_READBACK" &&
    candidate.crash_ack_loss_restart.commit_ack_loss === "OUTCOME_UNKNOWN_PRESERVED" &&
    candidate.crash_ack_loss_restart.after_durable_write_before_ack ===
      "DURABLE_STATE_RECONSTRUCTED" &&
    candidate.crash_ack_loss_restart.attempt_ack_loss === "OUTCOME_UNKNOWN_PRESERVED" &&
    candidate.crash_ack_loss_restart.container_restart === "PASS" &&
    candidate.crash_ack_loss_restart.fresh_process_restart === "PASS" &&
    candidate.crash_ack_loss_restart.conflicting_state_after_restart === "FAIL_CLOSED" &&
    candidate.cleanup.container === "ABSENT" && candidate.cleanup.network === "ABSENT" &&
    candidate.cleanup.volume === "ABSENT" && candidate.cleanup.zero_residual === true &&
    candidate.cleanup.unrelated_resources_touched === 0 &&
    candidate.operation_counts.qualification_docker_runs === 1 &&
    candidate.operation_counts.isolated_migration_applications === 21 &&
    candidate.operation_counts.production === 0 && candidate.operation_counts.canonical === 0 &&
    candidate.operation_counts.b2 === 0 && candidate.operation_counts.formal_gate2 === 0 &&
    times && digest ? Object.freeze(candidate) : null;
}

export async function validateFarmOsDay150Gate13DurabilityEvidenceLineage(input: Readonly<{
  repository_root: string; evidence: unknown;
}>): Promise<FarmOsDay150Gate13DurabilityEvidence | null> {
  const evidence = parseFarmOsDay150Gate13DurabilityEvidence(input.evidence);
  if (!evidence) return null;
  try {
    const claimPath = resolve(input.repository_root, FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH);
    const terminalPath = resolve(input.repository_root,
      FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH);
    const snapshotPath = resolve(input.repository_root,
      FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH);
    const resultPath = resolve(input.repository_root, FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH);
    const claim = parseFarmOsDay150Gate13FourthAttemptClaim(
      await reopenCanonicalFarmOsDay150Artifact(claimPath));
    const terminal = parseFarmOsDay150Gate13FourthAttemptTerminal(
      await reopenCanonicalFarmOsDay150Artifact(terminalPath));
    const snapshot = parseFarmOsDay150Gate13FourthExecutionSnapshot(
      await reopenCanonicalFarmOsDay150Artifact(snapshotPath));
    const result = parseFarmOsDay150Gate13QualificationResult(
      await reopenCanonicalFarmOsDay150Artifact(resultPath));
    if (!claim || !terminal || !result || !snapshot) return null;
    await reconcileCanonicalFarmOsDay150ArtifactDurability(claimPath, claim);
    await reconcileCanonicalFarmOsDay150ArtifactDurability(terminalPath, terminal);
    await reconcileCanonicalFarmOsDay150ArtifactDurability(snapshotPath, snapshot);
    await reconcileCanonicalFarmOsDay150ArtifactDurability(resultPath, result);
    return claim.attempt_identity === evidence.attempt_authority.attempt_identity &&
      claim.claim_digest === evidence.attempt_authority.claim_digest &&
      claim.source_set_digest === evidence.qualification_source_set_digest &&
      claim.execution_snapshot_digest === evidence.execution_snapshot_digest &&
      snapshot.qualification_source_set_digest === claim.source_set_digest &&
      snapshot.execution_snapshot_digest === claim.execution_snapshot_digest &&
      terminal.attempt_identity === claim.attempt_identity &&
      terminal.claim_digest === claim.claim_digest &&
      terminal.source_set_digest === claim.source_set_digest &&
      terminal.execution_snapshot_digest === claim.execution_snapshot_digest &&
      terminal.qualification_result === "QUALIFICATION_SUCCESS" && terminal.zero_residual === true &&
      terminal.terminal_digest === evidence.attempt_authority.terminal_digest &&
      evidence.attempt_authority.execution_snapshot_digest === claim.execution_snapshot_digest &&
      terminal.qualification_result_digest === evidence.qualification_result_digest &&
      result.attempt_identity === claim.attempt_identity && result.claim_digest === claim.claim_digest &&
      result.qualification_source_set_digest === claim.source_set_digest &&
      result.execution_snapshot_digest === claim.execution_snapshot_digest &&
      result.qualification_result_digest === evidence.qualification_result_digest &&
      result.implementation_identity_digest ===
        computeFarmOsDay150Gate13ImplementationIdentityDigest(evidence.implementation) &&
      result.started_at === evidence.started_at && result.completed_at === evidence.completed_at &&
      canonical(result.case_results) === canonical(evidence.case_results) &&
      canonical(result.finite_executed_case_results) ===
        canonical(evidence.finite_executed_case_results) &&
      canonical(result.case_counts) === canonical({ required: evidence.case_counts.required,
        executed: evidence.case_counts.executed, validated: evidence.case_counts.validated }) &&
      canonical(result.finite_case_counts) === canonical(evidence.finite_case_counts) &&
      canonical(result.d5_recovery_result) === canonical(evidence.d5_recovery_result)
      ? evidence : null;
  } catch { return null; }
}

export async function publishFarmOsDay150Gate13DurabilityEvidence(input: Readonly<{
  repository_root: string; evidence: FarmOsDay150Gate13DurabilityEvidence;
  durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13DurabilityEvidence> {
  if (!await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: input.repository_root, evidence: input.evidence })) {
    throw new Error("GATE13_PASS_EVIDENCE_LINEAGE_INVALID");
  }
  const path = resolve(input.repository_root, FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH);
  const store = input.durable_store ?? Object.freeze({
    publishExclusive: publishCanonicalFarmOsDay150ArtifactExclusive,
    reconcileDurability: reconcileCanonicalFarmOsDay150ArtifactDurability,
    reopen: reopenCanonicalFarmOsDay150Artifact,
  });
  await store.publishExclusive(path, input.evidence);
  await store.reconcileDurability(path, input.evidence);
  const reopened = await store.reopen(path);
  const validated = await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
    repository_root: input.repository_root, evidence: reopened });
  if (!validated || canonicalFarmOsDay150Json(validated) !==
    canonicalFarmOsDay150Json(input.evidence)) {
    throw new Error("GATE13_PASS_EVIDENCE_DURABLE_READBACK_FAILED");
  }
  return validated;
}
