import { randomUUID } from "node:crypto";
import {
  hashFarmOsContract,
  hasExactFarmOsKeys,
  isCanonicalFarmOsIso,
  isFarmOsDigest,
  isFarmOsIdentifier,
  isFarmOsRecord,
} from "./farm_os_approved_proposal_contract";
import {
  parseFarmOsLowRiskSafeReference,
  type ConfirmationTaskPayload,
} from "./farm_os_low_risk_candidate_contract";
import {
  parseAssignmentCandidate,
  parseWorkPlanDraft,
  type AssignmentCandidate,
  type WorkPlanDraft,
} from "./farm_os_work_plan_assignment_contract";
import type {
  ProposalExecutionScope,
  ProposalExecutionState,
} from "./farm_os_proposal_execution_verification_contract";

export const FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION =
  "farmos.eligible-proposal-persistence.v1" as const;
export const FARM_OS_PROPOSAL_CREATION_IDEMPOTENCY_VERSION =
  "farmos.proposal-creation-idempotency.v1" as const;
export const FARM_OS_PROPOSAL_PAYLOAD_HASH_VERSION =
  "farmos.proposal-payload.v1" as const;
export const FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION =
  "farmos.proposal-execution-state.v1" as const;
export const FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION =
  "farmos.proposal-execution-snapshot.v1" as const;
export const FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION =
  "proposal-execution-policy.v1" as const;

export const FARM_OS_ELIGIBLE_PROPOSAL_TYPES = [
  "confirmation_task",
  "work_plan_draft",
  "assignment_candidate",
] as const;
export type EligibleProposalType =
  (typeof FARM_OS_ELIGIBLE_PROPOSAL_TYPES)[number];
export type ProposalExecutionProjectionStatus =
  | "draft"
  | "review_ready"
  | "execution_eligible"
  | "rejected"
  | "expired"
  | "superseded"
  | "withdrawn";

export type ConfirmationTaskProposalPayload = {
  schema_version: "farmos.confirmation-task-proposal.v1";
  source_candidate_id: string;
  source_candidate_schema_version: "farmos.low-risk-candidate.v1";
  candidate_snapshot_hash: string;
  candidate_payload: ConfirmationTaskPayload;
  target_reference: ConfirmationTaskPayload["target_reference"];
  scope_constraints: ProposalExecutionScope;
  created_at: string;
  expires_at: string;
};
export type WorkPlanDraftProposalPayload = {
  schema_version: "farmos.work-plan-draft-proposal.v1";
  source_candidate_id: string;
  source_candidate_schema_version: "farmos.work-plan-draft.v1";
  candidate_snapshot_hash: string;
  candidate_payload: WorkPlanDraft;
  target_reference: WorkPlanDraft["target_reference"];
  scope_constraints: ProposalExecutionScope;
  created_at: string;
  expires_at: string;
};
export type AssignmentCandidateProposalPayload = {
  schema_version: "farmos.assignment-candidate-proposal.v1";
  source_candidate_id: string;
  source_candidate_schema_version: "farmos.assignment-candidate.v1";
  candidate_snapshot_hash: string;
  candidate_payload: AssignmentCandidate;
  target_reference: WorkPlanDraft["target_reference"];
  scope_constraints: ProposalExecutionScope;
  created_at: string;
  expires_at: string;
  work_plan_draft_id: string;
  work_plan_draft_snapshot_hash: string;
};
export type EligibleProposalPayload =
  | ConfirmationTaskProposalPayload
  | WorkPlanDraftProposalPayload
  | AssignmentCandidateProposalPayload;

export type EligibleProposalRegistryEntry = {
  proposal_type: EligibleProposalType;
  proposal_schema_version: EligibleProposalPayload["schema_version"];
  operation_type:
    | "confirmation_task_persist"
    | "create_work_plan_draft"
    | "assignment_candidate";
  target_system: "farming_app_server_boundary";
  required_capability:
    | "persist_confirmation_task"
    | "edit_work_plan"
    | "assign_staff";
  projection_enabled: true;
};
export const FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY: Readonly<
  Record<EligibleProposalType, EligibleProposalRegistryEntry>
