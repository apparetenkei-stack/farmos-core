export const FARM_OS_RISK_POLICY_SCHEMA_VERSION = "farmos.risk.policy.v1" as const;
export const FARM_OS_RISK_POLICY_STATIC_VERSION = "1" as const;

export const FARM_OS_RISK_LEVELS = ["l0_read_only", "l1_proposal_write", "l2_internal_apply", "l3_external_execution"] as const;
export type FarmOsRiskLevel = (typeof FARM_OS_RISK_LEVELS)[number];
export const FARM_OS_POLICY_CLASSES = ["constitutional_invariant", "operational_policy", "heuristic", "user_preference", "temporary_exception"] as const;
export type FarmOsPolicyClass = (typeof FARM_OS_POLICY_CLASSES)[number];
export const FARM_OS_ROLLBACK_CLASSES = ["none", "discard", "reject_or_supersede", "reversible_internal", "compensation_required", "cancellation_or_correction"] as const;
export type FarmOsRollbackClass = (typeof FARM_OS_ROLLBACK_CLASSES)[number];
export const FARM_OS_APPROVAL_REQUIREMENTS = ["none", "authenticated_user", "human_review", "privileged_approval", "final_confirmation_and_reauthentication"] as const;
export type FarmOsApprovalRequirement = (typeof FARM_OS_APPROVAL_REQUIREMENTS)[number];
export type FarmOsProposalTypeStatus = "active" | "reserved" | "unsupported";

const parseEnum = <T extends string>(value: unknown, values: readonly T[]): T | null =>
  typeof value === "string" && values.includes(value as T) ? (value as T) : null;
export const parseFarmOsRiskLevel = (value: unknown) => parseEnum(value, FARM_OS_RISK_LEVELS);
export const parseFarmOsPolicyClass = (value: unknown) => parseEnum(value, FARM_OS_POLICY_CLASSES);
export const parseFarmOsRollbackClass = (value: unknown) => parseEnum(value, FARM_OS_ROLLBACK_CLASSES);
export const parseFarmOsApprovalRequirement = (value: unknown) => parseEnum(value, FARM_OS_APPROVAL_REQUIREMENTS);

export type FarmOsRiskPolicy = {
  schema_version: typeof FARM_OS_RISK_POLICY_SCHEMA_VERSION;
  policy_id: string;
  risk_level: FarmOsRiskLevel;
  allowed_outputs: readonly string[];
  allowed_command_classes: readonly string[];
  required_capabilities: readonly string[];
  approval_requirement: FarmOsApprovalRequirement;
  reauthorization_required: boolean;
  rollback_class: FarmOsRollbackClass;
  external_execution: boolean;
  agent_direct_execution_allowed: false;
  static_version: typeof FARM_OS_RISK_POLICY_STATIC_VERSION;
};

export const FARM_OS_RISK_POLICIES: Readonly<Record<FarmOsRiskLevel, FarmOsRiskPolicy>> = {
  l0_read_only: { schema_version: FARM_OS_RISK_POLICY_SCHEMA_VERSION, policy_id: "risk-l0", risk_level: "l0_read_only", allowed_outputs: ["observation", "attention", "analysis", "evidence", "preview"], allowed_command_classes: [], required_capabilities: [], approval_requirement: "none", reauthorization_required: false, rollback_class: "discard", external_execution: false, agent_direct_execution_allowed: false, static_version: FARM_OS_RISK_POLICY_STATIC_VERSION },
  l1_proposal_write: { schema_version: FARM_OS_RISK_POLICY_SCHEMA_VERSION, policy_id: "risk-l1", risk_level: "l1_proposal_write", allowed_outputs: ["proposal_candidate", "policy_candidate", "skill_candidate", "evolution_candidate", "persisted_proposal"], allowed_command_classes: [], required_capabilities: [], approval_requirement: "human_review", reauthorization_required: false, rollback_class: "reject_or_supersede", external_execution: false, agent_direct_execution_allowed: false, static_version: FARM_OS_RISK_POLICY_STATIC_VERSION },
  l2_internal_apply: { schema_version: FARM_OS_RISK_POLICY_SCHEMA_VERSION, policy_id: "risk-l2", risk_level: "l2_internal_apply", allowed_outputs: ["approved_internal_command_candidate"], allowed_command_classes: ["approved_internal_command"], required_capabilities: ["approve_internal_execution"], approval_requirement: "privileged_approval", reauthorization_required: true, rollback_class: "reversible_internal", external_execution: false, agent_direct_execution_allowed: false, static_version: FARM_OS_RISK_POLICY_STATIC_VERSION },
  l3_external_execution: { schema_version: FARM_OS_RISK_POLICY_SCHEMA_VERSION, policy_id: "risk-l3", risk_level: "l3_external_execution", allowed_outputs: ["approved_external_command_candidate"], allowed_command_classes: ["approved_external_command"], required_capabilities: ["approve_external_execution"], approval_requirement: "final_confirmation_and_reauthentication", reauthorization_required: true, rollback_class: "cancellation_or_correction", external_execution: true, agent_direct_execution_allowed: false, static_version: FARM_OS_RISK_POLICY_STATIC_VERSION },
};

