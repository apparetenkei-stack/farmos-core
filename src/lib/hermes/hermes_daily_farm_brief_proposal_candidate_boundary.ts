import { createHash } from "node:crypto";

import {
  HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON,
  parseHermesDailyFarmBriefAttentionDetail,
  type HermesDailyFarmBriefAttentionDetail,
  type HermesDailyFarmBriefAttentionReasonCode,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_attention_detail_contract";
import {
  deriveHermesDailyFarmBusinessDate,
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SCHEMA_VERSION =
  "hermes.proposal_candidate.work_log_follow_up.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_INPUT_SCHEMA_VERSION =
  "hermes.proposal_candidate.work_log_follow_up_input.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE = "work_log_follow_up" as const;
export const HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE = "work_log_attention" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_EXPIRY_POLICY = {
  timezone: "Asia/Tokyo",
  expires_at: "end_of_next_business_date",
} as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER = [
  "source_display_stale",
  "source_business_date_old",
  "source_version_mismatch",
  "candidate_expired",
  "source_generated_at_future",
  "source_generated_at_invalid",
] as const;

export type HermesDailyFarmBriefProposalCandidateStaleReason =
  (typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER)[number];

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY = {
  preview_only: true,
  proposal_saved: false,
  proposal_apply_performed: false,
  app_database_write_performed: false,
  core_database_write_performed: false,
  database_write_performed: false,
  model_execution_performed: false,
  retry_performed: false,
  migration_performed: false,
  raw_identifier_exposed: false,
  browser_role_override_allowed: false,
  browser_scope_override_allowed: false,
  browser_proposal_type_override_allowed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefProposalCandidateInput = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_INPUT_SCHEMA_VERSION;
  proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  suggestion_type: typeof HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE;
  source: {
    business_date: string;
    generated_at: string;
    version: number;
    display_state: "current" | "stale";
  };
  attention: HermesDailyFarmBriefAttentionDetail;
};

export type HermesDailyFarmBriefProposalCandidate = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SCHEMA_VERSION;
  candidate_id: string;
  proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  source: {
    source_kind: "daily_farm_brief_attention";
    suggestion_type: typeof HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE;
    business_date: string;
    generated_at: string | null;
    version: number;
    attention_reason_code: HermesDailyFarmBriefAttentionReasonCode;
    display_state: "current" | "stale";
  };
  /** Browser-safe display grouping only. This never identifies an individual work-log record. */
  target: {
    target_kind: "work_log_display_scope";
    safe_scope: string;
    display_label: string;
    work_type_label: string | null;
  };
  basis: string;
  before: string;
  after: string;
  risk_level: "low";
  source_business_date: string;
  source_generated_at: string | null;
  source_version: number;
  expected_source_version: number;
  created_at: string;
  expires_at: string;
  requires_human_review: true;
  save_allowed: false;
  apply_allowed: false;
  stale: {
    stale_detected: boolean;
    reason_codes: HermesDailyFarmBriefProposalCandidateStaleReason[];
    validation_passed: boolean;
    future_explicit_save_eligible: boolean;
  };
  duplicate_signature: string;
  preview: {
    proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
    target_display: string;
    basis: string;
    before: string;
    after: string;
    risk_level: "low";
    expires_at: string;
    stale_detected: boolean;
    stale_reason_codes: HermesDailyFarmBriefProposalCandidateStaleReason[];
    requires_human_review: true;
    proposal_saved: false;
    proposal_apply_performed: false;
  };
  safety: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY;
};

export type HermesDailyFarmBriefProposalCandidateSignatureInput = {
  schema_version: string;
  proposal_type: string;
  source_business_date: string;
  source_version: number;
  attention_reason_code: string;
  target_safe_scope: string;
  basis: string;
  before: string;
  after: string;
};

type JsonRecord = Record<string, unknown>;
const INPUT_KEYS = ["schema_version", "proposal_type", "suggestion_type", "source", "attention"] as const;
const INPUT_SOURCE_KEYS = ["business_date", "generated_at", "version", "display_state"] as const;
const CANDIDATE_KEYS = ["schema_version", "candidate_id", "proposal_type", "source", "target", "basis", "before", "after", "risk_level", "source_business_date", "source_generated_at", "source_version", "expected_source_version", "created_at", "expires_at", "requires_human_review", "save_allowed", "apply_allowed", "stale", "duplicate_signature", "preview", "safety"] as const;
const SOURCE_KEYS = ["source_kind", "suggestion_type", "business_date", "generated_at", "version", "attention_reason_code", "display_state"] as const;
const TARGET_KEYS = ["target_kind", "safe_scope", "display_label", "work_type_label"] as const;
const STALE_KEYS = ["stale_detected", "reason_codes", "validation_passed", "future_explicit_save_eligible"] as const;
const PREVIEW_KEYS = ["proposal_type", "target_display", "basis", "before", "after", "risk_level", "expires_at", "stale_detected", "stale_reason_codes", "requires_human_review", "proposal_saved", "proposal_apply_performed"] as const;
const SAFE_SCOPE_PATTERN = /^work_log_scope_[a-f0-9]{24}$/u;
const CANDIDATE_ID_PATTERN = /^proposal_candidate_[a-f0-9]{24}$/u;
const SIGNATURE_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const RAW_IDENTIFIER_VALUE_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|(?:field|work[_-]?log|crop[_-]?cycle|record|scope)[:_-][0-9a-z._:-]+)$/iu;
const FORBIDDEN_NORMALIZED_KEYS = new Set([
  "id", "fieldid", "worklogid", "cropcycleid", "recordid", "sourcerecordid",
  "sourcerecordreference", "rawidentifier", "rawid", "scope", "scopekey",
  "role", "allowedscopekeys", "principal", "principalref", "credential", "credentials",
  "secret", "token", "apikey", "servicerole",
]);
const BEFORE_TEXT: Record<HermesDailyFarmBriefAttentionReasonCode, string> = {
  work_log_started_at_missing: "作業開始日時を確認できません。",
  work_log_started_at_invalid: "作業開始日時の形式が正しいことを確認できません。",
};
const AFTER_TEXT = "担当者が作業記録を確認し、必要な対応を判断します。";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => FORBIDDEN_NORMALIZED_KEYS.has(normalizeKey(key)) || containsForbiddenKey(nested));
}