> = {
  confirmation_task: {
    proposal_type: "confirmation_task",
    proposal_schema_version: "farmos.confirmation-task-proposal.v1",
    operation_type: "confirmation_task_persist",
    target_system: "farming_app_server_boundary",
    required_capability: "persist_confirmation_task",
    projection_enabled: true,
  },
  work_plan_draft: {
    proposal_type: "work_plan_draft",
    proposal_schema_version: "farmos.work-plan-draft-proposal.v1",
    operation_type: "create_work_plan_draft",
    target_system: "farming_app_server_boundary",
    required_capability: "edit_work_plan",
    projection_enabled: true,
  },
  assignment_candidate: {
    proposal_type: "assignment_candidate",
    proposal_schema_version: "farmos.assignment-candidate-proposal.v1",
    operation_type: "assignment_candidate",
    target_system: "farming_app_server_boundary",
    required_capability: "assign_staff",
    projection_enabled: true,
  },
};

const COMMON_PAYLOAD_KEYS = [
  "schema_version",
  "source_candidate_id",
  "source_candidate_schema_version",
  "candidate_snapshot_hash",
  "candidate_payload",
  "target_reference",
  "scope_constraints",
  "created_at",
  "expires_at",
] as const;
const ASSIGNMENT_PAYLOAD_KEYS = [
  ...COMMON_PAYLOAD_KEYS,
  "work_plan_draft_id",
  "work_plan_draft_snapshot_hash",
] as const;
const CONFIRMATION_KEYS = [
  "payload_kind",
  "question",
  "reason",
  "confirmation_type",
  "target_reference",
  "requested_by_date",
  "blocking",
] as const;
const SCOPE_KEYS = ["scope_type", "scope_id", "target_reference"] as const;

function parseScope(value: unknown): ProposalExecutionScope | null {
  if (
    !isFarmOsRecord(value) ||
    !hasExactFarmOsKeys(value, SCOPE_KEYS) ||
    value.scope_type !== "exact_target" ||
    !isFarmOsIdentifier(value.scope_id) ||
    !isFarmOsIdentifier(value.target_reference)
  ) return null;
  return value as ProposalExecutionScope;
}
function validConfirmationPayload(value: unknown): value is ConfirmationTaskPayload {
  if (!isFarmOsRecord(value) || !hasExactFarmOsKeys(value, CONFIRMATION_KEYS)) return false;
  return (
    value.payload_kind === "confirmation_task" &&
    typeof value.question === "string" &&
    value.question.length > 0 &&
    value.question.length <= 500 &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    value.reason.length <= 500 &&
    [
      "field_condition",
      "planned_date",
      "responsible_person",
      "material_name",
      "crop_plan_assumption",
    ].includes(String(value.confirmation_type)) &&
    Boolean(parseFarmOsLowRiskSafeReference(value.target_reference)) &&
    isCanonicalFarmOsIso(value.requested_by_date) &&
    typeof value.blocking === "boolean"
  );
}

