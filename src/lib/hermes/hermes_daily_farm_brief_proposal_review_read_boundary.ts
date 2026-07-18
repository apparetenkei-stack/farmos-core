import { createHash } from "node:crypto";

import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { isCanonicalIso } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION,
} from "./hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
} from "./hermes_daily_farm_brief_proposal_candidate_boundary";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_READ_REQUEST_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_review_read_request.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_list_response.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_detail_response.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_READ_BOUNDARY =
  "day127_daily_farm_brief_proposal_review_read" as const;

const DAY126_BOUNDARY = "day126_daily_farm_brief_explicit_save" as const;
const DAY126_SOURCE = "daily_farm_brief_attention" as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SIGNATURE_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_ID_PATTERN = /^proposal_candidate_[a-f0-9]{24}$/u;
const SAFE_REFERENCE_PATTERN = /^daily_brief_proposal_[a-f0-9]{24}$/u;
const CONTROL_OR_HTML_PATTERN = /[\u0000-\u001f\u007f]|<\/?[A-Za-z][^>]*>/u;

const RAW_ROW_KEYS = ["id", "proposal_type", "title", "body", "payload_json", "source_refs_json", "model_name", "agent_name", "confidence", "reason", "risk_level", "status", "reviewed_by", "reviewed_at", "review_note", "applied_at", "applied_by", "created_at", "updated_at"] as const;
const PAYLOAD_KEYS = ["schema_version", "boundary", "candidate_id", "proposal_type", "target", "basis", "before", "after", "risk_level", "source_business_date", "source_generated_at", "source_version", "expected_source_version", "created_at", "expires_at", "requires_human_review", "duplicate_signature", "idempotency_key", "explicit_save_requested", "proposal_apply_ready", "proposal_apply_performed", "app_db_write_performed"] as const;
const SOURCE_REF_KEYS = ["source", "boundary", "candidate_id", "duplicate_signature", "idempotency_key", "source_business_date", "source_version"] as const;
const TARGET_KEYS = ["target_kind", "safe_scope", "display_label", "work_type_label"] as const;
const STATUS_VALUES = ["pending", "approved", "rejected", "needs_revision", "applied", "expired"] as const;
const RISK_VALUES = ["low", "medium", "high"] as const;

type JsonRecord = Record<string, unknown>;
export type HermesDailyFarmBriefProposalStatus = (typeof STATUS_VALUES)[number];
export type HermesDailyFarmBriefProposalRiskLevel = (typeof RISK_VALUES)[number];
export type HermesDailyFarmBriefProposalExpiryState = "active" | "expired";
export type HermesDailyFarmBriefProposalReviewReadRequest = { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_READ_REQUEST_SCHEMA_VERSION; requested_at: string };
export type HermesDailyFarmBriefProposalReviewReadSafety = {
  authentication_required: true; administrator_required: true; role_resolution_server_owned: true;
  database_write_performed: false; proposal_insert_performed: false; proposal_update_performed: false;
  proposal_delete_performed: false; proposal_apply_performed: false; app_database_write_performed: false;
  audit_database_write_performed: false; model_execution_performed: false; retry_performed: false;
  raw_identifier_exposed: false; principal_ref_exposed: false; credential_exposed: false;
  unknown_schema_fail_closed: true; fail_closed: true;
};
export type HermesDailyFarmBriefProposalListItem = {
  proposal_ref: string; proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  proposal_type_label: "作業記録の確認"; status: HermesDailyFarmBriefProposalStatus; status_label: string;
  risk_level: HermesDailyFarmBriefProposalRiskLevel; risk_label: string; title: string; summary: string;
  created_at: string; expires_at: string; expiry_state: HermesDailyFarmBriefProposalExpiryState;
  source_kind: "daily_farm_brief_attention"; source_kind_label: "Daily Brief確認事項";
  requires_human_review: true; proposal_apply_performed: boolean;
};
export type HermesDailyFarmBriefProposalDetail = {
  proposal_ref: string; proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  proposal_type_label: "作業記録の確認"; status: HermesDailyFarmBriefProposalStatus; status_label: string;
  risk_level: HermesDailyFarmBriefProposalRiskLevel; risk_label: string; title: string; body: string;
  reason: string; target_display: string; work_type_label: string; basis: string; before: string; after: string;
  created_at: string; expires_at: string; expiry_state: HermesDailyFarmBriefProposalExpiryState;
  source_business_date: string; source_version: number; source_kind: "daily_farm_brief_attention";
  source_kind_label: "Daily Brief確認事項"; requires_human_review: true;
  proposal_apply_ready: false; proposal_apply_performed: boolean;
};
export type HermesDailyFarmBriefProposalListResponse =
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION; result: "ok"; error: null; proposals: HermesDailyFarmBriefProposalListItem[]; safety: HermesDailyFarmBriefProposalReviewReadSafety }
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION; result: "error"; error: "invalid_request" | "authentication_required" | "access_forbidden" | "proposal_read_failed"; proposals: []; safety: HermesDailyFarmBriefProposalReviewReadSafety };
export type HermesDailyFarmBriefProposalDetailResponse =
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION; result: "ok"; error: null; proposal: HermesDailyFarmBriefProposalDetail; safety: HermesDailyFarmBriefProposalReviewReadSafety }
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION; result: "error"; error: "invalid_request" | "invalid_proposal_reference" | "authentication_required" | "access_forbidden" | "proposal_not_found" | "proposal_read_failed"; proposal: null; safety: HermesDailyFarmBriefProposalReviewReadSafety };
export type HermesDailyFarmBriefProposalReviewRawRow = {
  id: string; proposal_type: string; title: string; body: string; payload_json: unknown; source_refs_json: unknown;
  model_name: string | null; agent_name: string | null; confidence: string | number | null; reason: string | null;
  risk_level: string; status: string; reviewed_by: string | null; reviewed_at: string | null;
  review_note: string | null; applied_at: string | null; applied_by: string | null; created_at: string; updated_at: string;
};
type ParsedDailyBriefProposalRow = {
  id: string; title: string; body: string; reason: string; status: HermesDailyFarmBriefProposalStatus;
  risk_level: HermesDailyFarmBriefProposalRiskLevel; created_at: string; updated_at: string; applied_at: string | null;
  payload: { target: { target_kind: string; safe_scope: string; display_label: string; work_type_label: string };
    basis: string; before: string; after: string; source_business_date: string; source_version: number;
    created_at: string; expires_at: string; requires_human_review: true; proposal_apply_ready: false;
    proposal_apply_performed: boolean; duplicate_signature: string; idempotency_key: string };
};

