import { createHash } from "node:crypto";
import {
  parseFarmOsApprovedProposal,
  type FarmOsApprovedProposal,
  type FarmOsContractParseResult,
} from "./farm_os_approved_proposal_contract";
import {
  resolveFarmOsCommandClass,
  type FarmOsCommandClass,
} from "./farm_os_command_registry";
import type { FarmOsRiskLevel, FarmOsRollbackClass } from "./farm_os_risk_taxonomy";
import { resolveRiskPolicy } from "./farm_os_risk_taxonomy";

export const FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION =
  "farmos.approved.command.v1" as const;
export const FARM_OS_APPROVED_COMMAND_BUILDER_VERSION = "1" as const;

export type FarmOsApprovedCommand = {
  schema_version: typeof FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION;
  command_id: string;
  command_hash: string;
  proposal_hash: string;
  builder_version: typeof FARM_OS_APPROVED_COMMAND_BUILDER_VERSION;
  command_class: FarmOsCommandClass;
  command_version: 1;
  proposal_reference: {
    proposal_id: string;
    proposal_type: string;
    proposal_version: number;
  };
  risk_level: Extract<FarmOsRiskLevel, "l2_internal_apply" | "l3_external_execution">;
  required_capabilities: readonly string[];
  approval_evidence: FarmOsApprovedProposal["approval_evidence"];
  reauthorization_required: true;
  rollback_class: FarmOsRollbackClass;
  execution_scope: {
    scope_kind: "approved_proposal_only";
    proposal_type: string;
  };
  execution_target: {
    target_kind: "reserved_internal_target" | "reserved_external_target";
    target_reference: string;
  };
  execution_payload: {
    schema_version: "farmos.approved.command.payload.reservation.v1";
    operation: "reserved_no_execution";
    parameters: Readonly<Record<string, string | number | boolean | null>>;
  };
  audit: {
    built_at: string;
    builder_id: "farm-os-approved-command-builder";
  };
  trace: FarmOsApprovedProposal["trace"];
};

export type FarmOsApprovedCommandReservation = {
  command_id: string;
  command_hash: string;
  proposal_hash: string;
  builder_version: typeof FARM_OS_APPROVED_COMMAND_BUILDER_VERSION;
  persisted: false;
};

export type FarmOsApprovedCommandBuildResult =
  | {
      result: "built";
      blocked_reason: null;
      command: FarmOsApprovedCommand;
      reservation: FarmOsApprovedCommandReservation;
      gateway_call_count: 0;
      internal_execution_count: 0;
      external_execution_count: 0;
    }
  | {
      result: "rejected";
      blocked_reason: string;
      command: null;
      reservation: null;
      gateway_call_count: 0;
      internal_execution_count: 0;
      external_execution_count: 0;
    };

const COMMAND_KEYS = [
  "schema_version", "command_id", "command_hash", "proposal_hash",
  "builder_version", "command_class", "command_version", "proposal_reference",
  "risk_level", "required_capabilities", "approval_evidence",
  "reauthorization_required", "rollback_class", "execution_scope",
  "execution_target", "execution_payload", "audit", "trace",
] as const;
const REFERENCE_KEYS = ["proposal_id", "proposal_type", "proposal_version"] as const;
const SCOPE_KEYS = ["scope_kind", "proposal_type"] as const;
const TARGET_KEYS = ["target_kind", "target_reference"] as const;
const PAYLOAD_KEYS = ["schema_version", "operation", "parameters"] as const;
const AUDIT_KEYS = ["built_at", "builder_id"] as const;
const APPROVAL_KEYS = ["evidence_id", "approval_requirement", "capabilities", "approved_at", "approved_by", "reauthenticated_at"] as const;
const TRACE_KEYS = ["request_id", "correlation_id", "source_event_hash"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const canonicalIso = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
const digest = (value: unknown): value is string => typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-z][a-z0-9_-]{7,127}$/u.test(value);
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const hash = (value: unknown) => `sha256:${createHash("sha256").update(canonical(value), "utf8").digest("hex")}`;
const containsForbiddenExecutionValue = (value: unknown): boolean => {
  if (typeof value === "string") return /(?:https?:\/\/|natural_language_command|direct_gateway|shell|browser)/iu.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenExecutionValue);
  return isRecord(value) && Object.entries(value).some(([key, item]) => /(?:url|secret|credential|command_text)/iu.test(key) || containsForbiddenExecutionValue(item));
};
const isParameterRecord = (
  value: unknown,
): value is Readonly<Record<string, string | number | boolean | null>> =>
  isRecord(value) &&
  Object.values(value).every(
    (item) => item === null || ["string", "number", "boolean"].includes(typeof item),
  );
