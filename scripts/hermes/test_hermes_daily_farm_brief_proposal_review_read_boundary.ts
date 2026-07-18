import {
  createHermesDailyFarmBriefProposalDetailResponse,
  createHermesDailyFarmBriefProposalListResponse,
  createHermesDailyFarmBriefProposalSafeReference,
  parseHermesDailyFarmBriefProposalReviewRawRow,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const REQUEST = { schema_version: "hermes.daily_farm_brief.proposal_review_read_request.v1", requested_at: "2026-07-18T04:00:00.000Z" };
const ADMINISTRATOR = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "administrator-fixture", role: "administrator", allowed_scope_keys: [], authorization_verified: true };
const GENERAL_STAFF = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "general-staff-fixture", role: "general_staff", allowed_scope_keys: ["scope_field_aaaaaaaaaaaaaaaaaaaaaaaa"], authorization_verified: true };
const IDEMPOTENCY_KEY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DUPLICATE_SIGNATURE = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function validRow() {
  return {
    id: "14711111-88db-41fd-a048-1c37266fd9e1", proposal_type: "work_log_follow_up", title: "作業記録の確認が必要です",
    body: "対象: Field (redacted identifier)\n確認理由: 作業開始日時の形式を確認してください。\n現在: 作業日を確認できません\n対応: 作業記録一覧で確認してください",
    payload_json: {
      schema_version: "hermes.daily_farm_brief.proposal_inbox_record.v1", boundary: "day126_daily_farm_brief_explicit_save",
      candidate_id: "proposal_candidate_aaaaaaaaaaaaaaaaaaaaaaaa", proposal_type: "work_log_follow_up",
      target: { target_kind: "work_log_follow_up", safe_scope: "scope_field_aaaaaaaaaaaaaaaaaaaaaaaa", display_label: "Field (redacted identifier)", work_type_label: "苗場水かけ" },
      basis: "作業開始日時の形式を確認してください。", before: "作業日を確認できません", after: "作業記録一覧で確認してください", risk_level: "low",
      source_business_date: "2026-07-17", source_generated_at: "2026-07-17T21:00:00.000Z", source_version: 1, expected_source_version: 1,
      created_at: "2026-07-17T21:05:00.000Z", expires_at: "2026-07-19T21:05:00.000Z", requires_human_review: true,
      duplicate_signature: DUPLICATE_SIGNATURE, idempotency_key: IDEMPOTENCY_KEY, explicit_save_requested: true,
      proposal_apply_ready: false, proposal_apply_performed: false, app_db_write_performed: false,
    },
    source_refs_json: { source: "daily_farm_brief_attention", boundary: "day126_daily_farm_brief_explicit_save", candidate_id: "proposal_candidate_aaaaaaaaaaaaaaaaaaaaaaaa", duplicate_signature: DUPLICATE_SIGNATURE, idempotency_key: IDEMPOTENCY_KEY, source_business_date: "2026-07-17", source_version: 1 },
    model_name: null, agent_name: "hermes", confidence: null, reason: "作業開始日時の形式を確認してください。", risk_level: "low", status: "pending",
    reviewed_by: null, reviewed_at: null, review_note: null, applied_at: null, applied_by: null,
    created_at: "2026-07-17T21:05:00.000Z", updated_at: "2026-07-17T21:05:00.000Z",
  };
}

const safeReference = createHermesDailyFarmBriefProposalSafeReference(IDEMPOTENCY_KEY);
assert(/^daily_brief_proposal_[a-f0-9]{24}$/.test(safeReference), "safe reference format invalid");
const parsed = parseHermesDailyFarmBriefProposalReviewRawRow(validRow());
assert(parsed !== null, "valid Day126 row must parse");

const list = createHermesDailyFarmBriefProposalListResponse({ request: REQUEST, actor: ADMINISTRATOR, rows: [validRow()] });
assert(list.result === "ok", "administrator list must succeed");
assert(list.proposals.length === 1, "list must contain one item");
assert(list.proposals[0].proposal_ref === safeReference, "safe reference mismatch");
assert(list.proposals[0].expiry_state === "active", "active expiry state expected");
assert(!JSON.stringify(list).includes("14711111-88db-41fd-a048-1c37266fd9e1"), "raw UUID must not be exposed");
assert(!JSON.stringify(list).includes("proposal_candidate_"), "candidate ID must not be exposed");
assert(!JSON.stringify(list).includes(IDEMPOTENCY_KEY), "idempotency key must not be exposed");
assert(!JSON.stringify(list).includes(DUPLICATE_SIGNATURE), "duplicate signature must not be exposed");
assert(!JSON.stringify(list).includes("administrator-fixture"), "principal reference must not be exposed");
assert(list.safety.database_write_performed === false, "database write must remain false");
assert(list.safety.proposal_update_performed === false, "proposal update must remain false");
assert(list.safety.proposal_apply_performed === false, "proposal apply must remain false");

