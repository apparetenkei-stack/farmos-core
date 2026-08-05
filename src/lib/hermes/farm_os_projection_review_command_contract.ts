import { createHash } from "node:crypto";

export const FARM_OS_PROJECTION_COMMAND_TYPES = [
  "review_projection_candidate",
  "promote_projection_candidate",
  "reject_projection_candidate",
  "rebuild_projection_candidate",
] as const;

export type FarmOsProjectionCommandType =
  typeof FARM_OS_PROJECTION_COMMAND_TYPES[number];

export const FARM_OS_PROJECTION_REVIEW_DECISIONS = [
  "approve",
  "reject",
  "request_rebuild",
] as const;

export type FarmOsProjectionReviewDecision =
  typeof FARM_OS_PROJECTION_REVIEW_DECISIONS[number];

export const FARM_OS_PROJECTION_COMMAND_FAILURE_CODES = [
  "command_contract_invalid",
  "authentication_required",
  "authorization_denied",
  "candidate_not_found",
  "candidate_not_candidate",
  "review_version_conflict",
  "review_decision_missing",
  "review_decision_invalid",
  "review_decision_stale",
  "approval_missing",
  "approval_invalid",
  "candidate_version_conflict",
  "active_version_conflict",
  "active_identity_conflict",
  "projection_key_mismatch",
  "multiple_active_conflict",
  "duplicate_command_conflict",
  "invalid_state_transition",
  "lineage_invalid",
  "content_hash_invalid",
  "command_receipt_invalid",
  "readback_failed",
  "repository_unavailable",
  "transaction_failed",
  "rebuild_input_unavailable",
  "rebuild_input_stale",
  "rebuild_input_ambiguous",
  "rebuild_input_invalid",
] as const;

export type FarmOsProjectionCommandFailureCode =
  typeof FARM_OS_PROJECTION_COMMAND_FAILURE_CODES[number];

export const FARM_OS_PROJECTION_COMMAND_PERSISTED_REJECTION_CODES = [
  "candidate_not_found", "candidate_not_candidate", "review_version_conflict",
  "review_decision_missing", "review_decision_invalid", "review_decision_stale",
  "approval_missing", "approval_invalid", "candidate_version_conflict",
  "active_version_conflict", "active_identity_conflict", "projection_key_mismatch",
  "multiple_active_conflict", "invalid_state_transition", "lineage_invalid",
  "content_hash_invalid", "rebuild_input_unavailable", "rebuild_input_stale",
  "rebuild_input_ambiguous", "rebuild_input_invalid",
] as const satisfies readonly FarmOsProjectionCommandFailureCode[];

export type FarmOsExpectedProjectionVersion = Readonly<{
  projection_id: string;
  projection_version: number;
  state_sequence: number;
  content_hash: string;
}>;

export type FarmOsExpectedActive =
  | Readonly<{ presence: "absent" }>
  | Readonly<{
    presence: "present";
    projection_id: string;
    projection_version: number;
    state_sequence: number;
    content_hash: string;
  }>;

export type FarmOsProjectionReviewReference = Readonly<{
  review_id: string;
  review_sequence: number;
}>;

type SharedCommand = Readonly<{
  command_id: string;
  command_type: FarmOsProjectionCommandType;
  idempotency_key: string;
  requested_by: string;
  requested_at: string;
}>;

export type FarmOsProjectionReviewCommand = SharedCommand & Readonly<{
  schema_version: "farmos.projection.review.command.v1";
  command_type: "review_projection_candidate";
  candidate_projection_id: string;
  expected_candidate_version: FarmOsExpectedProjectionVersion;
  decision: FarmOsProjectionReviewDecision;
  reason: string;
  reviewed_by: string;
  reviewed_at: string;
  expected_review_sequence: number;
}>;

export type FarmOsProjectionPromoteCommand = SharedCommand & Readonly<{
  schema_version: "farmos.projection.promote.command.v1";
  command_type: "promote_projection_candidate";
  candidate_projection_id: string;
  expected_candidate_version: FarmOsExpectedProjectionVersion;
  expected_active: FarmOsExpectedActive;
  review_decision_reference: FarmOsProjectionReviewReference;
  approved_by: string;
}>;