export function parseEligibleProposalPayload(
  proposalType: EligibleProposalType,
  value: unknown,
  now: string,
): EligibleProposalPayload | null {
  const keys =
    proposalType === "assignment_candidate"
      ? ASSIGNMENT_PAYLOAD_KEYS
      : COMMON_PAYLOAD_KEYS;
  if (
    !isFarmOsRecord(value) ||
    !hasExactFarmOsKeys(value, keys) ||
    !isFarmOsIdentifier(value.source_candidate_id) ||
    !isFarmOsDigest(value.candidate_snapshot_hash) ||
    !isCanonicalFarmOsIso(value.created_at) ||
    !isCanonicalFarmOsIso(value.expires_at) ||
    Date.parse(value.created_at) > Date.parse(now) ||
    Date.parse(value.expires_at) <= Date.parse(now)
  ) return null;
  const scope = parseScope(value.scope_constraints);
  if (!scope) return null;

  if (proposalType === "confirmation_task") {
    if (
      value.schema_version !== "farmos.confirmation-task-proposal.v1" ||
      value.source_candidate_schema_version !== "farmos.low-risk-candidate.v1" ||
      !validConfirmationPayload(value.candidate_payload)
    ) return null;
    const target = parseFarmOsLowRiskSafeReference(value.target_reference);
    if (
      !target ||
      hashFarmOsContract(value.candidate_payload) !== value.candidate_snapshot_hash ||
      hashFarmOsContract(target) !== hashFarmOsContract(value.candidate_payload.target_reference) ||
      scope.target_reference !== target.reference_id
    ) return null;
  } else if (proposalType === "work_plan_draft") {
    const candidate = parseWorkPlanDraft(value.candidate_payload);
    if (
      value.schema_version !== "farmos.work-plan-draft-proposal.v1" ||
      value.source_candidate_schema_version !== "farmos.work-plan-draft.v1" ||
      !candidate ||
      hashFarmOsContract(candidate) !== value.candidate_snapshot_hash ||
      hashFarmOsContract(value.target_reference) !== hashFarmOsContract(candidate.target_reference) ||
      scope.target_reference !== candidate.target_reference.reference_id
    ) return null;
  } else {
    const candidate = parseAssignmentCandidate(value.candidate_payload);
    if (
      value.schema_version !== "farmos.assignment-candidate-proposal.v1" ||
      value.source_candidate_schema_version !== "farmos.assignment-candidate.v1" ||
      !candidate ||
      !isFarmOsIdentifier(value.work_plan_draft_id) ||
      !isFarmOsDigest(value.work_plan_draft_snapshot_hash) ||
      candidate.work_plan_draft_id !== value.work_plan_draft_id ||
      hashFarmOsContract(candidate) !== value.candidate_snapshot_hash ||
      !isFarmOsRecord(value.target_reference) ||
      typeof value.target_reference.reference_id !== "string" ||
      scope.target_reference !== value.target_reference.reference_id
    ) return null;
  }
  return value as EligibleProposalPayload;
}

export function createCoreProposalId(uuid: string = randomUUID()): string {
  const id = `proposal_${uuid.toLowerCase().replaceAll("-", "")}`;
  if (!/^proposal_[0-9a-f]{32}$/u.test(id) || !isFarmOsIdentifier(id)) {
    throw new Error("invalid_core_proposal_id");
  }
  return id;
}

export function computeProposalPayloadHash(
  proposalType: EligibleProposalType,
  payload: EligibleProposalPayload,
): string {
  return hashFarmOsContract({
    hash_schema_version: FARM_OS_PROPOSAL_PAYLOAD_HASH_VERSION,
    proposal_type: proposalType,
    payload,
  });
}

export type ProposalExecutionSnapshotMaterial = {
  snapshot_schema_version: typeof FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION;
  contract_version: "farmos.proposal-execution-verification.v1";
  proposal_id: string;
  proposal_type: EligibleProposalType;
  proposal_version: number;
  operation_type: EligibleProposalRegistryEntry["operation_type"];
  target_system: "farming_app_server_boundary";
  target_reference: string;
  required_capability: EligibleProposalRegistryEntry["required_capability"];
  scope_constraints: ProposalExecutionScope;
  correlation_id: string;
  causation_id: string;
  expires_at: string;
  execution_status: ProposalExecutionProjectionStatus;
};
export function computeProposalExecutionSnapshotHashV1(
  material: ProposalExecutionSnapshotMaterial,
): string {
  return hashFarmOsContract(material);
}

const CREATION_RECORD_KEYS = [
  "inbox_record_id",
  "proposal_id",
  "proposal_type",
  "source_system",
  "source_reference",
  "source_version",
  "parent_proposal_id",
  "created_by_kind",
  "created_by_reference",
  "payload",
  "payload_hash",
  "idempotency_key_hash",
  "request_fingerprint",
  "projection",
] as const;
const PROJECTION_RECORD_KEYS = [
  "schema_version",
  "proposal_type",
  "proposal_id",
  "proposal_version",
  "proposal_snapshot_hash",
  "proposal_status",
  "operation_type",
  "target_system",
  "target_reference",
  "required_capability",
  "scope_constraints",
  "correlation_id",
  "causation_id",
  "proposal_expires_at",
  "repository_state_version",
  "execution_state_version",
  "execution_status",
  "proposal_created_at",
  "proposal_updated_at",
  "state_changed_at",
  "state_changed_reason",
  "policy_version",
] as const;

