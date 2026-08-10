import {
  createFarmOsProductionTargetIdentityFixtureEvidence,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_PRODUCTION_EVIDENCE_AUTHORITY_STATUS,
  isFarmOsProductionTargetIdentityApprovedBinding,
  validateFarmOsProductionTargetIdentityFixtureEvidenceLineage,
  validateFarmOsProductionTargetIdentityStructuralEvidence,
  type FarmOsProductionTargetIdentityFormalEvidence,
  type FarmOsProductionTargetIdentityTargetBinding,
} from "../../../src/lib/hermes/farm_os_production_target_identity_formal_evidence";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  parseFarmOsProductionTargetIdentityMinimalObservation,
  verifyFarmOsProductionTargetIdentityMinimalObservationArtifact,
} from "../../../src/lib/hermes/farm_os_production_target_identity_minimal_observation_authority";
import {
  fingerprintFarmOsSupabaseProjectResource,
  type FarmOsSupabaseProjectResourceTuple,
} from "../../../src/lib/hermes/farm_os_supabase_project_resource_fingerprint";

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION =
  "ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE" as const;
export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_FIXTURE_RECEIPT_CLASS =
  "NON_PRODUCTION_FIXTURE" as const;
export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY = Object.freeze({
  authority_id: "farmos.production-target-evidence-acquisition-boundary.v1",
  scope: "DAY150_PHASE_A_EVIDENCE_ACQUISITION_ONLY",
  generic_runtime_authority: false,
  proposal_first: true,
  human_approval_required: true,
  maximum_execution: 1,
  automatic_retry: 0,
  fallback: 0,
  production_adapter_implemented: false,
  credential_resolver_implemented: false,
  environment_lookup_implemented: false,
  network_client_implemented: false,
  gate_1_executable_mode: "ISOLATED_FAKE_TEST_ONLY",
  required_future_runner_process: "DEDICATED_SINGLE_USE_ISOLATED_PROCESS",
  allowed_process_output: "SANITIZED_RECEIPT_ONLY",
  durable_reservation_required_for_production: true,
  process_local_reservation_production_durability: false,
  durable_implementation_status: "REQUIRES_SEPARATE_APPROVAL_NO_MIGRATION_IN_GATE_1",
  trusted_approval_authority_required_for_production: true,
  trusted_clock_required_for_production: true,
  target_association_qualification_required_for_production: true,
  production_evidence_authority_status:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_PRODUCTION_EVIDENCE_AUTHORITY_STATUS,
  production_receipt_authority_status: "NOT_ESTABLISHED",
  production_receipt_issuance: "NOT_ESTABLISHED",
} as const);

export type FarmOsProductionTargetEvidenceProposal = Readonly<{
  schema_version: "farmos.production-target-evidence-acquisition-proposal.v1";
  proposal_id: string;
  operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION;
  target_binding: FarmOsProductionTargetIdentityTargetBinding;
  query_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID;
  query_artifact_sha256:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
  nonce: string;
  created_at: string;
  expires_at: string;
}>;

export type FarmOsProductionTargetEvidenceApproval = Readonly<{
  schema_version: "farmos.production-target-evidence-acquisition-approval.v1";
  approval_id: string;
  proposal_id: string;
  approved_operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION;
  approved_target_binding: FarmOsProductionTargetIdentityTargetBinding;
  approved_query_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID;
  approved_query_artifact_sha256:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
  approved_nonce: string;
  approved_at: string;
  expires_at: string;
  human_approval_reference: string;
}>;

export type FarmOsProductionTargetEvidenceCommand = Readonly<{
  schema_version: "farmos.production-target-evidence-acquisition-command.v1";
  command_id: string;
  proposal_id: string;
  approval_id: string;
  operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION;
  target_binding: FarmOsProductionTargetIdentityTargetBinding;
  query_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID;
  query_artifact_sha256:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
  nonce: string;
  expires_at: string;
  maximum_execution: 1;
  automatic_retry: 0;
}>;