export type FarmOsProjectionRejectCommand = SharedCommand & Readonly<{
  schema_version: "farmos.projection.reject.command.v1";
  command_type: "reject_projection_candidate";
  candidate_projection_id: string;
  expected_candidate_version: FarmOsExpectedProjectionVersion;
  review_decision_reference: FarmOsProjectionReviewReference;
  reason: string;
}>;

export type FarmOsProjectionRebuildCommand = SharedCommand & Readonly<{
  schema_version: "farmos.projection.rebuild.command.v1";
  command_type: "rebuild_projection_candidate";
  candidate_projection_id: string;
  expected_candidate_version: FarmOsExpectedProjectionVersion;
  review_decision_reference: FarmOsProjectionReviewReference;
  source_input: unknown;
  source_input_hash: string;
}>;

export type FarmOsProjectionCommand =
  | FarmOsProjectionReviewCommand
  | FarmOsProjectionPromoteCommand
  | FarmOsProjectionRejectCommand
  | FarmOsProjectionRebuildCommand;

export type FarmOsProjectionCommandAuthority = Readonly<{
  actor_type: "authenticated_human";
  authenticated_principal_id: string;
  capabilities: readonly string[];
  authorized_farm_scope: string;
}>;

export type FarmOsProjectionCommandResultPayload = Readonly<{
  schema_version: "farmos.projection.command-result.v1";
  command_id: string;
  command_type: FarmOsProjectionCommandType;
  outcome: "succeeded" | "rejected";
  result_code: string;
  review_decision_id: string | null;
  affected_projection_ids: readonly string[];
  committed_state_event_sequences: readonly number[];
}>;

export type FarmOsProjectionReviewDecisionRecord = Readonly<{
  review_id: string;
  candidate_projection_id: string;
  candidate_projection_version: number;
  candidate_state_sequence: number;
  candidate_content_hash: string;
  review_sequence: number;
  decision: FarmOsProjectionReviewDecision;
  reason: string;
  reviewed_by: string;
  reviewed_at: string;
  command_id: string;
  canonical_payload_hash: string;
}>;

export type FarmOsProjectionCommandReceiptRecord = Readonly<{
  receipt_schema_version: "farmos.projection.command-receipt.v1";
  command_id: string;
  idempotency_key_hash: string;
  command_type: FarmOsProjectionCommandType;
  canonical_payload_hash: string;
  result_status: "succeeded" | "rejected";
  result_code: string;
  result_payload: FarmOsProjectionCommandResultPayload;
  result_payload_hash: string;
  requested_by: string;
  requested_at: string;
  committed_at: string;
  review_decision_id: string | null;
  affected_projection_id_1: string | null;
  committed_state_event_id_1: string | null;
  committed_state_event_sequence_1: number | null;
  affected_projection_id_2: string | null;
  committed_state_event_id_2: string | null;
  committed_state_event_sequence_2: number | null;
}>;

export type FarmOsProjectionCommandProjectionRecord = Readonly<{
  projection_id: string;
  projection_type: "daily_work_records";
  projection_version: number;
  business_date: string;
  compiler_id: "farmos.operational_memory.daily_work_records";
  compiler_version: 1;
  content_hash: string;
  projection_content: unknown;
  generated_at: string;
  supersedes_projection_id: null;
}>;

export type FarmOsProjectionCommandEventRecord = Readonly<{
  event_id: string;
  projection_id: string;
  status: "candidate" | "active" | "rejected" | "superseded";
  sequence: number;
  occurred_at: string;
}>;

export type FarmOsProjectionCommandLineageRecord = Readonly<{
  projection_id: string;
  snapshot_id: string;
  source_record_id: string;
  source_content_hash: string | null;
  relation: "included" | "excluded_by_tombstone" | "superseded";
}>;

