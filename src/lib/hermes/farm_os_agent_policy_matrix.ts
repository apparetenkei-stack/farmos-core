import type { FarmAgentRuntimeTaskType } from "./farm_agent_runtime_port";
import { FARM_OS_RISK_POLICIES, parseFarmOsRiskLevel, resolveRiskPolicy, type FarmOsRiskLevel } from "./farm_os_risk_taxonomy";

export const FARM_OS_ACTORS = ["native_runtime", "nous_hermes_operator", "nous_hermes_observer", "generic_agent_runtime", "human_reviewer", "approved_command_builder", "execution_gateway"] as const;
export type FarmOsActor = (typeof FARM_OS_ACTORS)[number];
export const FARM_OS_ACTIONS = ["read_context", "produce_observation", "produce_attention", "produce_proposal_candidate", "persist_proposal", "make_review_decision", "build_approved_command", "call_execution_gateway", "perform_internal_apply", "perform_external_execution", "create_policy_candidate", "adopt_policy", "create_skill_candidate", "install_skill", "create_evolution_candidate", "accept_evolution_candidate"] as const;
export type FarmOsAction = (typeof FARM_OS_ACTIONS)[number];
export const parseFarmOsActor = (value: unknown): FarmOsActor | null => typeof value === "string" && FARM_OS_ACTORS.includes(value as FarmOsActor) ? value as FarmOsActor : null;
export const parseFarmOsAction = (value: unknown): FarmOsAction | null => typeof value === "string" && FARM_OS_ACTIONS.includes(value as FarmOsAction) ? value as FarmOsAction : null;

export type FarmOsAgentPolicyEntry = { schema_version: "farmos.agent.policy.entry.v1"; actor: FarmOsActor; action: FarmOsAction; allowed_risk_levels: readonly FarmOsRiskLevel[]; decision: "allow" | "deny"; required_capabilities: readonly string[]; required_evidence: readonly ("approval_evidence" | "approved_proposal_evidence" | "approved_command_evidence")[]; agent_direct_execution_allowed: false; blocked_reason_when_missing: string; static_version: "1" };
const allowed = new Map<string, Pick<FarmOsAgentPolicyEntry, "allowed_risk_levels" | "required_capabilities" | "required_evidence">>();
const allow = (actor: FarmOsActor, action: FarmOsAction, risks: readonly FarmOsRiskLevel[], capabilities: readonly string[] = [], evidence: FarmOsAgentPolicyEntry["required_evidence"] = []) => allowed.set(`${actor}:${action}`, { allowed_risk_levels: risks, required_capabilities: capabilities, required_evidence: evidence });
for (const action of ["read_context", "produce_observation", "produce_attention"] as const) { allow("native_runtime", action, ["l0_read_only"]); allow("nous_hermes_operator", action, ["l0_read_only"]); allow("nous_hermes_observer", action, ["l0_read_only"]); }
allow("native_runtime", "produce_proposal_candidate", ["l1_proposal_write"]);
allow("nous_hermes_operator", "produce_proposal_candidate", ["l1_proposal_write"]);
allow("nous_hermes_observer", "create_policy_candidate", ["l1_proposal_write"]);
allow("nous_hermes_observer", "create_skill_candidate", ["l1_proposal_write"]);
allow("nous_hermes_observer", "create_evolution_candidate", ["l1_proposal_write"]);
allow("human_reviewer", "make_review_decision", ["l1_proposal_write"], ["review_operational_proposal"], ["approval_evidence"]);
allow("approved_command_builder", "build_approved_command", ["l2_internal_apply", "l3_external_execution"], ["build_approved_command"], ["approved_proposal_evidence", "approval_evidence"]);
allow("execution_gateway", "perform_internal_apply", ["l2_internal_apply"], ["approve_internal_execution"], ["approved_command_evidence"]);
allow("execution_gateway", "perform_external_execution", ["l3_external_execution"], ["approve_external_execution"], ["approved_command_evidence"]);

export const FARM_OS_AGENT_POLICY_MATRIX: readonly FarmOsAgentPolicyEntry[] = FARM_OS_ACTORS.flatMap((actor) => FARM_OS_ACTIONS.map((action) => {
  const policy = allowed.get(`${actor}:${action}`);
  return { schema_version: "farmos.agent.policy.entry.v1", actor, action, allowed_risk_levels: policy?.allowed_risk_levels ?? [], decision: policy ? "allow" : "deny", required_capabilities: policy?.required_capabilities ?? [], required_evidence: policy?.required_evidence ?? [], agent_direct_execution_allowed: false, blocked_reason_when_missing: policy ? "missing_required_capability" : "actor_action_not_allowed", static_version: "1" } as const;
}));