export type FarmOsProductionTargetEvidenceReceipt = Readonly<{
  schema_version: "farmos.production-target-evidence-acquisition-receipt.v1";
  receipt_class:
    | typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_FIXTURE_RECEIPT_CLASS
    | "PRODUCTION_RECEIPT";
  command_id: string;
  proposal_id: string;
  approval_id: string;
  nonce: string;
  status: "CONSUMED_SUCCESS" | "CONSUMED_FAILURE";
  execution_attempted: true;
  execution_count: 1;
  automatic_retry_count: 0;
  reason_code:
    | "EVIDENCE_CREATED"
    | "RAW_PROVIDER_INPUT_REJECTED"
    | "RAW_OBSERVATION_REJECTED"
    | "EVIDENCE_CONTRACT_REJECTED"
    | "ISOLATED_ADAPTER_FAILURE";
  evidence: FarmOsProductionTargetIdentityFormalEvidence | null;
  secret_exposed: false;
  production_writes: 0;
  approval_authority_id: string;
  approval_receipt_id: string;
  target_association_digest: `sha256:${string}` | null;
}>;

export type FarmOsProductionTargetEvidenceAcquisitionResult =
  | Readonly<{ accepted: true; receipt: FarmOsProductionTargetEvidenceReceipt }>
  | Readonly<{
    accepted: false;
    reason:
      | "PROPOSAL_INVALID"
      | "EXECUTION_MODE_NOT_AUTHORIZED"
      | "APPROVAL_INVALID"
      | "APPROVAL_EXPIRED"
      | "APPROVAL_PROPOSAL_MISMATCH"
      | "APPROVAL_TARGET_MISMATCH"
      | "APPROVAL_OPERATION_MISMATCH"
      | "APPROVAL_NONCE_MISMATCH"
      | "APPROVAL_QUERY_AUTHORITY_MISMATCH"
      | "APPROVAL_QUERY_SHA_MISMATCH"
      | "ARTIFACT_SHA_MISMATCH"
      | "REPLAY_REJECTED"
      | "APPROVAL_AUTHORITY_REJECTED"
      | "COMMAND_RESERVATION_OUTCOME_UNKNOWN"
      | "COMMAND_OUTCOME_UNKNOWN";
    external_call_count: 0 | 1;
  }>;

export type FarmOsProductionTargetEvidenceTargetAssociation = Readonly<{
  schema_version: "farmos.production-target-evidence-target-association.v1";
  command_id: string;
  nonce: string;
  target_binding: FarmOsProductionTargetIdentityTargetBinding;
  provider_and_postgres_same_reserved_target: true;
}>;

export type FarmOsProductionTargetEvidenceRawObservation = Readonly<{
  provider_resource_tuple: FarmOsSupabaseProjectResourceTuple;
  postgres_row: unknown;
  target_association: FarmOsProductionTargetEvidenceTargetAssociation;
}>;

export interface FarmOsProductionTargetEvidenceIsolatedAdapter {
  observe(input: Readonly<{
    query_artifact_bytes: Uint8Array;
    connection_maximum: 1;
    transaction_count: 1;
    isolation_level: "REPEATABLE READ";
    transaction_access_mode: "READ ONLY";
    automatic_retry: 0;
    fallback: 0;
    commit: 0;
    rollback: "REQUIRED";
    connection_close: "REQUIRED";
    command_binding: Readonly<{
      command_id: string;
      nonce: string;
      target_binding: FarmOsProductionTargetIdentityTargetBinding;
      query_artifact_sha256:
        typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
    }>;
  }>): Promise<FarmOsProductionTargetEvidenceRawObservation>;
}

export interface FarmOsProductionTargetEvidenceClock {
  readonly trust_class: "TRUSTED_PRODUCTION_CLOCK" | "FIXTURE_CLOCK";
  now(): string;
}

export type FarmOsProductionTargetEvidenceApprovalVerification =
  | Readonly<{
    verified: true;
    approval_authority_id: string;
    approval_receipt_id: string;
  }>
  | Readonly<{ verified: false }>;

export interface FarmOsProductionTargetEvidenceApprovalAuthority {
  readonly trust_class: "TRUSTED_DURABLE_APPROVAL_SOT" | "FIXTURE_APPROVAL_AUTHORITY";
  verify(input: Readonly<{
    proposal: FarmOsProductionTargetEvidenceProposal;
    approval: FarmOsProductionTargetEvidenceApproval;
    evaluated_at: string;
  }>): Promise<FarmOsProductionTargetEvidenceApprovalVerification>;
}