export function parseStoredProposalCreationRecord(
  value: unknown,
): ProposalCreationRecord | null {
  if (
    !isFarmOsRecord(value) ||
    !hasExactFarmOsKeys(value, CREATION_RECORD_KEYS) ||
    typeof value.inbox_record_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.inbox_record_id) ||
    typeof value.proposal_id !== "string" ||
    !/^proposal_[0-9a-f]{32}$/u.test(value.proposal_id) ||
    !FARM_OS_ELIGIBLE_PROPOSAL_TYPES.includes(value.proposal_type as never) ||
    value.source_system !== "farmos_core" ||
    !isFarmOsIdentifier(value.source_reference) ||
    !isFarmOsIdentifier(value.source_version) ||
    !(value.parent_proposal_id === null || /^proposal_[0-9a-f]{32}$/u.test(String(value.parent_proposal_id))) ||
    !["hermes_advisory", "native_runtime", "human_core_author"].includes(String(value.created_by_kind)) ||
    !isFarmOsIdentifier(value.created_by_reference) ||
    !isFarmOsDigest(value.payload_hash) ||
    !isFarmOsDigest(value.idempotency_key_hash) ||
    !isFarmOsDigest(value.request_fingerprint) ||
    !isFarmOsRecord(value.payload) ||
    !isCanonicalFarmOsIso(value.payload.created_at)
  ) return null;
  const proposalType = value.proposal_type as EligibleProposalType;
  const payload = parseEligibleProposalPayload(
    proposalType,
    value.payload,
    value.payload.created_at,
  );
  const projection = value.projection;
  const registry = FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY[proposalType];
  if (
    !payload ||
    value.source_reference !== payload.source_candidate_id ||
    computeProposalPayloadHash(proposalType, payload) !== value.payload_hash ||
    !isFarmOsRecord(projection) ||
    !hasExactFarmOsKeys(projection, PROJECTION_RECORD_KEYS) ||
    projection.schema_version !== FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION ||
    projection.proposal_type !== proposalType ||
    projection.proposal_id !== value.proposal_id ||
    projection.proposal_version !== 1 ||
    projection.execution_state_version !== 1 ||
    projection.repository_state_version !== 1 ||
    projection.execution_status !== "draft" ||
    projection.proposal_status !== "draft" ||
    projection.operation_type !== registry.operation_type ||
    projection.target_system !== registry.target_system ||
    projection.required_capability !== registry.required_capability ||
    projection.target_reference !== payload.scope_constraints.target_reference ||
    hashFarmOsContract(projection.scope_constraints) !== hashFarmOsContract(payload.scope_constraints) ||
    !isFarmOsIdentifier(projection.correlation_id) ||
    !isFarmOsIdentifier(projection.causation_id) ||
    projection.proposal_expires_at !== payload.expires_at ||
    !isCanonicalFarmOsIso(projection.proposal_created_at) ||
    !isCanonicalFarmOsIso(projection.proposal_updated_at) ||
    !isCanonicalFarmOsIso(projection.state_changed_at) ||
    projection.state_changed_reason !== "proposal_created" ||
    projection.policy_version !== FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION ||
    !isFarmOsDigest(projection.proposal_snapshot_hash)
  ) return null;
  const expectedSnapshot = computeProposalExecutionSnapshotHashV1({
    snapshot_schema_version: FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION,
    contract_version: "farmos.proposal-execution-verification.v1",
    proposal_id: value.proposal_id,
    proposal_type: proposalType,
    proposal_version: 1,
    operation_type: registry.operation_type,
    target_system: registry.target_system,
    target_reference: payload.scope_constraints.target_reference,
    required_capability: registry.required_capability,
    scope_constraints: payload.scope_constraints,
    correlation_id: projection.correlation_id,
    causation_id: projection.causation_id,
    expires_at: payload.expires_at,
    execution_status: "draft",
  });
  return expectedSnapshot === projection.proposal_snapshot_hash
    ? (value as unknown as ProposalCreationRecord)
    : null;
}

