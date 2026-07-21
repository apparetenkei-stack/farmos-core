import {
  FARM_OS_RISK_POLICIES,
  resolveRiskPolicy,
  type FarmOsApprovalRequirement,
  type FarmOsRiskLevel,
} from "./farm_os_risk_taxonomy";
import {
  resolveFarmOsCommandClass,
  type FarmOsCommandClass,
} from "./farm_os_command_registry";

export const FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION =
  "farmos.approved.proposal.v1" as const;

export type FarmOsApprovalEvidence = {
  evidence_id: string;
  approval_requirement: FarmOsApprovalRequirement;
  capabilities: readonly string[];
  approved_at: string;
  approved_by: string;
  reauthenticated_at: string;
};

export type FarmOsApprovedProposal = {
  schema_version: typeof FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION;
  proposal_id: string;
  proposal_type: string;
  proposal_version: number;
  risk_level: Extract<FarmOsRiskLevel, "l2_internal_apply" | "l3_external_execution">;
  review_result: "approved";
  review_timestamp: string;
  review_actor: "human_reviewer";
  approval_requirement: FarmOsApprovalRequirement;
  approval_evidence: FarmOsApprovalEvidence;
  approved_outputs: readonly [FarmOsCommandClass];
  source_runtime: "farmos-native-runtime";
  trace: {
    request_id: string;
    correlation_id: string;
    source_event_hash: string;
  };
  audit: {
    review_audit_reference: string;
    recorded_at: string;
  };
};

export type FarmOsContractParseResult<T> =
  | { valid: true; value: T; blocked_reason: null }
  | { valid: false; value: null; blocked_reason: string };

