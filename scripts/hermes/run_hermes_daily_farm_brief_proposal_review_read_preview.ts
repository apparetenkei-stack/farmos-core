import {
  createHermesDailyFarmBriefProposalDetailResponse,
  createHermesDailyFarmBriefProposalListResponse,
  createHermesDailyFarmBriefProposalSafeReference,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

const idempotencyKey = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const row = {
  id: "14711111-88db-41fd-a048-1c37266fd9e1", proposal_type: "work_log_follow_up", title: "作業記録の確認が必要です",
  body: "対象: Field (redacted identifier)\n確認理由: 作業開始日時の形式を確認してください。\n現在: 作業日を確認できません\n対応: 作業記録一覧で確認してください",
  payload_json: {
    schema_version: "hermes.daily_farm_brief.proposal_inbox_record.v1", boundary: "day126_daily_farm_brief_explicit_save", candidate_id: "proposal_candidate_aaaaaaaaaaaaaaaaaaaaaaaa", proposal_type: "work_log_follow_up",
    target: { target_kind: "work_log_follow_up", safe_scope: "scope_field_aaaaaaaaaaaaaaaaaaaaaaaa", display_label: "Field (redacted identifier)", work_type_label: "苗場水かけ" },
    basis: "作業開始日時の形式を確認してください。", before: "作業日を確認できません", after: "作業記録一覧で確認してください", risk_level: "low", source_business_date: "2026-07-17",
    source_generated_at: "2026-07-17T21:00:00.000Z", source_version: 1, expected_source_version: 1, created_at: "2026-07-17T21:05:00.000Z", expires_at: "2026-07-19T21:05:00.000Z",
    requires_human_review: true, duplicate_signature: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", idempotency_key: idempotencyKey,
    explicit_save_requested: true, proposal_apply_ready: false, proposal_apply_performed: false, app_db_write_performed: false,
  },
  source_refs_json: { source: "daily_farm_brief_attention", boundary: "day126_daily_farm_brief_explicit_save", candidate_id: "proposal_candidate_aaaaaaaaaaaaaaaaaaaaaaaa", duplicate_signature: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", idempotency_key: idempotencyKey, source_business_date: "2026-07-17", source_version: 1 },
  model_name: null, agent_name: "hermes", confidence: null, reason: "作業開始日時の形式を確認してください。", risk_level: "low", status: "pending",
  reviewed_by: null, reviewed_at: null, review_note: null, applied_at: null, applied_by: null, created_at: "2026-07-17T21:05:00.000Z", updated_at: "2026-07-17T21:05:00.000Z",
};
const request = { schema_version: "hermes.daily_farm_brief.proposal_review_read_request.v1", requested_at: "2026-07-18T04:00:00.000Z" };
const actor = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "administrator-preview", role: "administrator", allowed_scope_keys: [], authorization_verified: true };
const proposalRef = createHermesDailyFarmBriefProposalSafeReference(idempotencyKey);
console.log(JSON.stringify({ list: createHermesDailyFarmBriefProposalListResponse({ request, actor, rows: [row] }), detail: createHermesDailyFarmBriefProposalDetailResponse({ request, actor, proposalRef, row }) }, null, 2));