function safeText(value: unknown, maximum: number): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (/<\/?[A-Za-z][^>]*>/u.test(value) || RAW_IDENTIFIER_VALUE_PATTERN.test(value)) return false;
  const trimmed = value.trim();
  return !((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")));
}

function isVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 1_000_000;
}

function canonicalSignatureText(values: readonly string[]): string {
  return values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`).join("|");
}

export function createHermesDailyFarmBriefProposalCandidateDuplicateSignature(
  input: HermesDailyFarmBriefProposalCandidateSignatureInput,
): string {
  const canonical = canonicalSignatureText([
    input.schema_version,
    input.proposal_type,
    input.source_business_date,
    String(input.source_version),
    input.attention_reason_code,
    input.target_safe_scope,
    input.basis,
    input.before,
    input.after,
  ]);
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function expiresAtForBusinessDate(businessDate: string): string | null {
  if (!isHermesDailyFarmBusinessDate(businessDate)) return null;
  const [year, month, day] = businessDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 14, 59, 59, 999)).toISOString();
}

function targetForAttention(attention: HermesDailyFarmBriefAttentionDetail): HermesDailyFarmBriefProposalCandidate["target"] {
  const displayLabel = attention.field_label ?? "表示可能な作業記録";
  const canonical = canonicalSignatureText(["work_log_scope", displayLabel, attention.work_type_label ?? ""]);
  return {
    target_kind: "work_log_display_scope",
    safe_scope: `work_log_scope_${createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 24)}`,
    display_label: displayLabel,
    work_type_label: attention.work_type_label,
  };
}

function recomputeStaleReasons(input: {
  sourceDisplayState: "current" | "stale";
  sourceBusinessDate: string;
  sourceVersion: number;
  expectedSourceVersion: number;
  sourceGeneratedAt: string | null;
  createdAt: string;
  expiresAt: string;
}): HermesDailyFarmBriefProposalCandidateStaleReason[] | null {
  const currentBusinessDate = deriveHermesDailyFarmBusinessDate(input.createdAt);
  if (currentBusinessDate === null) return null;
  return HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER.filter((reason) => {
    if (reason === "source_display_stale") return input.sourceDisplayState === "stale";
    if (reason === "source_business_date_old") return input.sourceBusinessDate < currentBusinessDate;
    if (reason === "source_version_mismatch") return input.sourceVersion !== input.expectedSourceVersion;
    if (reason === "candidate_expired") return Date.parse(input.createdAt) > Date.parse(input.expiresAt);
    if (reason === "source_generated_at_future") return input.sourceGeneratedAt !== null && Date.parse(input.sourceGeneratedAt) > Date.parse(input.createdAt);
    return input.sourceGeneratedAt === null;
  });
}

function previewTarget(target: HermesDailyFarmBriefProposalCandidate["target"]): string {
  return target.work_type_label === null ? target.display_label : `${target.display_label}（${target.work_type_label}）`;
}

export function parseHermesDailyFarmBriefProposalCandidateInput(value: unknown): HermesDailyFarmBriefProposalCandidateInput | null {
  if (containsForbiddenKey(value) || !isRecord(value) || !exact(value, INPUT_KEYS) || value.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_INPUT_SCHEMA_VERSION || value.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE || value.suggestion_type !== HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE || !isRecord(value.source) || !exact(value.source, INPUT_SOURCE_KEYS)) return null;
  if (!isHermesDailyFarmBusinessDate(value.source.business_date) || !safeText(value.source.generated_at, 100) || !isVersion(value.source.version) || !["current", "stale"].includes(String(value.source.display_state))) return null;
  const attention = parseHermesDailyFarmBriefAttentionDetail(value.attention);
  if (attention === null || (attention.field_label !== null && !safeText(attention.field_label, 120)) || (attention.work_type_label !== null && !safeText(attention.work_type_label, 120))) return null;
  return { ...(value as HermesDailyFarmBriefProposalCandidateInput), attention };
}

function parseReasonCodes(value: unknown): HermesDailyFarmBriefProposalCandidateStaleReason[] | null {
  if (!Array.isArray(value) || value.length > HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER.length || value.some((reason) => !HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER.includes(reason as HermesDailyFarmBriefProposalCandidateStaleReason)) || new Set(value).size !== value.length) return null;
  const reasons = value as HermesDailyFarmBriefProposalCandidateStaleReason[];
  return reasons.every((reason, index) => index === 0 || HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER.indexOf(reasons[index - 1]) < HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_STALE_REASON_ORDER.indexOf(reason)) ? reasons : null;
}

export function parseHermesDailyFarmBriefProposalCandidate(value: unknown): HermesDailyFarmBriefProposalCandidate | null {
  try {
    const candidate = typeof value === "string" ? JSON.parse(value) : value;
    if (containsForbiddenKey(candidate) || !isRecord(candidate) || !exact(candidate, CANDIDATE_KEYS) || candidate.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SCHEMA_VERSION || typeof candidate.candidate_id !== "string" || !CANDIDATE_ID_PATTERN.test(candidate.candidate_id) || candidate.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE) return null;
    if (!isRecord(candidate.source) || !exact(candidate.source, SOURCE_KEYS) || candidate.source.source_kind !== "daily_farm_brief_attention" || candidate.source.suggestion_type !== HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE || !isHermesDailyFarmBusinessDate(candidate.source.business_date) || (candidate.source.generated_at !== null && !isCanonicalIso(candidate.source.generated_at)) || !isVersion(candidate.source.version) || !Object.hasOwn(HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON, String(candidate.source.attention_reason_code)) || !["current", "stale"].includes(String(candidate.source.display_state))) return null;
    if (!isRecord(candidate.target) || !exact(candidate.target, TARGET_KEYS) || candidate.target.target_kind !== "work_log_display_scope" || typeof candidate.target.safe_scope !== "string" || !SAFE_SCOPE_PATTERN.test(candidate.target.safe_scope) || !safeText(candidate.target.display_label, 120) || (candidate.target.work_type_label !== null && !safeText(candidate.target.work_type_label, 120))) return null;
    const reasonCode = candidate.source.attention_reason_code as HermesDailyFarmBriefAttentionReasonCode;
    if (candidate.basis !== HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON[reasonCode] || candidate.before !== BEFORE_TEXT[reasonCode] || candidate.after !== AFTER_TEXT || candidate.risk_level !== "low" || candidate.source_business_date !== candidate.source.business_date || candidate.source_generated_at !== candidate.source.generated_at || candidate.source_version !== candidate.source.version || !isVersion(candidate.expected_source_version) || !isCanonicalIso(candidate.created_at) || !isCanonicalIso(candidate.expires_at) || candidate.expires_at !== expiresAtForBusinessDate(candidate.source.business_date) || candidate.requires_human_review !== true || candidate.save_allowed !== false || candidate.apply_allowed !== false) return null;
    if (!isRecord(candidate.stale) || !exact(candidate.stale, STALE_KEYS)) return null;
    const reasonCodes = parseReasonCodes(candidate.stale.reason_codes);
    const recomputedReasonCodes = recomputeStaleReasons({ sourceDisplayState: candidate.source.display_state as "current" | "stale", sourceBusinessDate: candidate.source.business_date as string, sourceVersion: candidate.source.version as number, expectedSourceVersion: candidate.expected_source_version as number, sourceGeneratedAt: candidate.source.generated_at as string | null, createdAt: candidate.created_at as string, expiresAt: candidate.expires_at as string });
    if (reasonCodes === null || recomputedReasonCodes === null || reasonCodes.length !== recomputedReasonCodes.length || reasonCodes.some((reason, index) => reason !== recomputedReasonCodes[index]) || candidate.stale.stale_detected !== (recomputedReasonCodes.length > 0) || candidate.stale.validation_passed !== !recomputedReasonCodes.includes("source_generated_at_invalid") || candidate.stale.future_explicit_save_eligible !== (recomputedReasonCodes.length === 0)) return null;
    const signature = createHermesDailyFarmBriefProposalCandidateDuplicateSignature({ schema_version: candidate.schema_version, proposal_type: candidate.proposal_type, source_business_date: candidate.source.business_date as string, source_version: candidate.source.version as number, attention_reason_code: reasonCode, target_safe_scope: candidate.target.safe_scope as string, basis: candidate.basis as string, before: candidate.before as string, after: candidate.after as string });
    if (candidate.duplicate_signature !== signature || typeof candidate.duplicate_signature !== "string" || !SIGNATURE_PATTERN.test(candidate.duplicate_signature) || candidate.candidate_id !== `proposal_candidate_${signature.slice("sha256:".length, "sha256:".length + 24)}`) return null;
    if (!isRecord(candidate.preview) || !exact(candidate.preview, PREVIEW_KEYS) || candidate.preview.proposal_type !== candidate.proposal_type || candidate.preview.target_display !== previewTarget(candidate.target as HermesDailyFarmBriefProposalCandidate["target"]) || candidate.preview.basis !== candidate.basis || candidate.preview.before !== candidate.before || candidate.preview.after !== candidate.after || candidate.preview.risk_level !== "low" || candidate.preview.expires_at !== candidate.expires_at || candidate.preview.stale_detected !== candidate.stale.stale_detected || !Array.isArray(candidate.preview.stale_reason_codes) || candidate.preview.stale_reason_codes.length !== reasonCodes.length || candidate.preview.stale_reason_codes.some((reason, index) => reason !== reasonCodes[index]) || candidate.preview.requires_human_review !== true || candidate.preview.proposal_saved !== false || candidate.preview.proposal_apply_performed !== false) return null;
    if (!isRecord(candidate.safety) || !exact(candidate.safety, Object.keys(HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY)) || !Object.entries(HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY).every(([key, expected]) => candidate.safety[key] === expected)) return null;
    return candidate as HermesDailyFarmBriefProposalCandidate;
  } catch {
    return null;
  }
}

export function createHermesDailyFarmBriefProposalCandidate(input: {
  value: unknown;
  expectedSourceVersion: number;
  clock: () => string;
}): HermesDailyFarmBriefProposalCandidate | null {
  const parsed = parseHermesDailyFarmBriefProposalCandidateInput(input.value);
  let createdAt: string;
  try { createdAt = input.clock(); } catch { return null; }
  if (parsed === null || !isVersion(input.expectedSourceVersion) || !isCanonicalIso(createdAt)) return null;
  const expiresAt = expiresAtForBusinessDate(parsed.source.business_date);
  if (expiresAt === null) return null;
  const generatedAtValid = isCanonicalIso(parsed.source.generated_at);
  const normalizedGeneratedAt = generatedAtValid ? parsed.source.generated_at : null;
  const reasons = recomputeStaleReasons({ sourceDisplayState: parsed.source.display_state, sourceBusinessDate: parsed.source.business_date, sourceVersion: parsed.source.version, expectedSourceVersion: input.expectedSourceVersion, sourceGeneratedAt: normalizedGeneratedAt, createdAt, expiresAt });
  if (reasons === null) return null;
  const target = targetForAttention(parsed.attention);
  const basis = parsed.attention.reason;
  const before = BEFORE_TEXT[parsed.attention.reason_code];
  const signature = createHermesDailyFarmBriefProposalCandidateDuplicateSignature({ schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SCHEMA_VERSION, proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE, source_business_date: parsed.source.business_date, source_version: parsed.source.version, attention_reason_code: parsed.attention.reason_code, target_safe_scope: target.safe_scope, basis, before, after: AFTER_TEXT });
  return parseHermesDailyFarmBriefProposalCandidate({
    schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SCHEMA_VERSION,
    candidate_id: `proposal_candidate_${signature.slice("sha256:".length, "sha256:".length + 24)}`,
    proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
    source: { source_kind: "daily_farm_brief_attention", suggestion_type: HERMES_DAILY_FARM_BRIEF_SUGGESTION_TYPE, business_date: parsed.source.business_date, generated_at: normalizedGeneratedAt, version: parsed.source.version, attention_reason_code: parsed.attention.reason_code, display_state: parsed.source.display_state },
    target,
    basis,
    before,
    after: AFTER_TEXT,
    risk_level: "low",
    source_business_date: parsed.source.business_date,
    source_generated_at: normalizedGeneratedAt,
    source_version: parsed.source.version,
    expected_source_version: input.expectedSourceVersion,
    created_at: createdAt,
    expires_at: expiresAt,
    requires_human_review: true,
    save_allowed: false,
    apply_allowed: false,
    stale: { stale_detected: reasons.length > 0, reason_codes: reasons, validation_passed: generatedAtValid, future_explicit_save_eligible: reasons.length === 0 },
    duplicate_signature: signature,
    preview: { proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE, target_display: previewTarget(target), basis, before, after: AFTER_TEXT, risk_level: "low", expires_at: expiresAt, stale_detected: reasons.length > 0, stale_reason_codes: reasons, requires_human_review: true, proposal_saved: false, proposal_apply_performed: false },
    safety: HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY,
  });
}
