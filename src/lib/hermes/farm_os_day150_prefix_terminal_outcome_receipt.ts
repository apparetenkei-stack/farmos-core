import { createHash } from "node:crypto";

import { FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST } from
  "./farm_os_day150_gate17_scope_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA =
  "farmos.day150-prefix-reference-terminal-outcome-receipt.v1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID =
  "DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_V1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_REVISION =
  1 as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH =
  `${FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH =
  `${FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v7/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH =
  `${FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH =
  `${FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v7/reference-catalog-terminal-outcome-receipt.json" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_IMMUTABLE_TERMINAL_HISTORY = Object.freeze({
  authorization_digest:
    "sha256:ba779bf325c8d5a5c505f4b9f9d733a77c888d4d3610220a4af86494cc47c3fb",
  execution_plan_digest:
    "sha256:c470bf3042e9f6f94cab73c0ba33a0c38274b4431ceb1e270b0244cf3cb2108d",
  run_identity: "sha256:9b74b615dae04f11febd020db6c5f7004e9ca2f5705a61b06daae47f53bd1b3a",
  attempt_identity:
    "sha256:488f06a42fd070ab158ec7e228527e220104a0d213b6829550e9c66c32566fb6",
  attempt_claim_digest:
    "sha256:21a5f4c52ea729b2652ba812b4dee6d8b9b2b5de292cc8c83ebd223270f35a62",
  consumption_marker_digest:
    "sha256:b73bc98625854883dd3cae4e45c8ed305e41bcdd8f9efce59b6402204cabc542",
  execution_state: "CONSUMED_EXACTLY_ONCE" as const,
  historical_caller_classification: "OUTCOME_UNKNOWN" as const,
  external_disposable_state: "V5_EXTERNAL_RESOURCES_COMPENSATED" as const,
  retry: "FORBIDDEN" as const,
  terminal_outcome_receipt: "ABSENT_NON_RETROACTIVE" as const,
});

export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_CLASSIFICATIONS = Object.freeze([
  "TERMINAL_FAILURE",
  "OUTCOME_UNKNOWN",
  "COMPENSATED_TERMINAL_FAILURE",
] as const);
export type FarmOsDay150PrefixReferenceTerminalClassification =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_CLASSIFICATIONS[number];

export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_FAILURE_CODES = Object.freeze([
  "SOURCE_PRECONDITION_FAILED",
  "RESOURCE_SETUP_FAILED",
  "POSTGRES_STARTUP_FAILED",
  "POSTGRES_MAJOR_FAILED",
  "PRINCIPAL_INITIALIZATION_FAILED",
  "INITIAL_BOOTSTRAP_FAILED",
  "MIGRATION_FAILED",
  "CANDIDATE_PUBLICATION_FAILED",
  "PRE_CLEANUP_EVIDENCE_FAILED",
  "CLEANUP_FAILED",
  "ZERO_RESIDUAL_VERIFICATION_FAILED",
  "TERMINAL_RECEIPT_PUBLICATION_FAILED",
  "TERMINAL_RECEIPT_PUBLICATION_AMBIGUOUS",
  "CALLER_ACK_LOST",
  "BOUNDED_EXECUTION_FAILURE",
] as const);
export type FarmOsDay150PrefixReferenceTerminalFailureCode =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_FAILURE_CODES[number];

export const FARM_OS_DAY150_PREFIX_REFERENCE_LAST_TRUSTED_PHASES = Object.freeze([
  "ATTEMPT_CLAIM_DURABLE",
  "AUTHORIZATION_CONSUMED",
  "RESOURCE_SETUP_STARTED",
  "RESOURCE_SETUP_COMPLETED",
  "POSTGRES_READY",
  "POSTGRES_MAJOR_VERIFIED",
  "PRINCIPALS_INITIALIZED",
  "INITIAL_BOOTSTRAP_APPLIED",
  "TRUSTED_INITIAL_READBACK_COMPLETED",
  "MIGRATION_1_APPLIED", "MIGRATION_2_APPLIED", "MIGRATION_3_APPLIED",
  "MIGRATION_4_APPLIED", "MIGRATION_5_APPLIED",
  "CANDIDATE_1_DURABLE", "CANDIDATE_2_DURABLE", "CANDIDATE_3_DURABLE",
  "CANDIDATE_4_DURABLE", "CANDIDATE_5_DURABLE",
  "PRE_CLEANUP_EVIDENCE_DURABLE",
  "CLEANUP_STARTED",
  "ZERO_RESIDUAL_VERIFIED",
  "BEFORE_SUCCESS_RECEIPT",
] as const);
export type FarmOsDay150PrefixReferenceLastTrustedPhase =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_LAST_TRUSTED_PHASES[number];