export type FarmOsProjectionCommandPersistencePlan = Readonly<{
  receipt: FarmOsProjectionCommandReceiptRecord;
  review_decision: FarmOsProjectionReviewDecisionRecord | null;
  rebuild_projection: FarmOsProjectionCommandProjectionRecord | null;
  projection_events: readonly FarmOsProjectionCommandEventRecord[];
  rebuild_lineage: readonly FarmOsProjectionCommandLineageRecord[];
}>;

type JsonRecord = Record<string, unknown>;

const COMMAND_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const PROJECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const REVIEW_ID = /^projection_review_[0-9a-f]{32}$/;
const HASH = /^[0-9a-f]{64}$/;
const PREFIXED_HASH = /^sha256:[0-9a-f]{64}$/;
const ACTOR = /^[A-Za-z0-9][A-Za-z0-9._:@-]{2,127}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{7,255}$/;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const PROHIBITED_TEXT = /(?:password|postgres(?:ql)?:\/\/|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\/[A-Za-z0-9._-]+\/|[\u0000-\u001f\u007f])/i;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function timestamp(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_TIMESTAMP.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function expectedVersion(value: unknown): value is FarmOsExpectedProjectionVersion {
  return record(value) && exactKeys(value, [
    "projection_id", "projection_version", "state_sequence", "content_hash",
  ]) && typeof value.projection_id === "string" &&
    PROJECTION_ID.test(value.projection_id) &&
    positiveInteger(value.projection_version) &&
    positiveInteger(value.state_sequence) &&
    typeof value.content_hash === "string" && HASH.test(value.content_hash);
}

function expectedActive(value: unknown): value is FarmOsExpectedActive {
  if (!record(value) || typeof value.presence !== "string") return false;
  if (value.presence === "absent") return exactKeys(value, ["presence"]);
  return value.presence === "present" && exactKeys(value, [
    "presence", "projection_id", "projection_version", "state_sequence",
    "content_hash",
  ]) && typeof value.projection_id === "string" &&
    PROJECTION_ID.test(value.projection_id) &&
    positiveInteger(value.projection_version) &&
    positiveInteger(value.state_sequence) &&
    typeof value.content_hash === "string" && HASH.test(value.content_hash);
}

function reviewReference(value: unknown): value is FarmOsProjectionReviewReference {
  return record(value) && exactKeys(value, ["review_id", "review_sequence"]) &&
    typeof value.review_id === "string" && REVIEW_ID.test(value.review_id) &&
    positiveInteger(value.review_sequence);
}

function common(value: JsonRecord, type: FarmOsProjectionCommandType): boolean {
  return value.command_type === type &&
    typeof value.command_id === "string" && COMMAND_ID.test(value.command_id) &&
    typeof value.idempotency_key === "string" &&
    IDEMPOTENCY_KEY.test(value.idempotency_key) &&
    typeof value.requested_by === "string" && ACTOR.test(value.requested_by) &&
    timestamp(value.requested_at);
}

function reason(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() &&
    value.length > 0 && value.length <= 2000 && !PROHIBITED_TEXT.test(value);
}

export type FarmOsProjectionCommandParseResult =
  | Readonly<{ valid: true; value: FarmOsProjectionCommand; failure_code: null }>
  | Readonly<{
    valid: false;
    value: null;
    failure_code: "command_contract_invalid";
  }>;

export function parseFarmOsProjectionCommand(
  value: unknown,
): FarmOsProjectionCommandParseResult {
  if (!record(value) || typeof value.command_type !== "string") {
    return { valid: false, value: null, failure_code: "command_contract_invalid" };
  }
  const fail = () => ({
    valid: false as const,
    value: null,
    failure_code: "command_contract_invalid" as const,
  });
  if (value.command_type === "review_projection_candidate") {
    if (!exactKeys(value, [
      "schema_version", "command_id", "command_type", "candidate_projection_id",
      "expected_candidate_version", "decision", "reason", "requested_by",
      "requested_at", "reviewed_by", "reviewed_at", "expected_review_sequence",
      "idempotency_key",
    ]) || value.schema_version !== "farmos.projection.review.command.v1" ||
      !common(value, value.command_type) ||
      typeof value.candidate_projection_id !== "string" ||
      !PROJECTION_ID.test(value.candidate_projection_id) ||
      !expectedVersion(value.expected_candidate_version) ||
      value.expected_candidate_version.projection_id !== value.candidate_projection_id ||
      !FARM_OS_PROJECTION_REVIEW_DECISIONS.includes(
        value.decision as FarmOsProjectionReviewDecision,
      ) || !reason(value.reason) || typeof value.reviewed_by !== "string" ||
      !ACTOR.test(value.reviewed_by) || value.reviewed_by !== value.requested_by ||
      !timestamp(value.reviewed_at) || value.reviewed_at !== value.requested_at ||
      !nonNegativeInteger(value.expected_review_sequence)) return fail();
    return { valid: true, value: value as FarmOsProjectionReviewCommand, failure_code: null };
  }
  if (value.command_type === "promote_projection_candidate") {
    if (!exactKeys(value, [
      "schema_version", "command_id", "command_type", "candidate_projection_id",
      "expected_candidate_version", "expected_active", "review_decision_reference",
      "requested_by", "approved_by", "idempotency_key", "requested_at",
    ]) || value.schema_version !== "farmos.projection.promote.command.v1" ||
      !common(value, value.command_type) ||
      typeof value.candidate_projection_id !== "string" ||
      !PROJECTION_ID.test(value.candidate_projection_id) ||
      !expectedVersion(value.expected_candidate_version) ||
      value.expected_candidate_version.projection_id !== value.candidate_projection_id ||
      !expectedActive(value.expected_active) ||
      !reviewReference(value.review_decision_reference) ||
      typeof value.approved_by !== "string" || !ACTOR.test(value.approved_by)) return fail();
    return { valid: true, value: value as FarmOsProjectionPromoteCommand, failure_code: null };
  }
  if (value.command_type === "reject_projection_candidate") {
    if (!exactKeys(value, [
      "schema_version", "command_id", "command_type", "candidate_projection_id",
      "expected_candidate_version", "review_decision_reference", "reason",
      "requested_by", "idempotency_key", "requested_at",
    ]) || value.schema_version !== "farmos.projection.reject.command.v1" ||
      !common(value, value.command_type) ||
      typeof value.candidate_projection_id !== "string" ||
      !PROJECTION_ID.test(value.candidate_projection_id) ||
      !expectedVersion(value.expected_candidate_version) ||
      value.expected_candidate_version.projection_id !== value.candidate_projection_id ||
      !reviewReference(value.review_decision_reference) || !reason(value.reason)) return fail();
    return { valid: true, value: value as FarmOsProjectionRejectCommand, failure_code: null };
  }
  if (value.command_type === "rebuild_projection_candidate") {
    if (!exactKeys(value, [
      "schema_version", "command_id", "command_type", "candidate_projection_id",
      "expected_candidate_version", "review_decision_reference", "source_input",
      "source_input_hash", "requested_by", "idempotency_key", "requested_at",
    ]) || value.schema_version !== "farmos.projection.rebuild.command.v1" ||
      !common(value, value.command_type) ||
      typeof value.candidate_projection_id !== "string" ||
      !PROJECTION_ID.test(value.candidate_projection_id) ||
      !expectedVersion(value.expected_candidate_version) ||
      value.expected_candidate_version.projection_id !== value.candidate_projection_id ||
      !reviewReference(value.review_decision_reference) ||
      typeof value.source_input_hash !== "string" || !HASH.test(value.source_input_hash)) {
      return fail();
    }
    return { valid: true, value: value as FarmOsProjectionRebuildCommand, failure_code: null };
  }
  return fail();
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("projection_command_canonical_json_invalid");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!record(value)) throw new Error("projection_command_canonical_json_invalid");
  const entries = Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`
  );
  return `{${entries.join(",")}}`;
}

export function sha256Prefixed(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function hashFarmOsProjectionCommand(command: FarmOsProjectionCommand): string {
  return sha256Prefixed(canonicalJson(command));
}

export function hashFarmOsProjectionIdempotencyKey(key: string): string {
  return sha256Prefixed(key);
}

const RESULT_KEYS = [
  "schema_version", "command_id", "command_type", "outcome", "result_code",
  "review_decision_id", "affected_projection_ids",
  "committed_state_event_sequences",
] as const;

export function validateFarmOsProjectionCommandResultPayload(
  value: unknown,
): value is FarmOsProjectionCommandResultPayload {
  if (!record(value) || !exactKeys(value, RESULT_KEYS) ||
    value.schema_version !== "farmos.projection.command-result.v1" ||
    typeof value.command_id !== "string" || !COMMAND_ID.test(value.command_id) ||
    !FARM_OS_PROJECTION_COMMAND_TYPES.includes(value.command_type as FarmOsProjectionCommandType) ||
    (value.outcome !== "succeeded" && value.outcome !== "rejected") ||
    typeof value.result_code !== "string" || value.result_code.length < 3 ||
    !(value.review_decision_id === null ||
      (typeof value.review_decision_id === "string" && REVIEW_ID.test(value.review_decision_id))) ||
    !Array.isArray(value.affected_projection_ids) ||
    value.affected_projection_ids.length > 2 ||
    value.affected_projection_ids.some((id) => typeof id !== "string" || !PROJECTION_ID.test(id)) ||
    new Set(value.affected_projection_ids).size !== value.affected_projection_ids.length ||
    !Array.isArray(value.committed_state_event_sequences) ||
    value.committed_state_event_sequences.length !== value.affected_projection_ids.length ||
    value.committed_state_event_sequences.some((sequence) => !positiveInteger(sequence))) {
    return false;
  }
  if (value.outcome === "rejected") {
    return FARM_OS_PROJECTION_COMMAND_PERSISTED_REJECTION_CODES.includes(
      value.result_code as typeof FARM_OS_PROJECTION_COMMAND_PERSISTED_REJECTION_CODES[number],
    ) && value.review_decision_id === null &&
      value.affected_projection_ids.length === 0;
  }
  const succeeded = {
    review_projection_candidate: { code: "review_recorded", event_count: [0] },
    promote_projection_candidate: { code: "projection_promoted", event_count: [1, 2] },
    reject_projection_candidate: { code: "projection_rejected", event_count: [1] },
    rebuild_projection_candidate: { code: "projection_rebuilt", event_count: [1] },
  } as const;
  const contract = succeeded[value.command_type as FarmOsProjectionCommandType];
  return value.result_code === contract.code && value.review_decision_id !== null &&
    (contract.event_count as readonly number[]).includes(
      value.affected_projection_ids.length,
    );
}

export function validateFarmOsProjectionCommandAuthority(
  command: FarmOsProjectionCommand,
  authority: FarmOsProjectionCommandAuthority,
): "authentication_required" | "authorization_denied" | null {
  if (authority.actor_type !== "authenticated_human" ||
    !ACTOR.test(authority.authenticated_principal_id)) return "authentication_required";
  if (command.requested_by !== authority.authenticated_principal_id ||
    (command.command_type === "review_projection_candidate" &&
      command.reviewed_by !== authority.authenticated_principal_id)) {
    return "authorization_denied";
  }
  const required = {
    review_projection_candidate: "farmos_projection_review",
    promote_projection_candidate: "farmos_projection_promote",
    reject_projection_candidate: "farmos_projection_reject",
    rebuild_projection_candidate: "farmos_projection_rebuild",
  } as const;
  return authority.capabilities.includes(required[command.command_type])
    ? null
    : "authorization_denied";
}

export function farmOsProjectionReviewId(commandHash: string): string {
  if (!PREFIXED_HASH.test(commandHash)) {
    throw new Error("projection_command_hash_invalid");
  }
  return `projection_review_${commandHash.slice("sha256:".length, "sha256:".length + 32)}`;
}

export function farmOsProjectionCommandEventId(
  commandHash: string,
  slot: 1 | 2,
): string {
  if (!PREFIXED_HASH.test(commandHash)) {
    throw new Error("projection_command_hash_invalid");
  }
  return `projection_command_event_${commandHash.slice(7, 39)}_${slot}`;
}