export type PersistCoreProposalCandidateRequest = {
  contract_version: typeof FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION;
  proposal_type: EligibleProposalType;
  payload: unknown;
  source_system: "farmos_core";
  source_reference: string;
  source_version: string;
  parent_proposal_id: string | null;
  created_by_kind: "hermes_advisory" | "native_runtime" | "human_core_author";
  created_by_reference: string;
  correlation_id: string;
  causation_id: string;
  idempotency_key: string;
  requested_at: string;
};
export type ProposalCreationRecord = {
  inbox_record_id: string;
  proposal_id: string;
  proposal_type: EligibleProposalType;
  source_system: "farmos_core";
  source_reference: string;
  source_version: string;
  parent_proposal_id: string | null;
  created_by_kind: "hermes_advisory" | "native_runtime" | "human_core_author";
  created_by_reference: string;
  payload: EligibleProposalPayload;
  payload_hash: string;
  idempotency_key_hash: string;
  request_fingerprint: string;
  projection: ProposalExecutionState & {
    schema_version: typeof FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION;
    proposal_type: EligibleProposalType;
    execution_state_version: number;
    execution_status: ProposalExecutionProjectionStatus;
    proposal_created_at: string;
    proposal_updated_at: string;
    state_changed_at: string;
    state_changed_reason: string;
    policy_version: typeof FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION;
  };
};
export type ProposalCreationResult =
  | { result: "created"; record: ProposalCreationRecord; replay: false }
  | { result: "already_processed"; record: ProposalCreationRecord; replay: true }
  | {
      result: "rejected" | "outcome_unknown";
      rejection_code:
        | "FEATURE_DISABLED"
        | "WORKLOAD_AUTHENTICATION_FAILED"
        | "INVALID_REQUEST"
        | "UNSUPPORTED_PROPOSAL_TYPE"
        | "IDEMPOTENCY_CONFLICT"
        | "IDEMPOTENCY_PENDING"
        | "PERSISTENCE_UNAVAILABLE";
      replay: boolean;
    };

export interface ProposalCreationAuthenticationPort {
  authenticate(): Promise<
    | {
        kind: "authenticated";
        workload_id: string;
        workload_kind: "hermes_advisory" | "native_runtime" | "human_core_author";
        issuer: string;
        audience: "farmos-core.proposal-persistence";
        token_id: string;
        authenticated_at: string;
        expires_at: string;
      }
    | { kind: "rejected" | "unavailable" }
  >;
}
export interface ProposalCreationTransactionPort {
  persistAtomically(input: ProposalCreationRecord): Promise<
    | { kind: "created"; record: ProposalCreationRecord }
    | { kind: "replay"; record: ProposalCreationRecord }
    | { kind: "conflict" }
    | { kind: "pending" }
    | { kind: "outcome_unknown" }
    | { kind: "unavailable" }
  >;
}
export type ProposalPersistenceFlags = {
  eligibleProposalPersistenceEnabled: boolean;
  proposalExecutionProjectionEnabled: boolean;
};