export interface FarmOsProductionTargetEvidenceCommandReservationStore {
  readonly durability: "DURABLE" | "PROCESS_LOCAL_TEST_ONLY";
  reserve(command: FarmOsProductionTargetEvidenceCommand): Promise<"RESERVED" | "REPLAY_REJECTED">;
  finalizeConsumedReceipt(
    receipt: FarmOsProductionTargetEvidenceReceipt,
  ): Promise<"FINALIZED" | "OUTCOME_UNKNOWN">;
}

export class InMemoryFarmOsProductionTargetEvidenceCommandReservationStore
implements FarmOsProductionTargetEvidenceCommandReservationStore {
  readonly durability = "PROCESS_LOCAL_TEST_ONLY" as const;
  readonly #states = new Map<string, "RESERVED" | "CONSUMED">();

  async reserve(command: FarmOsProductionTargetEvidenceCommand): Promise<"RESERVED" | "REPLAY_REJECTED"> {
    if (this.#states.has(command.nonce) || [...this.#states.keys()].includes(command.command_id)) {
      return "REPLAY_REJECTED";
    }
    this.#states.set(command.nonce, "RESERVED");
    this.#states.set(command.command_id, "RESERVED");
    return "RESERVED";
  }

  async finalizeConsumedReceipt(
    receipt: FarmOsProductionTargetEvidenceReceipt,
  ): Promise<"FINALIZED"> {
    this.#states.set(receipt.nonce, "CONSUMED");
    this.#states.set(receipt.command_id, "CONSUMED");
    return "FINALIZED";
  }
}

const ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/u;
const REFERENCE = /^[a-z0-9][a-z0-9._:/-]{0,199}$/u;
const FORBIDDEN_REFERENCE_VALUE = /(?:https?:\/\/|postgres(?:ql)?:\/\/|token|secret|credential|jwt|api[_-]?key|password)/iu;
const ISO_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const PROPOSAL_KEYS = Object.freeze([
  "created_at", "expires_at", "nonce", "operation", "proposal_id", "query_artifact_sha256",
  "query_authority_id", "schema_version", "target_binding",
] as const);
const APPROVAL_KEYS = Object.freeze([
  "approval_id", "approved_at", "approved_nonce", "approved_operation",
  "approved_query_artifact_sha256", "approved_query_authority_id", "approved_target_binding",
  "expires_at", "human_approval_reference", "proposal_id", "schema_version",
] as const);
const RAW_OBSERVATION_KEYS = Object.freeze([
  "postgres_row", "provider_resource_tuple", "target_association",
] as const);
const PROVIDER_TUPLE_KEYS = Object.freeze([
  "account_scope_id", "provider_namespace", "resource_id", "resource_type",
] as const);
const TARGET_ASSOCIATION_KEYS = Object.freeze([
  "command_id", "nonce", "provider_and_postgres_same_reserved_target", "schema_version",
  "target_binding",
] as const);
const RECEIPT_KEYS = Object.freeze([
  "approval_authority_id", "approval_id", "approval_receipt_id", "automatic_retry_count",
  "command_id", "evidence", "execution_attempted", "execution_count", "nonce",
  "production_writes", "proposal_id", "reason_code", "receipt_class", "schema_version",
  "secret_exposed", "status", "target_association_digest",
] as const);
const FORBIDDEN_RAW_KEY = /(?:^raw_|credential|token|secret|jwt|api[_-]?key|url|endpoint|password)/iu;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_MILLIS.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function safeReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE.test(value) &&
    !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function hasForbiddenRawKey(value: unknown, seen = new WeakSet<object>()): boolean {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => hasForbiddenRawKey(item, seen));
  if (!record(value)) return false;
  return Object.entries(value).some(([key, nested]) =>
    FORBIDDEN_RAW_KEY.test(key) || hasForbiddenRawKey(nested, seen));
}