function isRecord(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function safeText(value: unknown, maximum = 3000): value is string { return typeof value === "string" && value.length > 0 && value.length <= maximum && !CONTROL_OR_HTML_PATTERN.test(value); }
function safeBody(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 3000 &&
    !/[\u0000-\u0009\u000b-\u001f\u007f]|<\/?[A-Za-z][^>]*>/u.test(value)
  );
}
function safeVersion(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }
function parseNullableIso(value: unknown): string | null | undefined { if (value === null) return null; if (typeof value !== "string" || !isCanonicalIso(value)) return undefined; return value; }
function statusLabel(status: HermesDailyFarmBriefProposalStatus): string { switch (status) { case "pending": return "確認待ち"; case "approved": return "承認済み"; case "rejected": return "却下"; case "needs_revision": return "修正依頼"; case "applied": return "適用済み"; case "expired": return "期限切れ"; } }
function riskLabel(risk: HermesDailyFarmBriefProposalRiskLevel): string { switch (risk) { case "low": return "低"; case "medium": return "中"; case "high": return "高"; } }
function expiryState(expiresAt: string, requestedAt: string): HermesDailyFarmBriefProposalExpiryState { return Date.parse(expiresAt) <= Date.parse(requestedAt) ? "expired" : "active"; }

export function createHermesDailyFarmBriefProposalSafeReference(idempotencyKey: string): string {
  if (!SIGNATURE_PATTERN.test(idempotencyKey)) throw new Error("day127_safe_reference_input_invalid");
  const digest = createHash("sha256").update(`${HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_READ_BOUNDARY}|${idempotencyKey}`, "utf8").digest("hex");
  return `daily_brief_proposal_${digest.slice(0, 24)}`;
}
export function parseHermesDailyFarmBriefProposalSafeReference(value: unknown): string | null { return typeof value === "string" && SAFE_REFERENCE_PATTERN.test(value) ? value : null; }
export function parseHermesDailyFarmBriefProposalReviewReadRequest(value: unknown): HermesDailyFarmBriefProposalReviewReadRequest | null {
  if (!isRecord(value) || !exact(value, ["schema_version", "requested_at"]) || value.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_READ_REQUEST_SCHEMA_VERSION || !isCanonicalIso(value.requested_at)) return null;
  return value as HermesDailyFarmBriefProposalReviewReadRequest;
}