export type FarmOsPolicyEvaluationInput = { actor: unknown; action: unknown; risk_level: unknown; capabilities?: readonly string[]; approval_evidence?: unknown; approved_proposal_evidence?: unknown; approved_command_evidence?: unknown };
export type FarmOsPolicyEvaluation = { allowed: boolean; blocked_reason: string | null; entry: FarmOsAgentPolicyEntry | null };
export function evaluateFarmOsAgentPolicy(input: FarmOsPolicyEvaluationInput): FarmOsPolicyEvaluation {
  const actor = parseFarmOsActor(input.actor); if (!actor) return { allowed: false, blocked_reason: "unknown_actor", entry: null };
  const action = parseFarmOsAction(input.action); if (!action) return { allowed: false, blocked_reason: "unknown_action", entry: null };
  const risk = parseFarmOsRiskLevel(input.risk_level); if (!risk) return { allowed: false, blocked_reason: "unknown_risk_level", entry: null };
  const entry = FARM_OS_AGENT_POLICY_MATRIX.find((item) => item.actor === actor && item.action === action)!;
  if (entry.decision === "deny" || !entry.allowed_risk_levels.includes(risk)) return { allowed: false, blocked_reason: "actor_action_not_allowed", entry };
  const capabilities = input.capabilities ?? [];
  if (entry.required_capabilities.some((capability) => !capabilities.includes(capability))) return { allowed: false, blocked_reason: "missing_required_capability", entry };
  if (entry.required_evidence.some((key) => input[key] === undefined || input[key] === null)) return { allowed: false, blocked_reason: "approval_required", entry };
  return { allowed: true, blocked_reason: null, entry };
}

export const FARM_OS_RUNTIME_TASK_REGISTRY: Readonly<Record<FarmAgentRuntimeTaskType, { action: FarmOsAction; risk_level: FarmOsRiskLevel; allowed_actors: readonly FarmOsActor[] }>> = {
  consultation: { action: "read_context", risk_level: "l0_read_only", allowed_actors: ["native_runtime", "nous_hermes_operator", "nous_hermes_observer"] },
  daily_brief_analysis: { action: "produce_attention", risk_level: "l0_read_only", allowed_actors: ["native_runtime"] },
  observation_draft: { action: "produce_observation", risk_level: "l0_read_only", allowed_actors: ["native_runtime", "nous_hermes_operator", "nous_hermes_observer"] },
  architecture_finding: { action: "create_evolution_candidate", risk_level: "l1_proposal_write", allowed_actors: ["nous_hermes_observer"] },
  skill_candidate: { action: "create_skill_candidate", risk_level: "l1_proposal_write", allowed_actors: ["nous_hermes_observer"] },
  migration_readiness: { action: "create_evolution_candidate", risk_level: "l1_proposal_write", allowed_actors: ["nous_hermes_observer"] },
};
export function resolveRuntimeTaskPolicy(value: unknown) { return typeof value === "string" && Object.hasOwn(FARM_OS_RUNTIME_TASK_REGISTRY, value) ? FARM_OS_RUNTIME_TASK_REGISTRY[value as FarmAgentRuntimeTaskType] : null; }
export function guardFarmOsRuntimeRequest(input: { actor: unknown; task_type: unknown; proposal_type?: unknown; declared_risk_level?: unknown; capabilities?: readonly string[] }): string | null {
  const actor = parseFarmOsActor(input.actor); if (!actor) return "unknown_actor";
  const task = resolveRuntimeTaskPolicy(input.task_type); if (!task) return "unknown_task_type";
  if (!task.allowed_actors.includes(actor)) return "actor_action_not_allowed";
  if (input.declared_risk_level !== undefined) { const declared = parseFarmOsRiskLevel(input.declared_risk_level); if (!declared) return "unknown_risk_level"; if (declared !== task.risk_level) return "risk_mismatch"; }
  if (input.proposal_type !== undefined) { const proposal = resolveRiskPolicy(input.proposal_type); if (!proposal) return "unknown_proposal_type"; if (proposal.proposal_type_status === "reserved") return "reserved_proposal_type_not_executable"; if (proposal.proposal_type_status === "unsupported") return "unsupported_proposal_type"; if (proposal.risk_level !== task.risk_level) return "risk_mismatch"; }
  return evaluateFarmOsAgentPolicy({ actor, action: task.action, risk_level: task.risk_level, capabilities: input.capabilities }).blocked_reason;
}

export function validateMatrixCompleteness() {
  const keys = FARM_OS_AGENT_POLICY_MATRIX.map((entry) => `${entry.actor}:${entry.action}`), unique = new Set(keys);
  return { actor_count: FARM_OS_ACTORS.length, action_count: FARM_OS_ACTIONS.length, expected_pair_count: FARM_OS_ACTORS.length * FARM_OS_ACTIONS.length, actual_pair_count: keys.length, unique_pair_count: unique.size, missing_pair_count: FARM_OS_ACTORS.length * FARM_OS_ACTIONS.length - unique.size, duplicate_pair_count: keys.length - unique.size, direct_execution_true_count: FARM_OS_AGENT_POLICY_MATRIX.filter((entry) => entry.agent_direct_execution_allowed !== false).length };
}
export { FARM_OS_RISK_POLICIES };