export const FARM_OS_DAY150_PREFIX_REFERENCE_CLEANUP_STATES = Object.freeze([
  "NOT_STARTED", "PARTIAL", "COMPLETED", "AMBIGUOUS",
] as const);
export type FarmOsDay150PrefixReferenceCleanupState =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_CLEANUP_STATES[number];
export const FARM_OS_DAY150_PREFIX_REFERENCE_ZERO_RESIDUAL_STATES = Object.freeze([
  "NOT_VERIFIED", "VERIFIED", "AMBIGUOUS",
] as const);
export type FarmOsDay150PrefixReferenceZeroResidualState =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_ZERO_RESIDUAL_STATES[number];

type JsonRecord = Record<string, unknown>;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: JsonRecord, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!record(value)) throw new Error("NON_JSON");
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`).digest("hex")}`;
const owned = <T>(value: T): T => Object.freeze(structuredClone(value));

export type FarmOsDay150PrefixReferenceTerminalOutcomeReceipt = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA;
  authority_id: typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID;
  authority_revision:
    typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_REVISION;
  authority_state: "TERMINAL_NON_SUCCESS";
  execution_authorization_id: string;
  execution_authorization_revision: number;
  execution_authorization_digest: `sha256:${string}`;
  execution_plan_digest: `sha256:${string}`;
  run_identity: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  attempt_claim_digest: `sha256:${string}`;
  consumption_marker_digest: `sha256:${string}`;
  approval_reference: string;
  gate17_scope_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
  last_trusted_completed_phase: FarmOsDay150PrefixReferenceLastTrustedPhase;
  terminal_classification: FarmOsDay150PrefixReferenceTerminalClassification;
  terminal_failure_code: FarmOsDay150PrefixReferenceTerminalFailureCode;
  candidate_count: 0 | 1 | 2 | 3 | 4 | 5;
  candidate_identity_digests: readonly `sha256:${string}`[];
  pre_cleanup_evidence_state: "ABSENT" | "PRESENT";
  pre_cleanup_evidence_digest: `sha256:${string}` | null;
  cleanup_state: FarmOsDay150PrefixReferenceCleanupState;
  zero_residual_state: FarmOsDay150PrefixReferenceZeroResidualState;
  terminal_observation: Readonly<{
    authority: "EXISTING_BOUNDED_ORCHESTRATOR_OBSERVATION";
    classification: FarmOsDay150PrefixReferenceTerminalFailureCode;
    raw_output_persisted: false;
    credentials_persisted: false;
  }>;
  success_receipt_path: string;
  terminal_receipt_path: string;
  raw_catalog_values_persisted: false;
  credentials_persisted: false;
  receipt_digest: `sha256:${string}`;
}>;

type FarmOsDay150PrefixReferenceApprovalLineageKey =
  "approval_reference" | "gate17_scope_digest" | "approval_candidate_identity" | "proposal_identity" |
  "proposal_created_at" | "approved_at" | "approval_record_digest";
export type FarmOsDay150PrefixReferenceTerminalOutcomeReceiptInput = Readonly<Omit<
  FarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  "schema_version" | "authority_id" | "authority_revision" | "authority_state" |
  "raw_catalog_values_persisted" |
  "credentials_persisted" | "receipt_digest" | FarmOsDay150PrefixReferenceApprovalLineageKey
> & Partial<Pick<FarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  FarmOsDay150PrefixReferenceApprovalLineageKey>>>;

const RECEIPT_KEYS = Object.freeze([
  "schema_version", "authority_id", "authority_revision", "authority_state",
  "execution_authorization_id", "execution_authorization_revision",
  "execution_authorization_digest", "execution_plan_digest", "run_identity",
  "attempt_identity", "attempt_claim_digest", "consumption_marker_digest",
  "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "approval_record_digest",
  "last_trusted_completed_phase", "terminal_classification", "terminal_failure_code",
  "candidate_count", "candidate_identity_digests", "pre_cleanup_evidence_state",
  "pre_cleanup_evidence_digest", "cleanup_state", "zero_residual_state",
  "terminal_observation", "success_receipt_path", "terminal_receipt_path",
  "raw_catalog_values_persisted", "credentials_persisted", "receipt_digest",
] as const);
const APPROVAL_LINEAGE_KEYS = new Set<string>([
  "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "approval_record_digest",
]);
const LEGACY_RECEIPT_KEYS = Object.freeze(RECEIPT_KEYS.filter((key) =>
  !APPROVAL_LINEAGE_KEYS.has(key)));
const V7_RECEIPT_KEYS = Object.freeze(RECEIPT_KEYS.filter((key) =>
  key !== "gate17_scope_digest"));