const detail = createHermesDailyFarmBriefProposalDetailResponse({ request: REQUEST, actor: ADMINISTRATOR, proposalRef: safeReference, row: validRow() });
assert(detail.result === "ok", "detail must succeed");
assert(detail.proposal.target_display === "Field (redacted identifier)", "safe target display expected");
assert(detail.proposal.proposal_apply_ready === false, "proposal must not be apply ready");
assert(!JSON.stringify(detail).includes("14711111-88db-41fd-a048-1c37266fd9e1"), "detail must not expose raw UUID");
assert(!JSON.stringify(detail).includes(IDEMPOTENCY_KEY), "detail must not expose idempotency key");

const generalStaffList = createHermesDailyFarmBriefProposalListResponse({ request: REQUEST, actor: GENERAL_STAFF, rows: [validRow()] });
assert(generalStaffList.result === "error" && generalStaffList.error === "access_forbidden", "general staff must be forbidden");
const unauthenticated = createHermesDailyFarmBriefProposalListResponse({ request: REQUEST, actor: null, rows: [validRow()] });
assert(unauthenticated.result === "error" && unauthenticated.error === "authentication_required", "null actor must require authentication");
const invalidReference = createHermesDailyFarmBriefProposalDetailResponse({ request: REQUEST, actor: ADMINISTRATOR, proposalRef: "14711111-88db-41fd-a048-1c37266fd9e1", row: validRow() });
assert(invalidReference.result === "error" && invalidReference.error === "invalid_proposal_reference", "raw UUID must not be accepted as public reference");
const mismatchedReference = createHermesDailyFarmBriefProposalDetailResponse({ request: REQUEST, actor: ADMINISTRATOR, proposalRef: "daily_brief_proposal_000000000000000000000000", row: validRow() });
assert(mismatchedReference.result === "error" && mismatchedReference.error === "proposal_read_failed", "mismatched safe reference must fail closed");
const missing = createHermesDailyFarmBriefProposalDetailResponse({ request: REQUEST, actor: ADMINISTRATOR, proposalRef: safeReference, row: null });
assert(missing.result === "error" && missing.error === "proposal_not_found", "missing proposal must return proposal_not_found");

const expiredRow = validRow(); expiredRow.payload_json.expires_at = "2026-07-17T22:00:00.000Z";
const expiredList = createHermesDailyFarmBriefProposalListResponse({ request: REQUEST, actor: ADMINISTRATOR, rows: [expiredRow] });
assert(expiredList.result === "ok" && expiredList.proposals[0].expiry_state === "expired", "expired proposal must be displayed as expired");
const unknownSchema = validRow(); unknownSchema.payload_json.schema_version = "hermes.daily_farm_brief.proposal_inbox_record.v2";
assert(parseHermesDailyFarmBriefProposalReviewRawRow(unknownSchema) === null, "unknown payload schema must fail closed");
const unknownStatus = validRow(); unknownStatus.status = "unknown";
assert(parseHermesDailyFarmBriefProposalReviewRawRow(unknownStatus) === null, "unknown status must fail closed");
const unknownKey = { ...validRow(), unexpected_key: true };
assert(parseHermesDailyFarmBriefProposalReviewRawRow(unknownKey) === null, "unknown row key must fail closed");
const principalLeak = validRow(); principalLeak.reviewed_by = "administrator-fixture";
const reviewedProjection = createHermesDailyFarmBriefProposalListResponse({ request: REQUEST, actor: ADMINISTRATOR, rows: [principalLeak] });
assert(reviewedProjection.result === "ok", "reviewed row remains displayable");
assert(!JSON.stringify(reviewedProjection).includes("administrator-fixture"), "review principal must not be exposed");

console.log(JSON.stringify({ boundary: "day127_daily_farm_brief_proposal_review_read", list_result: list.result, detail_result: detail.result, safe_reference: safeReference, raw_identifier_exposed: false, principal_ref_exposed: false, unknown_schema_fail_closed: true, administrator_required: true, general_staff_forbidden: true, database_write_performed: false, proposal_insert_performed: false, proposal_update_performed: false, proposal_delete_performed: false, proposal_apply_performed: false, app_database_write_performed: false, audit_database_write_performed: false, retry_count: 0 }, null, 2));
console.log("Daily Brief Proposal review read boundary tests passed");