export function parseHermesDailyFarmBriefProposalReviewRawRow(value: unknown): ParsedDailyBriefProposalRow | null {
  if (!isRecord(value) || !exact(value, RAW_ROW_KEYS) || typeof value.id !== "string" || !UUID_PATTERN.test(value.id) || value.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE || !safeText(value.title, 200) || !safeBody(value.body) || !safeText(value.reason, 1000) || !STATUS_VALUES.includes(value.status as HermesDailyFarmBriefProposalStatus) || !RISK_VALUES.includes(value.risk_level as HermesDailyFarmBriefProposalRiskLevel) || value.model_name !== null || value.agent_name !== "hermes" || value.confidence !== null || parseNullableIso(value.reviewed_at) === undefined || parseNullableIso(value.applied_at) === undefined || !isCanonicalIso(value.created_at) || !isCanonicalIso(value.updated_at) || !isRecord(value.payload_json) || !exact(value.payload_json, PAYLOAD_KEYS) || !isRecord(value.source_refs_json) || !exact(value.source_refs_json, SOURCE_REF_KEYS)) return null;
  const payload = value.payload_json;
  const refs = value.source_refs_json;
  if (payload.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION || payload.boundary !== DAY126_BOUNDARY || refs.boundary !== DAY126_BOUNDARY || refs.source !== DAY126_SOURCE || payload.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE || typeof payload.candidate_id !== "string" || !CANDIDATE_ID_PATTERN.test(payload.candidate_id) || refs.candidate_id !== payload.candidate_id || typeof payload.duplicate_signature !== "string" || !SIGNATURE_PATTERN.test(payload.duplicate_signature) || refs.duplicate_signature !== payload.duplicate_signature || typeof payload.idempotency_key !== "string" || !SIGNATURE_PATTERN.test(payload.idempotency_key) || refs.idempotency_key !== payload.idempotency_key || !isRecord(payload.target) || !exact(payload.target, TARGET_KEYS) || !safeText(payload.target.target_kind, 100) || !safeText(payload.target.safe_scope, 200) || !safeText(payload.target.display_label, 300) || !safeText(payload.target.work_type_label, 200) || !safeText(payload.basis, 1000) || !safeText(payload.before, 1000) || !safeText(payload.after, 1000) || payload.risk_level !== value.risk_level || !safeText(payload.source_business_date, 32) || payload.source_business_date !== refs.source_business_date || !safeVersion(payload.source_version) || payload.source_version !== refs.source_version || payload.expected_source_version !== payload.source_version || !isCanonicalIso(payload.created_at) || payload.created_at !== value.created_at || !isCanonicalIso(payload.expires_at) || payload.requires_human_review !== true || payload.explicit_save_requested !== true || payload.proposal_apply_ready !== false || typeof payload.proposal_apply_performed !== "boolean" || payload.app_db_write_performed !== false) return null;
  return { id: value.id, title: value.title, body: value.body, reason: value.reason, status: value.status as HermesDailyFarmBriefProposalStatus, risk_level: value.risk_level as HermesDailyFarmBriefProposalRiskLevel, created_at: value.created_at, updated_at: value.updated_at, applied_at: value.applied_at as string | null, payload: { target: { target_kind: payload.target.target_kind, safe_scope: payload.target.safe_scope, display_label: payload.target.display_label, work_type_label: payload.target.work_type_label }, basis: payload.basis, before: payload.before, after: payload.after, source_business_date: payload.source_business_date, source_version: payload.source_version, created_at: payload.created_at, expires_at: payload.expires_at, requires_human_review: true, proposal_apply_ready: false, proposal_apply_performed: payload.proposal_apply_performed, duplicate_signature: payload.duplicate_signature, idempotency_key: payload.idempotency_key } };
}