function validRawObservation(
  value: unknown,
  command: FarmOsProductionTargetEvidenceCommand,
): value is FarmOsProductionTargetEvidenceRawObservation {
  if (!record(value) || hasForbiddenRawKey(value) || !exact(value, RAW_OBSERVATION_KEYS) ||
    !record(value.provider_resource_tuple) ||
    !exact(value.provider_resource_tuple, PROVIDER_TUPLE_KEYS) ||
    !record(value.target_association) ||
    !exact(value.target_association, TARGET_ASSOCIATION_KEYS)) return false;
  const tuple = value.provider_resource_tuple;
  const association = value.target_association;
  return typeof tuple.provider_namespace === "string" &&
    typeof tuple.resource_type === "string" &&
    (tuple.account_scope_id === null || typeof tuple.account_scope_id === "string") &&
    typeof tuple.resource_id === "string" &&
    association.schema_version === "farmos.production-target-evidence-target-association.v1" &&
    association.command_id === command.command_id && association.nonce === command.nonce &&
    association.provider_and_postgres_same_reserved_target === true &&
    isFarmOsProductionTargetIdentityApprovedBinding(association.target_binding);
}

function targetAssociationDigest(
  lineage: Readonly<{
    approval_id: string;
    command_id: string;
    nonce: string;
  }>,
  providerFingerprint: `sha256:${string}`,
  clusterDigest: `sha256:${string}`,
): `sha256:${string}` {
  const canonical = JSON.stringify({
    approval_id: lineage.approval_id,
    cluster_system_identifier_digest: clusterDigest,
    command_id: lineage.command_id,
    nonce: lineage.nonce,
    provider_resource_fingerprint: providerFingerprint,
    target_binding: FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
  });
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export function validateFarmOsProductionTargetEvidenceProposal(
  value: unknown,
): value is FarmOsProductionTargetEvidenceProposal {
  return record(value) && exact(value, PROPOSAL_KEYS) &&
    value.schema_version === "farmos.production-target-evidence-acquisition-proposal.v1" &&
    typeof value.proposal_id === "string" && ID.test(value.proposal_id) &&
    value.operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION &&
    isFarmOsProductionTargetIdentityApprovedBinding(value.target_binding) &&
    value.query_authority_id ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID &&
    value.query_artifact_sha256 ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 &&
    typeof value.nonce === "string" && NONCE.test(value.nonce) &&
    timestamp(value.created_at) && timestamp(value.expires_at) &&
    Date.parse(value.created_at) < Date.parse(value.expires_at);
}

export function validateFarmOsProductionTargetEvidenceApproval(
  value: unknown,
): value is FarmOsProductionTargetEvidenceApproval {
  return record(value) && exact(value, APPROVAL_KEYS) &&
    value.schema_version === "farmos.production-target-evidence-acquisition-approval.v1" &&
    typeof value.approval_id === "string" && ID.test(value.approval_id) &&
    typeof value.proposal_id === "string" && ID.test(value.proposal_id) &&
    value.approved_operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION &&
    isFarmOsProductionTargetIdentityApprovedBinding(value.approved_target_binding) &&
    value.approved_query_authority_id ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID &&
    value.approved_query_artifact_sha256 ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 &&
    typeof value.approved_nonce === "string" && NONCE.test(value.approved_nonce) &&
    timestamp(value.approved_at) && timestamp(value.expires_at) &&
    Date.parse(value.approved_at) < Date.parse(value.expires_at) &&
    safeReference(value.human_approval_reference);
}

export type FarmOsProductionTargetEvidenceReceiptExpectedLineage = Readonly<{
  approval_authority_id: string;
  approval_id: string;
  approval_receipt_id: string;
  command_id: string;
  nonce: string;
  proposal_id: string;
  status: FarmOsProductionTargetEvidenceReceipt["status"];
  reason_code: FarmOsProductionTargetEvidenceReceipt["reason_code"];
  target_association_digest: `sha256:${string}` | null;
}>;

export function validateFarmOsProductionTargetEvidenceStructuralReceipt(
  value: unknown,
): value is FarmOsProductionTargetEvidenceReceipt {
  if (!record(value) || !exact(value, RECEIPT_KEYS) ||
    value.schema_version !== "farmos.production-target-evidence-acquisition-receipt.v1" ||
    (value.receipt_class !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_FIXTURE_RECEIPT_CLASS &&
      value.receipt_class !== "PRODUCTION_RECEIPT") ||
    typeof value.proposal_id !== "string" || !ID.test(value.proposal_id) ||
    typeof value.approval_id !== "string" || !ID.test(value.approval_id) ||
    typeof value.command_id !== "string" || !ID.test(value.command_id) ||
    typeof value.nonce !== "string" || !NONCE.test(value.nonce) ||
    !safeReference(value.approval_authority_id) ||
    !safeReference(value.approval_receipt_id) ||
    value.execution_attempted !== true || value.execution_count !== 1 ||
    value.automatic_retry_count !== 0 || value.secret_exposed !== false ||
    value.production_writes !== 0 ||
    !["EVIDENCE_CREATED", "RAW_PROVIDER_INPUT_REJECTED", "RAW_OBSERVATION_REJECTED",
      "EVIDENCE_CONTRACT_REJECTED", "ISOLATED_ADAPTER_FAILURE"].includes(
        value.reason_code as string,
      )) return false;
  if (value.status === "CONSUMED_SUCCESS") {
    if (value.reason_code !== "EVIDENCE_CREATED" ||
      typeof value.target_association_digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/u.test(value.target_association_digest) ||
      !validateFarmOsProductionTargetIdentityStructuralEvidence(value.evidence)) {
      return false;
    }
    return true;
  }
  return value.status === "CONSUMED_FAILURE" && value.reason_code !== "EVIDENCE_CREATED" &&
    value.evidence === null &&
    value.target_association_digest === null;
}

export function validateFarmOsProductionTargetEvidenceFixtureReceipt(
  value: unknown,
  expected: FarmOsProductionTargetEvidenceReceiptExpectedLineage,
): value is FarmOsProductionTargetEvidenceReceipt {
  if (!validateFarmOsProductionTargetEvidenceStructuralReceipt(value) ||
    value.receipt_class !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_FIXTURE_RECEIPT_CLASS ||
    value.command_id !== expected.command_id || value.nonce !== expected.nonce ||
    value.proposal_id !== expected.proposal_id || value.approval_id !== expected.approval_id ||
    value.command_id !== `command:${value.approval_id}` ||
    value.approval_authority_id !== expected.approval_authority_id ||
    value.approval_receipt_id !== expected.approval_receipt_id ||
    value.status !== expected.status || value.reason_code !== expected.reason_code ||
    value.target_association_digest !== expected.target_association_digest) return false;
  if (value.status === "CONSUMED_FAILURE") return true;
  if (value.evidence === null || value.target_association_digest === null) return false;
  const providerFingerprint = value.evidence.provider_resource_fingerprint;
  const clusterDigest = value.evidence.cluster_system_identifier_digest;
  if (targetAssociationDigest({
    approval_id: value.approval_id,
    command_id: value.command_id,
    nonce: value.nonce,
  }, providerFingerprint, clusterDigest) !== value.target_association_digest) return false;
  return validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(value.evidence, {
    approval_authority_id: expected.approval_authority_id,
    approval_receipt_id: expected.approval_receipt_id,
    command_id: expected.command_id,
    target_association_digest: value.target_association_digest,
  });
}

export function validateFarmOsProductionTargetEvidenceProductionReceipt(
  value: unknown,
  expected: FarmOsProductionTargetEvidenceReceiptExpectedLineage,
): value is never {
  void expected;
  if (!validateFarmOsProductionTargetEvidenceStructuralReceipt(value)) return false;
  return false;
}

function rejected(reason: Exclude<FarmOsProductionTargetEvidenceAcquisitionResult,
  { accepted: true }> ["reason"], externalCallCount: 0 | 1 = 0):
  FarmOsProductionTargetEvidenceAcquisitionResult {
  return Object.freeze({ accepted: false, reason, external_call_count: externalCallCount });
}

function commandFrom(
  proposal: FarmOsProductionTargetEvidenceProposal,
  approval: FarmOsProductionTargetEvidenceApproval,
): FarmOsProductionTargetEvidenceCommand {
  return Object.freeze({
    schema_version: "farmos.production-target-evidence-acquisition-command.v1",
    command_id: `command:${approval.approval_id}`,
    proposal_id: proposal.proposal_id,
    approval_id: approval.approval_id,
    operation: proposal.operation,
    target_binding: proposal.target_binding,
    query_authority_id: proposal.query_authority_id,
    query_artifact_sha256: proposal.query_artifact_sha256,
    nonce: proposal.nonce,
    expires_at: approval.expires_at,
    maximum_execution: 1,
    automatic_retry: 0,
  });
}

function receipt(
  command: FarmOsProductionTargetEvidenceCommand,
  approvalVerification: Extract<FarmOsProductionTargetEvidenceApprovalVerification,
    { verified: true }>,
  reason_code: FarmOsProductionTargetEvidenceReceipt["reason_code"],
  evidence: FarmOsProductionTargetIdentityFormalEvidence | null,
  associationDigest: `sha256:${string}` | null,
): FarmOsProductionTargetEvidenceReceipt {
  return Object.freeze({
    schema_version: "farmos.production-target-evidence-acquisition-receipt.v1",
    receipt_class: FARM_OS_PRODUCTION_TARGET_EVIDENCE_FIXTURE_RECEIPT_CLASS,
    command_id: command.command_id,
    proposal_id: command.proposal_id,
    approval_id: command.approval_id,
    nonce: command.nonce,
    status: evidence === null ? "CONSUMED_FAILURE" : "CONSUMED_SUCCESS",
    execution_attempted: true,
    execution_count: 1,
    automatic_retry_count: 0,
    reason_code,
    evidence,
    secret_exposed: false,
    production_writes: 0,
    approval_authority_id: approvalVerification.approval_authority_id,
    approval_receipt_id: approvalVerification.approval_receipt_id,
    target_association_digest: associationDigest,
  });
}

export async function acquireFarmOsProductionTargetIdentityEvidence(input: Readonly<{
  execution_mode: "ISOLATED_FAKE_TEST";
  proposal: unknown;
  approval: unknown;
  clock: FarmOsProductionTargetEvidenceClock;
  approval_authority: FarmOsProductionTargetEvidenceApprovalAuthority;
  query_artifact_bytes: Uint8Array;
  reservation_store: FarmOsProductionTargetEvidenceCommandReservationStore;
  isolated_adapter: FarmOsProductionTargetEvidenceIsolatedAdapter;
}>): Promise<FarmOsProductionTargetEvidenceAcquisitionResult> {
  if (input.execution_mode !== "ISOLATED_FAKE_TEST") {
    return rejected("EXECUTION_MODE_NOT_AUTHORIZED");
  }
  if (input.clock.trust_class !== "FIXTURE_CLOCK" ||
    input.approval_authority.trust_class !== "FIXTURE_APPROVAL_AUTHORITY" ||
    input.reservation_store.durability !== "PROCESS_LOCAL_TEST_ONLY") {
    return rejected("EXECUTION_MODE_NOT_AUTHORIZED");
  }
  if (!validateFarmOsProductionTargetEvidenceProposal(input.proposal)) {
    return rejected("PROPOSAL_INVALID");
  }
  if (!validateFarmOsProductionTargetEvidenceApproval(input.approval)) {
    return rejected("APPROVAL_INVALID");
  }
  const proposal = input.proposal;
  const approval = input.approval;
  let evaluatedAt: string;
  try {
    evaluatedAt = input.clock.now();
  } catch {
    return rejected("APPROVAL_AUTHORITY_REJECTED");
  }
  if (!timestamp(evaluatedAt) ||
    Date.parse(proposal.created_at) > Date.parse(approval.approved_at) ||
    Date.parse(approval.approved_at) > Date.parse(evaluatedAt) ||
    Date.parse(evaluatedAt) >=
    Math.min(Date.parse(proposal.expires_at), Date.parse(approval.expires_at))) {
    return rejected("APPROVAL_EXPIRED");
  }
  if (approval.proposal_id !== proposal.proposal_id) return rejected("APPROVAL_PROPOSAL_MISMATCH");
  if (approval.approved_operation !== proposal.operation) return rejected("APPROVAL_OPERATION_MISMATCH");
  if (!isFarmOsProductionTargetIdentityApprovedBinding(approval.approved_target_binding) ||
    !isFarmOsProductionTargetIdentityApprovedBinding(proposal.target_binding)) {
    return rejected("APPROVAL_TARGET_MISMATCH");
  }
  if (approval.approved_nonce !== proposal.nonce) return rejected("APPROVAL_NONCE_MISMATCH");
  if (approval.approved_query_authority_id !== proposal.query_authority_id) {
    return rejected("APPROVAL_QUERY_AUTHORITY_MISMATCH");
  }
  if (approval.approved_query_artifact_sha256 !== proposal.query_artifact_sha256) {
    return rejected("APPROVAL_QUERY_SHA_MISMATCH");
  }
  let verifiedQueryArtifactBytes: Uint8Array;
  try {
    verifiedQueryArtifactBytes = Uint8Array.from(input.query_artifact_bytes);
  } catch {
    return rejected("ARTIFACT_SHA_MISMATCH");
  }
  if (!verifyFarmOsProductionTargetIdentityMinimalObservationArtifact(
    verifiedQueryArtifactBytes,
  ).verified) return rejected("ARTIFACT_SHA_MISMATCH");

  let approvalVerification: FarmOsProductionTargetEvidenceApprovalVerification;
  try {
    approvalVerification = await input.approval_authority.verify({
      proposal,
      approval,
      evaluated_at: evaluatedAt,
    });
  } catch {
    return rejected("APPROVAL_AUTHORITY_REJECTED");
  }
  if (!approvalVerification.verified ||
    !safeReference(approvalVerification.approval_authority_id) ||
    !safeReference(approvalVerification.approval_receipt_id)) {
    return rejected("APPROVAL_AUTHORITY_REJECTED");
  }

  const command = commandFrom(proposal, approval);
  let reservation: "RESERVED" | "REPLAY_REJECTED";
  try {
    reservation = await input.reservation_store.reserve(command);
  } catch {
    return rejected("COMMAND_RESERVATION_OUTCOME_UNKNOWN");
  }
  if (reservation !== "RESERVED") {
    return rejected("REPLAY_REJECTED");
  }

  let finalReceipt: FarmOsProductionTargetEvidenceReceipt;
  try {
    const raw = await input.isolated_adapter.observe({
      query_artifact_bytes: verifiedQueryArtifactBytes,
      ...FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY.execution,
      command_binding: Object.freeze({
        command_id: command.command_id,
        nonce: command.nonce,
        target_binding: command.target_binding,
        query_artifact_sha256: command.query_artifact_sha256,
      }),
    });
    if (!validRawObservation(raw, command)) {
      finalReceipt = receipt(
        command, approvalVerification, "RAW_OBSERVATION_REJECTED", null, null,
      );
    } else {
    const provider = fingerprintFarmOsSupabaseProjectResource(raw.provider_resource_tuple);
    if (!provider.accepted) {
      finalReceipt = receipt(
        command, approvalVerification, "RAW_PROVIDER_INPUT_REJECTED", null, null,
      );
    } else {
      const postgres = parseFarmOsProductionTargetIdentityMinimalObservation(raw.postgres_row, {
        database_logical_name:
          FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.database_logical_name,
        expected_postgres_major:
          FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.expected_postgres_major,
      });
      if (!postgres.accepted) {
        finalReceipt = receipt(
          command, approvalVerification, "RAW_OBSERVATION_REJECTED", null, null,
        );
      } else {
        const associationDigest = targetAssociationDigest(
          command,
          provider.fingerprint,
          postgres.observation.cluster_system_identifier_digest,
        );
        const evidence = createFarmOsProductionTargetIdentityFixtureEvidence({
          provider_resource_fingerprint: provider.fingerprint,
          provider_resource_fingerprint_provenance_reference:
            `receipt:${command.command_id}:provider`,
          cluster_system_identifier_digest:
            postgres.observation.cluster_system_identifier_digest,
          cluster_system_identifier_digest_provenance_reference:
            `receipt:${command.command_id}:cluster`,
          evidence_acquisition_approval_authority_id:
            approvalVerification.approval_authority_id,
          evidence_acquisition_approval_receipt_id:
            approvalVerification.approval_receipt_id,
          evidence_acquisition_command_id: command.command_id,
          target_association_digest: associationDigest,
        });
        finalReceipt = evidence === null
          ? receipt(
            command, approvalVerification, "EVIDENCE_CONTRACT_REJECTED", null, null,
          )
          : receipt(
            command, approvalVerification, "EVIDENCE_CREATED", evidence, associationDigest,
          );
      }
    }
    }
  } catch {
    finalReceipt = receipt(
      command, approvalVerification, "ISOLATED_ADAPTER_FAILURE", null, null,
    );
  }
  try {
    if (await input.reservation_store.finalizeConsumedReceipt(finalReceipt) !== "FINALIZED") {
      return rejected("COMMAND_OUTCOME_UNKNOWN", 1);
    }
  } catch {
    return rejected("COMMAND_OUTCOME_UNKNOWN", 1);
  }
  return Object.freeze({ accepted: true, receipt: finalReceipt });
}
import { createHash } from "node:crypto";