export async function persistCoreProposalCandidate(input: {
  request: unknown;
  flags: ProposalPersistenceFlags;
  authentication: ProposalCreationAuthenticationPort;
  transaction: ProposalCreationTransactionPort;
  now: string;
  uuid?: string;
}): Promise<ProposalCreationResult> {
  if (
    !input.flags.eligibleProposalPersistenceEnabled ||
    !input.flags.proposalExecutionProjectionEnabled
  ) return { result: "rejected", rejection_code: "FEATURE_DISABLED", replay: false };
  const auth = await input.authentication.authenticate().catch(() => ({ kind: "unavailable" as const }));
  if (auth.kind !== "authenticated") {
    return {
      result: "rejected",
      rejection_code: "WORKLOAD_AUTHENTICATION_FAILED",
      replay: false,
    };
  }
  const request = input.request;
  const requestKeys = [
    "contract_version",
    "proposal_type",
    "payload",
    "source_system",
    "source_reference",
    "source_version",
    "parent_proposal_id",
    "created_by_kind",
    "created_by_reference",
    "correlation_id",
    "causation_id",
    "idempotency_key",
    "requested_at",
  ] as const;
  if (!isFarmOsRecord(request) || !hasExactFarmOsKeys(request, requestKeys)) {
    return { result: "rejected", rejection_code: "INVALID_REQUEST", replay: false };
  }
  if (
    request.contract_version !== FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION ||
    !FARM_OS_ELIGIBLE_PROPOSAL_TYPES.includes(request.proposal_type as never)
  ) return { result: "rejected", rejection_code: "UNSUPPORTED_PROPOSAL_TYPE", replay: false };
  if (
    request.source_system !== "farmos_core" ||
    !isFarmOsIdentifier(request.source_reference) ||
    String(request.source_reference).startsWith("proposal_") ||
    !isFarmOsIdentifier(request.source_version) ||
    !(request.parent_proposal_id === null || /^proposal_[0-9a-f]{32}$/u.test(String(request.parent_proposal_id))) ||
    !["hermes_advisory", "native_runtime", "human_core_author"].includes(String(request.created_by_kind)) ||
    !isFarmOsIdentifier(request.created_by_reference) ||
    request.created_by_reference !== auth.workload_id ||
    request.created_by_kind !== auth.workload_kind ||
    !isFarmOsIdentifier(request.correlation_id) ||
    !isFarmOsIdentifier(request.causation_id) ||
    !isFarmOsIdentifier(request.idempotency_key) ||
    !isCanonicalFarmOsIso(request.requested_at) ||
    Date.parse(request.requested_at as string) > Date.parse(input.now) ||
    Date.parse(input.now) - Date.parse(request.requested_at as string) > 300_000
  ) return { result: "rejected", rejection_code: "INVALID_REQUEST", replay: false };

  const proposalType = request.proposal_type as EligibleProposalType;
  const payload = parseEligibleProposalPayload(proposalType, request.payload, input.now);
  if (!payload) return { result: "rejected", rejection_code: "INVALID_REQUEST", replay: false };
  if (
    request.source_reference !== payload.source_candidate_id ||
    payload.source_candidate_id.startsWith("proposal_")
  ) return { result: "rejected", rejection_code: "INVALID_REQUEST", replay: false };
  const registry = FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY[proposalType];
  const proposalId = createCoreProposalId(input.uuid);
  if (request.parent_proposal_id === proposalId) {
    return { result: "rejected", rejection_code: "INVALID_REQUEST", replay: false };
  }
  const payloadHash = computeProposalPayloadHash(proposalType, payload);
  const idempotencyKeyHash = hashFarmOsContract({
    contract_version: FARM_OS_PROPOSAL_CREATION_IDEMPOTENCY_VERSION,
    idempotency_key: request.idempotency_key,
  });
  const requestFingerprint = hashFarmOsContract({
    contract_version: FARM_OS_PROPOSAL_CREATION_IDEMPOTENCY_VERSION,
    proposal_type: proposalType,
    payload_hash: payloadHash,
    source_reference: request.source_reference,
    parent_proposal_id: request.parent_proposal_id,
    correlation_id: request.correlation_id,
    causation_id: request.causation_id,
  });
  const targetReference = payload.scope_constraints.target_reference;
  const snapshotMaterial: ProposalExecutionSnapshotMaterial = {
    snapshot_schema_version: FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION,
    contract_version: "farmos.proposal-execution-verification.v1",
    proposal_id: proposalId,
    proposal_type: proposalType,
    proposal_version: 1,
    operation_type: registry.operation_type,
    target_system: registry.target_system,
    target_reference: targetReference,
    required_capability: registry.required_capability,
    scope_constraints: payload.scope_constraints,
    correlation_id: request.correlation_id as string,
    causation_id: request.causation_id as string,
    expires_at: payload.expires_at,
    execution_status: "draft",
  };
  const record: ProposalCreationRecord = {
    inbox_record_id: input.uuid ?? randomUUID(),
    proposal_id: proposalId,
    proposal_type: proposalType,
    source_system: "farmos_core",
    source_reference: request.source_reference as string,
    source_version: request.source_version as string,
    parent_proposal_id: request.parent_proposal_id as string | null,
    created_by_kind: auth.workload_kind,
    created_by_reference: auth.workload_id,
    payload,
    payload_hash: payloadHash,
    idempotency_key_hash: idempotencyKeyHash,
    request_fingerprint: requestFingerprint,
    projection: {
      schema_version: FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION,
      proposal_type: proposalType,
      proposal_id: proposalId,
      proposal_version: 1,
      proposal_snapshot_hash: computeProposalExecutionSnapshotHashV1(snapshotMaterial),
      proposal_status: "draft",
      operation_type: registry.operation_type,
      target_system: registry.target_system,
      target_reference: targetReference,
      required_capability: registry.required_capability,
      scope_constraints: payload.scope_constraints,
      correlation_id: request.correlation_id as string,
      causation_id: request.causation_id as string,
      proposal_expires_at: payload.expires_at,
      repository_state_version: 1,
      execution_state_version: 1,
      execution_status: "draft",
      proposal_created_at: input.now,
      proposal_updated_at: input.now,
      state_changed_at: input.now,
      state_changed_reason: "proposal_created",
      policy_version: FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION,
    },
  };
  const persisted = await input.transaction.persistAtomically(record).catch(() => ({ kind: "outcome_unknown" as const }));
  if (persisted.kind === "created") return { result: "created", record: persisted.record, replay: false };
  if (persisted.kind === "replay") return { result: "already_processed", record: persisted.record, replay: true };
  if (persisted.kind === "conflict") return { result: "rejected", rejection_code: "IDEMPOTENCY_CONFLICT", replay: false };
  if (persisted.kind === "pending") return { result: "outcome_unknown", rejection_code: "IDEMPOTENCY_PENDING", replay: true };
  return { result: "outcome_unknown", rejection_code: "PERSISTENCE_UNAVAILABLE", replay: false };
}

