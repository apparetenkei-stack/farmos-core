import { createHash, randomUUID } from "node:crypto";

import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { isCanonicalIso } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
  parseHermesDailyFarmBriefProposalCandidate,
  type HermesDailyFarmBriefProposalCandidate,
} from "./hermes_daily_farm_brief_proposal_candidate_boundary";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_explicit_save_request.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_explicit_save_preview.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION =
  "hermes.daily_farm_brief.proposal_inbox_record.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY =
  "day126_daily_farm_brief_explicit_save" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION =
  "save_for_human_review" as const;

const TITLE = "作業記録の確認が必要です";
const CANDIDATE_ID_PATTERN = /^proposal_candidate_[a-f0-9]{24}$/u;
const SIGNATURE_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTROL_OR_HTML_PATTERN = /[\u0000-\u001f\u007f]|<\/?[A-Za-z][^>]*>/u;

type JsonRecord = Record<string, unknown>;

export type HermesDailyFarmBriefProposalExplicitSaveRequest = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION;
  candidate_id: string;
  duplicate_signature: string;
  confirmation: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION;
  requested_at: string;
};

export type HermesDailyFarmBriefProposalExplicitSaveSafety = {
  explicit_save_requested: boolean;
  authentication_required: true;
  administrator_required: true;
  candidate_revalidated: boolean;
  proposal_saved: boolean;
  proposal_apply_ready: false;
  proposal_apply_performed: false;
  app_database_write_performed: false;
  audit_database_write_performed: false;
  database_write_performed: boolean;
  model_execution_performed: false;
  retry_performed: false;
  migration_performed: false;
  raw_identifier_exposed: false;
  principal_ref_exposed: false;
  browser_role_override_allowed: false;
  browser_scope_override_allowed: false;
  browser_proposal_type_override_allowed: false;
  fail_closed: true;
};

export type HermesDailyFarmBriefProposalExplicitSavePreview = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION;
  proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  title: typeof TITLE;
  target_display: string;
  basis: string;
  before: string;
  after: string;
  risk_level: "low";
  expires_at: string;
  requires_human_review: true;
  status_after_save: "pending";
  duplicate_signature: string;
  idempotency_key: string;
  proposal_saved: false;
  proposal_apply_performed: false;
};

export type HermesDailyFarmBriefProposalInboxRecord = {
  id: string;
  proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  title: typeof TITLE;
  body: string;
  payload_json: {
    schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION;
    boundary: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY;
    candidate_id: string;
    proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
    target: HermesDailyFarmBriefProposalCandidate["target"];
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
    duplicate_signature: string;
    idempotency_key: string;
    explicit_save_requested: true;
    proposal_apply_ready: false;
    proposal_apply_performed: false;
    app_db_write_performed: false;
  };
  source_refs_json: {
    source: "daily_farm_brief_attention";
    boundary: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY;
    candidate_id: string;
    duplicate_signature: string;
    idempotency_key: string;
    source_business_date: string;
    source_version: number;
  };
  model_name: null;
  agent_name: "hermes";
  confidence: null;
  reason: string;
  risk_level: "low";
  status: "pending";
};

export type HermesDailyFarmBriefProposalExplicitSaveRejectionReason =
  | "invalid_save_request"
  | "actor_invalid"
  | "administrator_required"
  | "candidate_invalid"
  | "candidate_reference_mismatch"
  | "candidate_not_save_eligible"
  | "candidate_expired_at_save_request"
  | "save_request_before_candidate_creation"
  | "explicit_confirmation_required";

type ReadyResult = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION;
  status: "ready";
  rejection_reason: null;
  idempotency_key: string;
  save_preview: HermesDailyFarmBriefProposalExplicitSavePreview;
  proposal_record: HermesDailyFarmBriefProposalInboxRecord;
  safety: HermesDailyFarmBriefProposalExplicitSaveSafety;
};

type RejectedResult = {
  schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION;
  status: "rejected";
  rejection_reason: HermesDailyFarmBriefProposalExplicitSaveRejectionReason;
  idempotency_key: null;
  save_preview: null;
  proposal_record: null;
  safety: HermesDailyFarmBriefProposalExplicitSaveSafety;
};