const exactStringSet = (value: unknown, expected: readonly string[]): value is string[] =>
  Array.isArray(value) && value.length === expected.length &&
  value.every((item) => typeof item === "string" && expected.includes(item)) &&
  new Set(value).size === value.length;

export function parseFarmOsApprovedCommand(value: unknown): FarmOsContractParseResult<FarmOsApprovedCommand> {
  if (!isRecord(value) || !exactKeys(value, COMMAND_KEYS)) return { valid: false, value: null, blocked_reason: "invalid_schema" };
  const commandPolicy = resolveFarmOsCommandClass(value.command_class);
  if (!commandPolicy) return { valid: false, value: null, blocked_reason: "unknown_command_class" };
  if (value.schema_version !== FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION || value.builder_version !== FARM_OS_APPROVED_COMMAND_BUILDER_VERSION || value.command_version !== 1 || !identifier(value.command_id) || !digest(value.command_hash) || !digest(value.proposal_hash)) return { valid: false, value: null, blocked_reason: "invalid_schema" };
  const expectedCommandId = `command_${(value.proposal_hash as string).slice("sha256:".length, "sha256:".length + 32)}`;
  if (value.command_id !== expectedCommandId) return { valid: false, value: null, blocked_reason: "command_id_mismatch" };
  if (value.risk_level !== commandPolicy.risk_level || value.reauthorization_required !== true || !exactStringSet(value.required_capabilities, commandPolicy.required_capabilities)) return { valid: false, value: null, blocked_reason: "risk_or_capability_mismatch" };
  if (!isRecord(value.proposal_reference) || !exactKeys(value.proposal_reference, REFERENCE_KEYS) || !identifier(value.proposal_reference.proposal_id) || typeof value.proposal_reference.proposal_type !== "string" || !Number.isSafeInteger(value.proposal_reference.proposal_version) || (value.proposal_reference.proposal_version as number) < 1) return { valid: false, value: null, blocked_reason: "invalid_proposal_reference" };
  const proposalPolicy = resolveRiskPolicy(value.proposal_reference.proposal_type);
  if (!proposalPolicy || proposalPolicy.proposal_type_status !== "active") return { valid: false, value: null, blocked_reason: "invalid_proposal_reference" };
  if (!isRecord(value.approval_evidence) || !exactKeys(value.approval_evidence, APPROVAL_KEYS)) return { valid: false, value: null, blocked_reason: "approval_evidence_invalid" };
  const approval = value.approval_evidence;
  const expectedApproval = commandPolicy.risk_level === "l2_internal_apply" ? "privileged_approval" : "final_confirmation_and_reauthentication";
  if (!identifier(approval.evidence_id) || approval.approval_requirement !== expectedApproval || !exactStringSet(approval.capabilities, commandPolicy.required_capabilities) || !canonicalIso(approval.approved_at) || typeof approval.approved_by !== "string" || approval.approved_by.trim().length === 0 || !canonicalIso(approval.reauthenticated_at) || Date.parse(approval.reauthenticated_at as string) > Date.parse(approval.approved_at as string)) return { valid: false, value: null, blocked_reason: "approval_evidence_invalid" };
  const expectedRollback = commandPolicy.risk_level === "l2_internal_apply" ? "reversible_internal" : "cancellation_or_correction";
  if (value.rollback_class !== expectedRollback) return { valid: false, value: null, blocked_reason: "rollback_class_mismatch" };
  if (!isRecord(value.execution_scope) || !exactKeys(value.execution_scope, SCOPE_KEYS) || value.execution_scope.scope_kind !== "approved_proposal_only" || value.execution_scope.proposal_type !== value.proposal_reference.proposal_type) return { valid: false, value: null, blocked_reason: "invalid_execution_scope" };
  const targetKind = commandPolicy.external_execution ? "reserved_external_target" : "reserved_internal_target";
  if (!isRecord(value.execution_target) || !exactKeys(value.execution_target, TARGET_KEYS) || value.execution_target.target_kind !== targetKind || value.execution_target.target_reference !== value.proposal_reference.proposal_id) return { valid: false, value: null, blocked_reason: "invalid_execution_target" };
  if (!isRecord(value.execution_payload) || !exactKeys(value.execution_payload, PAYLOAD_KEYS) || value.execution_payload.schema_version !== "farmos.approved.command.payload.reservation.v1" || value.execution_payload.operation !== "reserved_no_execution" || !isRecord(value.execution_payload.parameters) || containsForbiddenExecutionValue(value.execution_payload.parameters)) return { valid: false, value: null, blocked_reason: "invalid_execution_payload" };
  if (Object.values(value.execution_payload.parameters).some((item) => item !== null && !["string", "number", "boolean"].includes(typeof item))) return { valid: false, value: null, blocked_reason: "invalid_execution_payload" };
  if (!isRecord(value.audit) || !exactKeys(value.audit, AUDIT_KEYS) || value.audit.builder_id !== "farm-os-approved-command-builder" || !canonicalIso(value.audit.built_at) || Date.parse(value.audit.built_at as string) < Date.parse(approval.approved_at as string)) return { valid: false, value: null, blocked_reason: "invalid_audit" };
  if (!isRecord(value.trace) || !exactKeys(value.trace, TRACE_KEYS) || !identifier(value.trace.request_id) || !identifier(value.trace.correlation_id) || !digest(value.trace.source_event_hash)) return { valid: false, value: null, blocked_reason: "invalid_trace" };
  const candidate = { ...value }; delete candidate.command_hash;
  if (value.command_hash !== hash(candidate)) return { valid: false, value: null, blocked_reason: "command_hash_mismatch" };
  return { valid: true, value: value as FarmOsApprovedCommand, blocked_reason: null };
}