export function createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(
  input: FarmOsDay150PrefixReferenceTerminalOutcomeReceiptInput,
): FarmOsDay150PrefixReferenceTerminalOutcomeReceipt | null {
  const body = Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
    authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
    authority_revision: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_REVISION,
    authority_state: "TERMINAL_NON_SUCCESS" as const,
    ...input,
    raw_catalog_values_persisted: false as const,
    credentials_persisted: false as const,
  });
  const candidate = Object.freeze({ ...body,
    receipt_digest: hash(FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA, body),
  });
  return parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(candidate);
}

export function parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(
  value: unknown,
): FarmOsDay150PrefixReferenceTerminalOutcomeReceipt | null {
  if (!record(value)) return null;
  const requiresApprovalLineage = Number(value.execution_authorization_revision) >= 7;
  const requiresGate17ScopeLineage = Number(value.execution_authorization_revision) >= 8;
  if (!exact(value, requiresGate17ScopeLineage ? RECEIPT_KEYS :
    requiresApprovalLineage ? V7_RECEIPT_KEYS : LEGACY_RECEIPT_KEYS) ||
    value.schema_version !== FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA ||
    value.authority_id !== FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID ||
    value.authority_revision !== 1 || value.authority_state !== "TERMINAL_NON_SUCCESS" ||
    typeof value.execution_authorization_id !== "string" ||
    value.execution_authorization_id.length < 1 || value.execution_authorization_id.length > 200 ||
    !Number.isSafeInteger(value.execution_authorization_revision) ||
    Number(value.execution_authorization_revision) < 1 ||
    !DIGEST.test(String(value.execution_authorization_digest)) ||
    !DIGEST.test(String(value.execution_plan_digest)) ||
    !DIGEST.test(String(value.run_identity)) || !DIGEST.test(String(value.attempt_identity)) ||
    !DIGEST.test(String(value.attempt_claim_digest)) ||
    !DIGEST.test(String(value.consumption_marker_digest)) ||
    (requiresApprovalLineage && (typeof value.approval_reference !== "string" ||
      value.approval_reference.length < 1 || value.approval_reference.length > 200 ||
      (requiresGate17ScopeLineage && value.gate17_scope_digest !==
        FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST) ||
      !DIGEST.test(String(value.approval_candidate_identity)) ||
      !DIGEST.test(String(value.proposal_identity)) ||
      typeof value.proposal_created_at !== "string" || typeof value.approved_at !== "string" ||
      !Number.isFinite(Date.parse(value.proposal_created_at)) ||
      !Number.isFinite(Date.parse(value.approved_at)) ||
      new Date(Date.parse(value.proposal_created_at)).toISOString() !==
        value.proposal_created_at ||
      new Date(Date.parse(value.approved_at)).toISOString() !== value.approved_at ||
      Date.parse(value.approved_at) < Date.parse(value.proposal_created_at) ||
      !DIGEST.test(String(value.approval_record_digest)))) ||
    !FARM_OS_DAY150_PREFIX_REFERENCE_LAST_TRUSTED_PHASES.includes(
      value.last_trusted_completed_phase as FarmOsDay150PrefixReferenceLastTrustedPhase) ||
    !FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_CLASSIFICATIONS.includes(
      value.terminal_classification as FarmOsDay150PrefixReferenceTerminalClassification) ||
    !FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_FAILURE_CODES.includes(
      value.terminal_failure_code as FarmOsDay150PrefixReferenceTerminalFailureCode) ||
    !Number.isSafeInteger(value.candidate_count) || Number(value.candidate_count) < 0 ||
    Number(value.candidate_count) > 5 || !Array.isArray(value.candidate_identity_digests) ||
    value.candidate_identity_digests.length !== value.candidate_count ||
    !value.candidate_identity_digests.every((entry) => DIGEST.test(String(entry))) ||
    new Set(value.candidate_identity_digests).size !== value.candidate_identity_digests.length ||
    !["ABSENT", "PRESENT"].includes(String(value.pre_cleanup_evidence_state)) ||
    (value.pre_cleanup_evidence_state === "ABSENT"
      ? value.pre_cleanup_evidence_digest !== null
      : !DIGEST.test(String(value.pre_cleanup_evidence_digest))) ||
    !FARM_OS_DAY150_PREFIX_REFERENCE_CLEANUP_STATES.includes(
      value.cleanup_state as FarmOsDay150PrefixReferenceCleanupState) ||
    !FARM_OS_DAY150_PREFIX_REFERENCE_ZERO_RESIDUAL_STATES.includes(
      value.zero_residual_state as FarmOsDay150PrefixReferenceZeroResidualState) ||
    (value.zero_residual_state === "VERIFIED" && value.cleanup_state === "AMBIGUOUS") ||
    (value.terminal_classification === "COMPENSATED_TERMINAL_FAILURE" &&
      (value.cleanup_state !== "COMPLETED" || value.zero_residual_state !== "VERIFIED")) ||
    !record(value.terminal_observation) || !exact(value.terminal_observation,
      ["authority", "classification", "raw_output_persisted", "credentials_persisted"]) ||
    value.terminal_observation.authority !== "EXISTING_BOUNDED_ORCHESTRATOR_OBSERVATION" ||
    value.terminal_observation.classification !== value.terminal_failure_code ||
    value.terminal_observation.raw_output_persisted !== false ||
    value.terminal_observation.credentials_persisted !== false ||
    typeof value.success_receipt_path !== "string" ||
    typeof value.terminal_receipt_path !== "string" ||
    value.success_receipt_path === value.terminal_receipt_path ||
    !value.success_receipt_path.includes("/reference-runs/v1/") ||
    !value.terminal_receipt_path.includes("/reference-runs/v1/") ||
    value.raw_catalog_values_persisted !== false || value.credentials_persisted !== false ||
    !DIGEST.test(String(value.receipt_digest))) return null;
  const { receipt_digest: ignored, ...body } = value;
  void ignored;
  return value.receipt_digest ===
    hash(FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA, body)
    ? owned(value as unknown as FarmOsDay150PrefixReferenceTerminalOutcomeReceipt) : null;
}