export type HermesDailyFarmBriefProposalExplicitSavePreparation = ReadyResult | RejectedResult;

export type PersistedProposalSummary = {
  id: string;
  proposal_type: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE;
  title: string;
  status: string;
};

export type ExplicitSaveRepository = {
  findExistingByIdempotencyKey: (idempotencyKey: string) => Promise<PersistedProposalSummary | null>;
  insertProposal: (record: HermesDailyFarmBriefProposalInboxRecord) => Promise<PersistedProposalSummary>;
};

export type HermesDailyFarmBriefProposalExplicitSavePersistenceResult = {
  status: "saved" | "already_saved" | "rejected" | "failed";
  proposal_saved: boolean;
  database_write_performed: boolean;
  deduplicated_existing_record: boolean;
  proposal_apply_ready: false;
  proposal_apply_performed: false;
  app_db_write_performed: false;
  audit_write_performed: false;
  retry_count: 0;
  insert_target_schema: "ai";
  insert_target_table: "proposal_inbox";
  safety: HermesDailyFarmBriefProposalExplicitSaveSafety;
};

const REQUEST_KEYS = ["schema_version", "candidate_id", "duplicate_signature", "confirmation", "requested_at"] as const;
const RECORD_KEYS = ["id", "proposal_type", "title", "body", "payload_json", "source_refs_json", "model_name", "agent_name", "confidence", "reason", "risk_level", "status"] as const;
const PAYLOAD_KEYS = ["schema_version", "boundary", "candidate_id", "proposal_type", "target", "basis", "before", "after", "risk_level", "source_business_date", "source_generated_at", "source_version", "expected_source_version", "created_at", "expires_at", "requires_human_review", "duplicate_signature", "idempotency_key", "explicit_save_requested", "proposal_apply_ready", "proposal_apply_performed", "app_db_write_performed"] as const;
const SOURCE_REF_KEYS = ["source", "boundary", "candidate_id", "duplicate_signature", "idempotency_key", "source_business_date", "source_version"] as const;
const TARGET_KEYS = ["target_kind", "safe_scope", "display_label", "work_type_label"] as const;
const FORBIDDEN_REQUEST_KEYS = new Set(["role", "principal", "principalref", "allowedscopekeys", "scope", "scopekey", "proposaltype", "target", "risklevel", "status", "title", "body", "payload", "payloadjson", "sourcerefsjson", "credentials", "token", "secret", "apikey", "connectionstring", "dbconnection"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function containsForbiddenRequestKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenRequestKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => FORBIDDEN_REQUEST_KEYS.has(normalizeKey(key)) || containsForbiddenRequestKey(nested));
}

function safeText(value: unknown, maximum = 1000): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !CONTROL_OR_HTML_PATTERN.test(value);
}

function safeBody(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 3000 && !/[\u0000-\u0009\u000b-\u001f\u007f]|<\/?[A-Za-z][^>]*>/u.test(value);
}

function safeVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function canonical(values: readonly string[]): string {
  return values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`).join("|");
}

export function createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(
  duplicateSignature: string,
): string {
  return `sha256:${createHash("sha256").update(canonical([
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION,
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY,
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
    duplicateSignature,
  ]), "utf8").digest("hex")}`;
}

function parseRequestShape(value: unknown): (Omit<HermesDailyFarmBriefProposalExplicitSaveRequest, "confirmation"> & { confirmation: unknown }) | null {
  if (containsForbiddenRequestKey(value) || !isRecord(value) || !exact(value, REQUEST_KEYS)) return null;
  if (value.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION || typeof value.candidate_id !== "string" || !CANDIDATE_ID_PATTERN.test(value.candidate_id) || typeof value.duplicate_signature !== "string" || !SIGNATURE_PATTERN.test(value.duplicate_signature) || !isCanonicalIso(value.requested_at)) return null;
  return value as Omit<HermesDailyFarmBriefProposalExplicitSaveRequest, "confirmation"> & { confirmation: unknown };
}

export function parseHermesDailyFarmBriefProposalExplicitSaveRequest(value: unknown): HermesDailyFarmBriefProposalExplicitSaveRequest | null {
  const parsed = parseRequestShape(value);
  return parsed?.confirmation === HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION
    ? parsed as HermesDailyFarmBriefProposalExplicitSaveRequest
    : null;
}

function safety(input: { explicit: boolean; revalidated: boolean; saved?: boolean; written?: boolean }): HermesDailyFarmBriefProposalExplicitSaveSafety {
  return {
    explicit_save_requested: input.explicit,
    authentication_required: true,
    administrator_required: true,
    candidate_revalidated: input.revalidated,
    proposal_saved: input.saved ?? false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    audit_database_write_performed: false,
    database_write_performed: input.written ?? false,
    model_execution_performed: false,
    retry_performed: false,
    migration_performed: false,
    raw_identifier_exposed: false,
    principal_ref_exposed: false,
    browser_role_override_allowed: false,
    browser_scope_override_allowed: false,
    browser_proposal_type_override_allowed: false,
    fail_closed: true,
  };
}

function rejected(reason: HermesDailyFarmBriefProposalExplicitSaveRejectionReason, explicit: boolean, revalidated: boolean): RejectedResult {
  return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION, status: "rejected", rejection_reason: reason, idempotency_key: null, save_preview: null, proposal_record: null, safety: safety({ explicit, revalidated }) };
}

function bodyFor(candidate: HermesDailyFarmBriefProposalCandidate): string {
  return `対象: ${candidate.preview.target_display}\n確認理由: ${candidate.basis}\n現在: ${candidate.before}\n対応: ${candidate.after}`;
}

function sameTarget(value: unknown, candidate: HermesDailyFarmBriefProposalCandidate): boolean {
  return isRecord(value) && exact(value, TARGET_KEYS) && TARGET_KEYS.every((key) => value[key] === candidate.target[key]);
}

export function parseHermesDailyFarmBriefProposalInboxRecord(input: {
  value: unknown;
  candidate: unknown;
}): HermesDailyFarmBriefProposalInboxRecord | null {
  const candidate = parseHermesDailyFarmBriefProposalCandidate(input.candidate);
  const value = input.value;
  if (candidate === null || !isRecord(value) || !exact(value, RECORD_KEYS) || typeof value.id !== "string" || !UUID_PATTERN.test(value.id) || value.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE || value.title !== TITLE || value.body !== bodyFor(candidate) || !safeBody(value.body) || value.model_name !== null || value.agent_name !== "hermes" || value.confidence !== null || value.reason !== candidate.basis || value.risk_level !== "low" || value.status !== "pending") return null;
  if (!isRecord(value.payload_json) || !exact(value.payload_json, PAYLOAD_KEYS) || !isRecord(value.source_refs_json) || !exact(value.source_refs_json, SOURCE_REF_KEYS)) return null;
  const payload = value.payload_json;
  const refs = value.source_refs_json;
  const idempotencyKey = createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(candidate.duplicate_signature);
  if (payload.schema_version !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION || payload.boundary !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY || payload.candidate_id !== candidate.candidate_id || payload.proposal_type !== candidate.proposal_type || !sameTarget(payload.target, candidate) || payload.basis !== candidate.basis || payload.before !== candidate.before || payload.after !== candidate.after || payload.risk_level !== candidate.risk_level || payload.source_business_date !== candidate.source_business_date || payload.source_generated_at !== candidate.source_generated_at || payload.source_version !== candidate.source_version || payload.expected_source_version !== candidate.expected_source_version || payload.created_at !== candidate.created_at || payload.expires_at !== candidate.expires_at || payload.requires_human_review !== true || payload.duplicate_signature !== candidate.duplicate_signature || payload.idempotency_key !== idempotencyKey || payload.explicit_save_requested !== true || payload.proposal_apply_ready !== false || payload.proposal_apply_performed !== false || payload.app_db_write_performed !== false) return null;
  if (refs.source !== "daily_farm_brief_attention" || refs.boundary !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY || refs.candidate_id !== candidate.candidate_id || refs.duplicate_signature !== candidate.duplicate_signature || refs.idempotency_key !== idempotencyKey || refs.source_business_date !== candidate.source_business_date || refs.source_version !== candidate.source_version) return null;
  return value as HermesDailyFarmBriefProposalInboxRecord;
}

export function prepareHermesDailyFarmBriefProposalExplicitSave(input: {
  request: unknown;
  actor: unknown;
  candidate: unknown;
  idFactory?: () => string;
}): HermesDailyFarmBriefProposalExplicitSavePreparation {
  const requestShape = parseRequestShape(input.request);
  if (requestShape === null) return rejected("invalid_save_request", false, false);
  if (requestShape.confirmation !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION) return rejected("explicit_confirmation_required", false, false);
  const request = requestShape as HermesDailyFarmBriefProposalExplicitSaveRequest;
  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(input.actor);
  if (actor === null) return rejected("actor_invalid", true, false);
  if (actor.role !== "administrator") return rejected("administrator_required", true, false);
  if (actor.allowed_scope_keys.length !== 0) return rejected("actor_invalid", true, false);
  const candidate = parseHermesDailyFarmBriefProposalCandidate(input.candidate);
  if (candidate === null) return rejected("candidate_invalid", true, false);
  if (request.candidate_id !== candidate.candidate_id || request.duplicate_signature !== candidate.duplicate_signature) return rejected("candidate_reference_mismatch", true, true);
  if (!candidate.stale.validation_passed || candidate.stale.stale_detected || candidate.stale.reason_codes.length !== 0 || !candidate.stale.future_explicit_save_eligible || !candidate.requires_human_review || candidate.save_allowed || candidate.apply_allowed || candidate.preview.proposal_saved || candidate.preview.proposal_apply_performed) return rejected("candidate_not_save_eligible", true, true);
  if (Date.parse(request.requested_at) > Date.parse(candidate.expires_at)) return rejected("candidate_expired_at_save_request", true, true);
  if (Date.parse(request.requested_at) < Date.parse(candidate.created_at)) return rejected("save_request_before_candidate_creation", true, true);
  const idempotencyKey = createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(candidate.duplicate_signature);
  const savePreview: HermesDailyFarmBriefProposalExplicitSavePreview = {
    schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION,
    proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
    title: TITLE,
    target_display: candidate.preview.target_display,
    basis: candidate.basis,
    before: candidate.before,
    after: candidate.after,
    risk_level: "low",
    expires_at: candidate.expires_at,
    requires_human_review: true,
    status_after_save: "pending",
    duplicate_signature: candidate.duplicate_signature,
    idempotency_key: idempotencyKey,
    proposal_saved: false,
    proposal_apply_performed: false,
  };
  let id: string;
  try { id = (input.idFactory ?? randomUUID)(); } catch { return rejected("candidate_invalid", true, true); }
  const recordCandidate: HermesDailyFarmBriefProposalInboxRecord = {
    id,
    proposal_type: HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
    title: TITLE,
    body: bodyFor(candidate),
    payload_json: {
      schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_INBOX_RECORD_SCHEMA_VERSION,
      boundary: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY,
      candidate_id: candidate.candidate_id,
      proposal_type: candidate.proposal_type,
      target: candidate.target,
      basis: candidate.basis,
      before: candidate.before,
      after: candidate.after,
      risk_level: candidate.risk_level,
      source_business_date: candidate.source_business_date,
      source_generated_at: candidate.source_generated_at,
      source_version: candidate.source_version,
      expected_source_version: candidate.expected_source_version,
      created_at: candidate.created_at,
      expires_at: candidate.expires_at,
      requires_human_review: true,
      duplicate_signature: candidate.duplicate_signature,
      idempotency_key: idempotencyKey,
      explicit_save_requested: true,
      proposal_apply_ready: false,
      proposal_apply_performed: false,
      app_db_write_performed: false,
    },
    source_refs_json: {
      source: "daily_farm_brief_attention",
      boundary: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_BOUNDARY,
      candidate_id: candidate.candidate_id,
      duplicate_signature: candidate.duplicate_signature,
      idempotency_key: idempotencyKey,
      source_business_date: candidate.source_business_date,
      source_version: candidate.source_version,
    },
    model_name: null,
    agent_name: "hermes",
    confidence: null,
    reason: candidate.basis,
    risk_level: "low",
    status: "pending",
  };
  const proposalRecord = parseHermesDailyFarmBriefProposalInboxRecord({ value: recordCandidate, candidate });
  if (proposalRecord === null) return rejected("candidate_invalid", true, true);
  return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PREVIEW_SCHEMA_VERSION, status: "ready", rejection_reason: null, idempotency_key: idempotencyKey, save_preview: savePreview, proposal_record: proposalRecord, safety: safety({ explicit: true, revalidated: true }) };
}

function persistence(
  status: HermesDailyFarmBriefProposalExplicitSavePersistenceResult["status"],
  preparationSafety: HermesDailyFarmBriefProposalExplicitSaveSafety,
): HermesDailyFarmBriefProposalExplicitSavePersistenceResult {
  const saved = status === "saved" || status === "already_saved";
  const written = status === "saved";
  return {
    status,
    proposal_saved: saved,
    database_write_performed: written,
    deduplicated_existing_record: status === "already_saved",
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    app_db_write_performed: false,
    audit_write_performed: false,
    retry_count: 0,
    insert_target_schema: "ai",
    insert_target_table: "proposal_inbox",
    safety: safety({
      explicit: preparationSafety.explicit_save_requested,
      revalidated: preparationSafety.candidate_revalidated,
      saved,
      written,
    }),
  };
}

function validSummary(value: unknown): value is PersistedProposalSummary {
  return isRecord(value) && exact(value, ["id", "proposal_type", "title", "status"]) && typeof value.id === "string" && UUID_PATTERN.test(value.id) && value.proposal_type === HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE && safeText(value.title, 200) && safeText(value.status, 100);
}

async function persistPreparedHermesDailyFarmBriefProposalExplicitSave(input: {
  preparation: ReadyResult;
  candidate: HermesDailyFarmBriefProposalCandidate;
  repository: ExplicitSaveRepository;
}): Promise<HermesDailyFarmBriefProposalExplicitSavePersistenceResult> {
  const idempotencyKey = createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(input.candidate.duplicate_signature);
  const record = parseHermesDailyFarmBriefProposalInboxRecord({
    value: input.preparation.proposal_record,
    candidate: input.candidate,
  });
  if (
    record === null ||
    input.preparation.idempotency_key !== idempotencyKey ||
    input.preparation.save_preview.idempotency_key !== idempotencyKey ||
    record.payload_json.idempotency_key !== idempotencyKey ||
    record.source_refs_json.idempotency_key !== idempotencyKey
  ) return persistence("failed", input.preparation.safety);
  try {
    const existing = await input.repository.findExistingByIdempotencyKey(idempotencyKey);
    if (existing !== null) return validSummary(existing) ? persistence("already_saved", input.preparation.safety) : persistence("failed", input.preparation.safety);
    const inserted = await input.repository.insertProposal(record);
    return validSummary(inserted)
      ? persistence(inserted.id === record.id ? "saved" : "already_saved", input.preparation.safety)
      : persistence("failed", input.preparation.safety);
  } catch {
    return persistence("failed", input.preparation.safety);
  }
}

export async function executeHermesDailyFarmBriefProposalExplicitSave(input: {
  request: unknown;
  actor: unknown;
  candidate: unknown;
  idFactory?: () => string;
  repository: ExplicitSaveRepository;
}): Promise<HermesDailyFarmBriefProposalExplicitSavePersistenceResult> {
  const preparation = prepareHermesDailyFarmBriefProposalExplicitSave({
    request: input.request,
    actor: input.actor,
    candidate: input.candidate,
    idFactory: input.idFactory,
  });
  if (preparation.status !== "ready") return persistence("rejected", preparation.safety);
  const candidate = parseHermesDailyFarmBriefProposalCandidate(input.candidate);
  if (candidate === null) return persistence("failed", preparation.safety);
  return persistPreparedHermesDailyFarmBriefProposalExplicitSave({
    preparation,
    candidate,
    repository: input.repository,
  });
}