export function assertNoDirectAgentExecution(value: unknown): value is FarmOsRiskPolicy {
  if (!value || typeof value !== "object" || (value as Record<string, unknown>).agent_direct_execution_allowed !== false) throw new Error("direct_agent_execution_forbidden");
  return true;
}

export type FarmOsProposalRegistryEntry = { status: FarmOsProposalTypeStatus; risk_level: FarmOsRiskLevel };
export const FARM_OS_PROPOSAL_REGISTRY: Readonly<Record<string, FarmOsProposalRegistryEntry>> = {
  work_log_follow_up: { status: "active", risk_level: "l1_proposal_write" },
};
export function parseFarmOsProposalType(value: unknown): { proposal_type: string; entry: FarmOsProposalRegistryEntry } | null {
  if (typeof value !== "string" || !Object.hasOwn(FARM_OS_PROPOSAL_REGISTRY, value)) return null;
  return { proposal_type: value, entry: FARM_OS_PROPOSAL_REGISTRY[value] };
}
export function classifyProposalRisk(value: unknown): FarmOsRiskPolicy | null {
  const proposal = parseFarmOsProposalType(value);
  return proposal ? FARM_OS_RISK_POLICIES[proposal.entry.risk_level] : null;
}
export function resolveRiskPolicy(value: unknown) {
  const proposal = parseFarmOsProposalType(value);
  if (!proposal) return null;
  const risk = FARM_OS_RISK_POLICIES[proposal.entry.risk_level];
  assertNoDirectAgentExecution(risk);
  return { ...risk, proposal_type: proposal.proposal_type, proposal_type_status: proposal.entry.status, native_runtime_candidate_generation_allowed: proposal.entry.status === "active", operator_shadow_candidate_allowed: false, observer_candidate_allowed: false, formal_persistence_allowed: false } as const;
}