const TOP_LEVEL_KEYS = [
  "schema_version", "proposal_id", "proposal_type", "proposal_version",
  "risk_level", "review_result", "review_timestamp", "review_actor",
  "approval_requirement", "approval_evidence", "approved_outputs",
  "source_runtime", "trace", "audit",
] as const;
const APPROVAL_KEYS = [
  "evidence_id", "approval_requirement", "capabilities", "approved_at",
  "approved_by", "reauthenticated_at",
] as const;
const TRACE_KEYS = ["request_id", "correlation_id", "source_event_hash"] as const;
const AUDIT_KEYS = ["review_audit_reference", "recorded_at"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const canonicalIso = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
};
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9_-]{7,127}$/u.test(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
const exactStringSet = (value: unknown, expected: readonly string[]): value is string[] =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((item) => typeof item === "string" && expected.includes(item)) &&
  new Set(value).size === value.length;

export function parseFarmOsApprovedProposal(
  value: unknown,
): FarmOsContractParseResult<FarmOsApprovedProposal> {
  if (!isRecord(value) || !exactKeys(value, TOP_LEVEL_KEYS)) {
    return { valid: false, value: null, blocked_reason: "invalid_schema" };
  }
  if (
    value.schema_version !== FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION ||
    !identifier(value.proposal_id) ||
    !Number.isSafeInteger(value.proposal_version) ||
    (value.proposal_version as number) < 1 ||
    value.review_result !== "approved" ||
    !canonicalIso(value.review_timestamp) ||
    value.review_actor !== "human_reviewer" ||
    value.source_runtime !== "farmos-native-runtime"
  ) return { valid: false, value: null, blocked_reason: "invalid_schema" };

  const proposalPolicy = resolveRiskPolicy(value.proposal_type);
  if (!proposalPolicy) {
    return { valid: false, value: null, blocked_reason: "unknown_proposal_type" };
  }
  if (proposalPolicy.proposal_type_status !== "active") {
    return { valid: false, value: null, blocked_reason: "proposal_type_not_active" };
  }
  if (!Array.isArray(value.approved_outputs) || value.approved_outputs.length !== 1) {
    return { valid: false, value: null, blocked_reason: "invalid_output_class" };
  }
  const commandPolicy = resolveFarmOsCommandClass(value.approved_outputs[0]);
  if (!commandPolicy) {
    return { valid: false, value: null, blocked_reason: "unknown_command_class" };
  }
  if (value.risk_level !== commandPolicy.risk_level) {
    return { valid: false, value: null, blocked_reason: "risk_mismatch" };
  }
  const riskPolicy = FARM_OS_RISK_POLICIES[commandPolicy.risk_level];
  if (value.approval_requirement !== riskPolicy.approval_requirement) {
    return { valid: false, value: null, blocked_reason: "approval_requirement_mismatch" };
  }

  if (!isRecord(value.approval_evidence) || !exactKeys(value.approval_evidence, APPROVAL_KEYS)) {
    return { valid: false, value: null, blocked_reason: "approval_evidence_invalid" };
  }
  const evidence = value.approval_evidence;
  if (
    !identifier(evidence.evidence_id) ||
    evidence.approval_requirement !== riskPolicy.approval_requirement ||
    !exactStringSet(evidence.capabilities, riskPolicy.required_capabilities) ||
    !canonicalIso(evidence.approved_at) ||
    !nonEmpty(evidence.approved_by) ||
    !canonicalIso(evidence.reauthenticated_at) ||
    Date.parse(evidence.reauthenticated_at as string) >
      Date.parse(evidence.approved_at as string)
  ) return { valid: false, value: null, blocked_reason: "approval_evidence_invalid" };

  if (!isRecord(value.trace) || !exactKeys(value.trace, TRACE_KEYS) ||
    !identifier(value.trace.request_id) || !identifier(value.trace.correlation_id) ||
    !digest(value.trace.source_event_hash)) {
    return { valid: false, value: null, blocked_reason: "invalid_trace" };
  }
  if (!isRecord(value.audit) || !exactKeys(value.audit, AUDIT_KEYS) ||
    !identifier(value.audit.review_audit_reference) ||
    !canonicalIso(value.audit.recorded_at)) {
    return { valid: false, value: null, blocked_reason: "invalid_audit" };
  }
  if (Date.parse(evidence.approved_at as string) !== Date.parse(value.review_timestamp as string)) {
    return { valid: false, value: null, blocked_reason: "approval_evidence_mismatch" };
  }
  return { valid: true, value: value as FarmOsApprovedProposal, blocked_reason: null };
}

type JsonCursor = { index: number; duplicate: boolean };
function skipWhitespace(text: string, cursor: JsonCursor): void {
  while (/\s/u.test(text[cursor.index] ?? "")) cursor.index += 1;
}
function scanString(text: string, cursor: JsonCursor): string {
  const start = cursor.index;
  cursor.index += 1;
  while (cursor.index < text.length) {
    if (text[cursor.index] === "\\") cursor.index += 2;
    else if (text[cursor.index++] === '"') return JSON.parse(text.slice(start, cursor.index));
  }
  throw new Error("invalid_json");
}
function scanValue(text: string, cursor: JsonCursor): void {
  skipWhitespace(text, cursor);
  if (text[cursor.index] === "{") {
    cursor.index += 1; const keys = new Set<string>(); skipWhitespace(text, cursor);
    if (text[cursor.index] === "}") { cursor.index += 1; return; }
    while (cursor.index < text.length) {
      if (text[cursor.index] !== '"') throw new Error("invalid_json");
      const key = scanString(text, cursor); if (keys.has(key)) cursor.duplicate = true; keys.add(key);
      skipWhitespace(text, cursor); if (text[cursor.index++] !== ":") throw new Error("invalid_json");
      scanValue(text, cursor); skipWhitespace(text, cursor);
      const delimiter = text[cursor.index++]; if (delimiter === "}") return;
      if (delimiter !== ",") throw new Error("invalid_json"); skipWhitespace(text, cursor);
    }
    throw new Error("invalid_json");
  }
  if (text[cursor.index] === "[") {
    cursor.index += 1; skipWhitespace(text, cursor);
    if (text[cursor.index] === "]") { cursor.index += 1; return; }
    while (cursor.index < text.length) {
      scanValue(text, cursor); skipWhitespace(text, cursor);
      const delimiter = text[cursor.index++]; if (delimiter === "]") return;
      if (delimiter !== ",") throw new Error("invalid_json"); skipWhitespace(text, cursor);
    }
    throw new Error("invalid_json");
  }
  if (text[cursor.index] === '"') { scanString(text, cursor); return; }
  const start = cursor.index;
  while (cursor.index < text.length && !/[\s,}\]]/u.test(text[cursor.index])) cursor.index += 1;
  JSON.parse(text.slice(start, cursor.index));
}

export function parseFarmOsApprovedProposalJson(
  text: unknown,
): FarmOsContractParseResult<FarmOsApprovedProposal> {
  if (typeof text !== "string") return { valid: false, value: null, blocked_reason: "invalid_json" };
  try {
    const cursor: JsonCursor = { index: 0, duplicate: false };
    scanValue(text, cursor); skipWhitespace(text, cursor);
    if (cursor.index !== text.length) throw new Error("invalid_json");
    if (cursor.duplicate) return { valid: false, value: null, blocked_reason: "duplicate_field" };
    return parseFarmOsApprovedProposal(JSON.parse(text));
  } catch {
    return { valid: false, value: null, blocked_reason: "invalid_json" };
  }
}