const rejected = (blocked_reason: string): FarmOsApprovedCommandBuildResult => ({ result: "rejected", blocked_reason, command: null, reservation: null, gateway_call_count: 0, internal_execution_count: 0, external_execution_count: 0 });

export function buildFarmOsApprovedCommand(input: {
  approved_proposal: unknown;
  command_class: unknown;
  capabilities: readonly string[];
  execution_target_reference: unknown;
  parameters: unknown;
  built_at: unknown;
  reserved_command_hashes?: readonly string[];
}): FarmOsApprovedCommandBuildResult {
  const parsedProposal = parseFarmOsApprovedProposal(input.approved_proposal);
  if (!parsedProposal.valid) return rejected(parsedProposal.blocked_reason);
  const proposal = parsedProposal.value;
  const commandPolicy = resolveFarmOsCommandClass(input.command_class);
  if (!commandPolicy) return rejected("unknown_command_class");
  if (proposal.approved_outputs[0] !== commandPolicy.command_class || proposal.risk_level !== commandPolicy.risk_level) return rejected("risk_mismatch");
  if (commandPolicy.required_capabilities.some((capability) => !input.capabilities.includes(capability))) return rejected("missing_required_capability");
  if (input.execution_target_reference !== proposal.proposal_id) return rejected("invalid_execution_target");
  if (!isParameterRecord(input.parameters) || containsForbiddenExecutionValue(input.parameters)) return rejected("invalid_execution_payload");
  if (!canonicalIso(input.built_at)) return rejected("invalid_timestamp");
  const proposalHash = hash(proposal);
  const commandId = `command_${proposalHash.slice("sha256:".length, "sha256:".length + 32)}`;
  const rollbackClass: Extract<
    FarmOsRollbackClass,
    "reversible_internal" | "cancellation_or_correction"
  > = commandPolicy.risk_level === "l2_internal_apply"
    ? "reversible_internal"
    : "cancellation_or_correction";
  const draft = {
    schema_version: FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION,
    command_id: commandId,
    proposal_hash: proposalHash,
    builder_version: FARM_OS_APPROVED_COMMAND_BUILDER_VERSION,
    command_class: commandPolicy.command_class,
    command_version: 1 as const,
    proposal_reference: { proposal_id: proposal.proposal_id, proposal_type: proposal.proposal_type, proposal_version: proposal.proposal_version },
    risk_level: commandPolicy.risk_level,
    required_capabilities: commandPolicy.required_capabilities,
    approval_evidence: proposal.approval_evidence,
    reauthorization_required: true as const,
    rollback_class: rollbackClass,
    execution_scope: { scope_kind: "approved_proposal_only" as const, proposal_type: proposal.proposal_type },
    execution_target: { target_kind: (commandPolicy.external_execution ? "reserved_external_target" : "reserved_internal_target") as "reserved_internal_target" | "reserved_external_target", target_reference: input.execution_target_reference },
    execution_payload: { schema_version: "farmos.approved.command.payload.reservation.v1" as const, operation: "reserved_no_execution" as const, parameters: input.parameters },
    audit: { built_at: input.built_at, builder_id: "farm-os-approved-command-builder" as const },
    trace: proposal.trace,
  };
  const commandHash = hash(draft);
  if ((input.reserved_command_hashes ?? []).includes(commandHash)) return rejected("duplicate_command");
  const command: FarmOsApprovedCommand = { ...draft, command_hash: commandHash };
  const parsedCommand = parseFarmOsApprovedCommand(command);
  if (!parsedCommand.valid) return rejected(parsedCommand.blocked_reason);
  return { result: "built", blocked_reason: null, command, reservation: { command_id: command.command_id, command_hash: command.command_hash, proposal_hash: command.proposal_hash, builder_version: command.builder_version, persisted: false }, gateway_call_count: 0, internal_execution_count: 0, external_execution_count: 0 };
}