const TEMPORARY_EXCEPTION_KEYS = ["issuer", "reason", "scope", "valid_from", "valid_until", "audit_reference", "revoke_condition", "post_review_required", "approval_bypass_requested", "risk_downgrade_requested", "capability_additions", "agent_direct_execution_requested", "arbitrary_url_requested", "secret_access_requested", "invariant_override_requested"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
export function validateTemporaryException(value: unknown): { valid: boolean; blocked_reason: string | null } {
  if (!isRecord(value) || !exactKeys(value, TEMPORARY_EXCEPTION_KEYS)) return { valid: false, blocked_reason: "invalid_temporary_exception" };
  for (const key of ["issuer", "reason", "scope", "valid_from", "valid_until", "audit_reference", "revoke_condition"] as const) if (typeof value[key] !== "string" || value[key].length === 0) return { valid: false, blocked_reason: "invalid_temporary_exception" };
  if (value.post_review_required !== true || !Array.isArray(value.capability_additions) || value.capability_additions.some((item) => typeof item !== "string")) return { valid: false, blocked_reason: "invalid_temporary_exception" };
  for (const key of ["approval_bypass_requested", "risk_downgrade_requested", "agent_direct_execution_requested", "arbitrary_url_requested", "secret_access_requested", "invariant_override_requested"] as const) if (typeof value[key] !== "boolean") return { valid: false, blocked_reason: "invalid_temporary_exception" };
  const from = Date.parse(value.valid_from as string), until = Date.parse(value.valid_until as string);
  if (!Number.isFinite(from) || !Number.isFinite(until)) return { valid: false, blocked_reason: "invalid_timestamp" };
  if (until <= from || value.approval_bypass_requested || value.risk_downgrade_requested || value.capability_additions.length > 0 || value.agent_direct_execution_requested || value.arbitrary_url_requested || value.secret_access_requested || value.invariant_override_requested) return { valid: false, blocked_reason: "invalid_temporary_exception" };
  return { valid: true, blocked_reason: null };
}

const OVERRIDE_KEYS = ["source_policy_class", "target_policy_class", "requested_risk_change", "requested_capability_additions", "requested_approval_change", "requested_direct_execution_change"] as const;
const riskRank: Record<FarmOsRiskLevel, number> = { l0_read_only: 0, l1_proposal_write: 1, l2_internal_apply: 2, l3_external_execution: 3 };
export function validatePolicyOverrideAttempt(value: unknown): { valid: boolean; blocked_reason: string | null } {
  if (!isRecord(value) || !exactKeys(value, OVERRIDE_KEYS)) return { valid: false, blocked_reason: "policy_override_not_allowed" };
  const source = parseFarmOsPolicyClass(value.source_policy_class), target = parseFarmOsPolicyClass(value.target_policy_class);
  const risk = isRecord(value.requested_risk_change) ? value.requested_risk_change : null;
  const fromRisk = risk ? parseFarmOsRiskLevel(risk.from) : null, toRisk = risk ? parseFarmOsRiskLevel(risk.to) : null;
  const approvalChange = isRecord(value.requested_approval_change) ? value.requested_approval_change : null;
  const fromApproval = approvalChange ? parseFarmOsApprovalRequirement(approvalChange.from) : null, toApproval = approvalChange ? parseFarmOsApprovalRequirement(approvalChange.to) : null;
  if (!source || !target || !fromRisk || !toRisk || !Array.isArray(value.requested_capability_additions) || !fromApproval || !toApproval || typeof value.requested_direct_execution_change !== "boolean") return { valid: false, blocked_reason: "policy_override_not_allowed" };
  const forbiddenHierarchy = (source === "heuristic" && ["operational_policy", "constitutional_invariant"].includes(target)) || (source === "user_preference" && ["operational_policy", "constitutional_invariant"].includes(target)) || (source === "temporary_exception" && target === "constitutional_invariant");
  const approvalRank: Record<FarmOsApprovalRequirement, number> = { none: 0, authenticated_user: 1, human_review: 2, privileged_approval: 3, final_confirmation_and_reauthentication: 4 };
  if (forbiddenHierarchy || riskRank[toRisk] < riskRank[fromRisk] || approvalRank[toApproval] < approvalRank[fromApproval] || value.requested_capability_additions.length > 0 || value.requested_direct_execution_change) return { valid: false, blocked_reason: "policy_override_not_allowed" };
  return { valid: true, blocked_reason: null };
}

export function validateCommandPolicyInput(value: unknown): { valid: false; blocked_reason: string } | { valid: true; blocked_reason: null } {
  if (!isRecord(value)) return { valid: false, blocked_reason: "natural_language_command_not_allowed" };
  if (value.natural_language_command !== undefined) return { valid: false, blocked_reason: "natural_language_command_not_allowed" };
  if (value.arbitrary_target !== undefined) return { valid: false, blocked_reason: "arbitrary_target_not_allowed" };
  if (value.arbitrary_url !== undefined) return { valid: false, blocked_reason: "arbitrary_url_not_allowed" };
  if (value.unapproved_command !== undefined) return { valid: false, blocked_reason: "unapproved_command_not_allowed" };
  if (value.direct_gateway_invocation !== undefined) return { valid: false, blocked_reason: "direct_gateway_invocation_not_allowed" };
  return { valid: true, blocked_reason: null };
}