type StoredCreation = { fingerprint: string; record: ProposalCreationRecord; status: "succeeded" | "reserved" | "outcome_unknown" };
export class InMemoryProposalCreationTransaction implements ProposalCreationTransactionPort {
  private readonly keys = new Map<string, StoredCreation>();
  readonly rows = {
    inbox: new Map<string, ProposalCreationRecord>(),
    projection: new Map<string, ProposalCreationRecord["projection"]>(),
    proposalAudit: [] as unknown[],
    projectionAudit: [] as unknown[],
  };
  failAt: "inbox" | "projection" | "proposal_audit" | "projection_audit" | "completion" | null = null;

  seed(record: ProposalCreationRecord, status: StoredCreation["status"]): void {
    this.keys.set(record.idempotency_key_hash, {
      fingerprint: record.request_fingerprint,
      record: structuredClone(record),
      status,
    });
  }
  async persistAtomically(input: ProposalCreationRecord): Promise<
    Awaited<ReturnType<ProposalCreationTransactionPort["persistAtomically"]>>
  > {
    const existing = this.keys.get(input.idempotency_key_hash);
    if (existing) {
      if (existing.fingerprint !== input.request_fingerprint) return { kind: "conflict" };
      if (existing.status === "succeeded") return { kind: "replay", record: structuredClone(existing.record) };
      return { kind: "pending" };
    }
    const inbox = new Map(this.rows.inbox);
    const projection = new Map(this.rows.projection);
    const proposalAudit = [...this.rows.proposalAudit];
    const projectionAudit = [...this.rows.projectionAudit];
    if (this.failAt === "inbox") return { kind: "unavailable" };
    inbox.set(input.proposal_id, structuredClone(input));
    if (this.failAt === "projection") return { kind: "unavailable" };
    projection.set(input.proposal_id, structuredClone(input.projection));
    if (this.failAt === "proposal_audit") return { kind: "unavailable" };
    proposalAudit.push({ proposal_id: input.proposal_id, payload_hash: input.payload_hash });
    if (this.failAt === "projection_audit") return { kind: "unavailable" };
    projectionAudit.push({ proposal_id: input.proposal_id, snapshot_hash: input.projection.proposal_snapshot_hash });
    if (this.failAt === "completion") {
      this.keys.set(input.idempotency_key_hash, {
        fingerprint: input.request_fingerprint,
        record: structuredClone(input),
        status: "outcome_unknown",
      });
      return { kind: "outcome_unknown" };
    }
    this.rows.inbox.clear();
    inbox.forEach((value, key) => this.rows.inbox.set(key, value));
    this.rows.projection.clear();
    projection.forEach((value, key) => this.rows.projection.set(key, value));
    this.rows.proposalAudit.splice(0, this.rows.proposalAudit.length, ...proposalAudit);
    this.rows.projectionAudit.splice(0, this.rows.projectionAudit.length, ...projectionAudit);
    this.keys.set(input.idempotency_key_hash, {
      fingerprint: input.request_fingerprint,
      record: structuredClone(input),
      status: "succeeded",
    });
    return { kind: "created", record: structuredClone(input) };
  }
}