export function parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(
  value: unknown,
  binding: Readonly<{
    authorization_id: string;
    authorization_revision: number;
    authorization_digest: `sha256:${string}`;
    execution_plan_digest: `sha256:${string}`;
    run_identity: `sha256:${string}`;
    attempt_identity: `sha256:${string}`;
    approval_reference?: string;
    gate17_scope_digest?: `sha256:${string}`;
    approval_candidate_identity?: `sha256:${string}`;
    proposal_identity?: `sha256:${string}`;
    proposal_created_at?: string;
    approved_at?: string;
    approval_record_digest?: `sha256:${string}`;
    durable_paths: Readonly<{
      success_receipt: string;
      terminal_outcome_receipt: string | null;
    }>;
  }>,
): FarmOsDay150PrefixReferenceTerminalOutcomeReceipt | null {
  const receipt = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(value);
  return receipt && receipt.execution_authorization_id === binding.authorization_id &&
    receipt.execution_authorization_revision === binding.authorization_revision &&
    receipt.execution_authorization_digest === binding.authorization_digest &&
    receipt.execution_plan_digest === binding.execution_plan_digest &&
    receipt.run_identity === binding.run_identity &&
    receipt.attempt_identity === binding.attempt_identity &&
    (binding.approval_reference === undefined ||
      receipt.approval_reference === binding.approval_reference) &&
    (binding.gate17_scope_digest === undefined ||
      receipt.gate17_scope_digest === binding.gate17_scope_digest) &&
    (binding.approval_candidate_identity === undefined ||
      receipt.approval_candidate_identity === binding.approval_candidate_identity) &&
    (binding.proposal_identity === undefined ||
      receipt.proposal_identity === binding.proposal_identity) &&
    (binding.proposal_created_at === undefined ||
      receipt.proposal_created_at === binding.proposal_created_at) &&
    (binding.approved_at === undefined || receipt.approved_at === binding.approved_at) &&
    (binding.approval_record_digest === undefined ||
      receipt.approval_record_digest === binding.approval_record_digest) &&
    receipt.success_receipt_path === binding.durable_paths.success_receipt &&
    receipt.terminal_receipt_path === binding.durable_paths.terminal_outcome_receipt
    ? receipt : null;
}

export type FarmOsDay150PrefixReferenceTerminalReceiptAuthorityState =
  "CLEAR" | "SUCCESS_AUTHORITATIVE" | "TERMINAL_OUTCOME_AUTHORITATIVE" | "CONFLICT_FAIL_CLOSED";

export function classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority(input: Readonly<{
  success_receipt_authoritative: boolean;
  terminal_outcome_receipt: unknown;
}>): FarmOsDay150PrefixReferenceTerminalReceiptAuthorityState {
  const terminal = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(
    input.terminal_outcome_receipt);
  const terminalPresent = input.terminal_outcome_receipt !== null &&
    input.terminal_outcome_receipt !== undefined;
  if (input.success_receipt_authoritative && terminal) return "CONFLICT_FAIL_CLOSED";
  if (input.success_receipt_authoritative) return terminalPresent
    ? "CONFLICT_FAIL_CLOSED" : "SUCCESS_AUTHORITATIVE";
  if (terminal) return "TERMINAL_OUTCOME_AUTHORITATIVE";
  return terminalPresent ? "CONFLICT_FAIL_CLOSED" : "CLEAR";
}