export function createHermesDailyFarmBriefProposalListItem(input: { row: unknown; requestedAt: string }): HermesDailyFarmBriefProposalListItem | null {
  if (!isCanonicalIso(input.requestedAt)) return null;
  const row = parseHermesDailyFarmBriefProposalReviewRawRow(input.row); if (row === null) return null;
  return { proposal_ref: createHermesDailyFarmBriefProposalSafeReference(row.payload.idempotency_key), proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE, proposal_type_label: "作業記録の確認", status: row.status, status_label: statusLabel(row.status), risk_level: row.risk_level, risk_label: riskLabel(row.risk_level), title: row.title, summary: row.payload.basis, created_at: row.created_at, expires_at: row.payload.expires_at, expiry_state: expiryState(row.payload.expires_at, input.requestedAt), source_kind: DAY126_SOURCE, source_kind_label: "Daily Brief確認事項", requires_human_review: true, proposal_apply_performed: row.payload.proposal_apply_performed };
}
export function createHermesDailyFarmBriefProposalDetail(input: { row: unknown; requestedAt: string }): HermesDailyFarmBriefProposalDetail | null {
  if (!isCanonicalIso(input.requestedAt)) return null;
  const row = parseHermesDailyFarmBriefProposalReviewRawRow(input.row); if (row === null) return null;
  return { proposal_ref: createHermesDailyFarmBriefProposalSafeReference(row.payload.idempotency_key), proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE, proposal_type_label: "作業記録の確認", status: row.status, status_label: statusLabel(row.status), risk_level: row.risk_level, risk_label: riskLabel(row.risk_level), title: row.title, body: row.body, reason: row.reason, target_display: row.payload.target.display_label, work_type_label: row.payload.target.work_type_label, basis: row.payload.basis, before: row.payload.before, after: row.payload.after, created_at: row.created_at, expires_at: row.payload.expires_at, expiry_state: expiryState(row.payload.expires_at, input.requestedAt), source_business_date: row.payload.source_business_date, source_version: row.payload.source_version, source_kind: DAY126_SOURCE, source_kind_label: "Daily Brief確認事項", requires_human_review: true, proposal_apply_ready: false, proposal_apply_performed: row.payload.proposal_apply_performed };
}

function safety(): HermesDailyFarmBriefProposalReviewReadSafety { return { authentication_required: true, administrator_required: true, role_resolution_server_owned: true, database_write_performed: false, proposal_insert_performed: false, proposal_update_performed: false, proposal_delete_performed: false, proposal_apply_performed: false, app_database_write_performed: false, audit_database_write_performed: false, model_execution_performed: false, retry_performed: false, raw_identifier_exposed: false, principal_ref_exposed: false, credential_exposed: false, unknown_schema_fail_closed: true, fail_closed: true }; }
function administratorAuthorized(actorValue: unknown): boolean { const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(actorValue); return actor !== null && actor.role === "administrator" && actor.authorization_verified === true && actor.allowed_scope_keys.length === 0; }

export function createHermesDailyFarmBriefProposalListResponse(input: { request: unknown; actor: unknown; rows: unknown }): HermesDailyFarmBriefProposalListResponse {
  const request = parseHermesDailyFarmBriefProposalReviewReadRequest(input.request);
  if (request === null) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION, result: "error", error: "invalid_request", proposals: [], safety: safety() };
  if (!administratorAuthorized(input.actor)) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION, result: "error", error: input.actor === null ? "authentication_required" : "access_forbidden", proposals: [], safety: safety() };
  if (!Array.isArray(input.rows) || input.rows.length > 100) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION, result: "error", error: "proposal_read_failed", proposals: [], safety: safety() };
  const proposals = input.rows.map((row) => createHermesDailyFarmBriefProposalListItem({ row, requestedAt: request.requested_at }));
  if (proposals.some((proposal) => proposal === null)) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION, result: "error", error: "proposal_read_failed", proposals: [], safety: safety() };
  return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_LIST_RESPONSE_SCHEMA_VERSION, result: "ok", error: null, proposals: proposals as HermesDailyFarmBriefProposalListItem[], safety: safety() };
}
export function createHermesDailyFarmBriefProposalDetailResponse(input: { request: unknown; actor: unknown; proposalRef: unknown; row: unknown | null }): HermesDailyFarmBriefProposalDetailResponse {
  const request = parseHermesDailyFarmBriefProposalReviewReadRequest(input.request);
  if (request === null) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "error", error: "invalid_request", proposal: null, safety: safety() };
  const proposalRef = parseHermesDailyFarmBriefProposalSafeReference(input.proposalRef);
  if (proposalRef === null) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "error", error: "invalid_proposal_reference", proposal: null, safety: safety() };
  if (!administratorAuthorized(input.actor)) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "error", error: input.actor === null ? "authentication_required" : "access_forbidden", proposal: null, safety: safety() };
  if (input.row === null) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "error", error: "proposal_not_found", proposal: null, safety: safety() };
  const proposal = createHermesDailyFarmBriefProposalDetail({ row: input.row, requestedAt: request.requested_at });
  if (proposal === null || proposal.proposal_ref !== proposalRef) return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "error", error: "proposal_read_failed", proposal: null, safety: safety() };
  return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_DETAIL_RESPONSE_SCHEMA_VERSION, result: "ok", error: null, proposal, safety: safety() };
}