const ALLOWED_TRANSITIONS: Readonly<Record<ProposalExecutionProjectionStatus, readonly ProposalExecutionProjectionStatus[]>> = {
  draft: ["review_ready"],
  review_ready: ["execution_eligible", "rejected"],
  execution_eligible: ["expired", "superseded", "withdrawn"],
  rejected: [],
  expired: [],
  superseded: [],
  withdrawn: [],
};
export function transitionProposalExecutionState(input: {
  current: ProposalCreationRecord["projection"];
  expectedExecutionStateVersion: number;
  nextStatus: ProposalExecutionProjectionStatus;
  now: string;
  reason: string;
  supersededByProposalId?: string;
  successorProposalType?: EligibleProposalType;
  successorChain?: readonly string[];
}):
  | { result: "updated"; state: ProposalCreationRecord["projection"] }
  | { result: "rejected"; rejection_code: "VERSION_CONFLICT" | "INVALID_TRANSITION" | "SUPERSEDE_INVALID" } {
  if (input.current.execution_state_version !== input.expectedExecutionStateVersion) {
    return { result: "rejected", rejection_code: "VERSION_CONFLICT" };
  }
  if (!ALLOWED_TRANSITIONS[input.current.execution_status].includes(input.nextStatus)) {
    return { result: "rejected", rejection_code: "INVALID_TRANSITION" };
  }
  if (input.nextStatus === "superseded") {
    if (
      !input.supersededByProposalId ||
      input.supersededByProposalId === input.current.proposal_id ||
      input.successorProposalType !== input.current.proposal_type ||
      input.successorChain?.includes(input.current.proposal_id)
    ) return { result: "rejected", rejection_code: "SUPERSEDE_INVALID" };
  }
  const registry = FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY[input.current.proposal_type];
  const snapshot = computeProposalExecutionSnapshotHashV1({
    snapshot_schema_version: FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION,
    contract_version: "farmos.proposal-execution-verification.v1",
    proposal_id: input.current.proposal_id,
    proposal_type: input.current.proposal_type,
    proposal_version: input.current.proposal_version,
    operation_type: registry.operation_type,
    target_system: registry.target_system,
    target_reference: input.current.target_reference,
    required_capability: registry.required_capability,
    scope_constraints: input.current.scope_constraints,
    correlation_id: input.current.correlation_id,
    causation_id: input.current.causation_id,
    expires_at: input.current.proposal_expires_at,
    execution_status: input.nextStatus,
  });
  return {
    result: "updated",
    state: {
      ...input.current,
      execution_state_version: input.current.execution_state_version + 1,
      repository_state_version: input.current.execution_state_version + 1,
      execution_status: input.nextStatus,
      proposal_status:
        input.nextStatus === "execution_eligible"
          ? "executable"
          : input.nextStatus === "review_ready"
            ? "draft"
          : input.nextStatus === "withdrawn"
            ? "rejected"
            : input.nextStatus,
      proposal_snapshot_hash: snapshot,
      proposal_updated_at: input.now,
      state_changed_at: input.now,
      state_changed_reason: input.reason,
    },
  };
}
