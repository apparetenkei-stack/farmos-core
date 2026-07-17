import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY,
  createHermesDailyFarmBriefProposalCandidate,
  createHermesDailyFarmBriefProposalCandidateDuplicateSignature,
  parseHermesDailyFarmBriefProposalCandidate,
  parseHermesDailyFarmBriefProposalCandidateInput,
  type HermesDailyFarmBriefProposalCandidate,
  type HermesDailyFarmBriefProposalCandidateInput,
  type HermesDailyFarmBriefProposalCandidateSignatureInput,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";

const NOW = "2026-07-17T03:00:00.000Z";

function input(overrides: {
  businessDate?: string;
  generatedAt?: string;
  version?: number;
  displayState?: "current" | "stale";
  fieldLabel?: string | null;
  workTypeLabel?: string | null;
  reasonCode?: "work_log_started_at_missing" | "work_log_started_at_invalid";
} = {}): HermesDailyFarmBriefProposalCandidateInput {
  const reasonCode = overrides.reasonCode ?? "work_log_started_at_missing";
  return {
    schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
    proposal_type: "work_log_follow_up",
    suggestion_type: "work_log_attention",
    source: {
      business_date: overrides.businessDate ?? "2026-07-17",
      generated_at: overrides.generatedAt ?? "2026-07-17T00:00:00.000Z",
      version: overrides.version ?? 2,
      display_state: overrides.displayState ?? "current",
    },
    attention: {
      reason_code: reasonCode,
      reason: reasonCode === "work_log_started_at_missing" ? "作業開始日時が入力されていません。" : "作業開始日時の形式を確認してください。",
      field_label: overrides.fieldLabel === undefined ? "北側圃場" : overrides.fieldLabel,
      work_type_label: overrides.workTypeLabel === undefined ? "収穫" : overrides.workTypeLabel,
      work_date: null,
      evidence_type: "work_log",
    },
  };
}

function create(value: unknown, options: { now?: string; expectedVersion?: number } = {}) {
  return createHermesDailyFarmBriefProposalCandidate({
    value,
    expectedSourceVersion: options.expectedVersion ?? 2,
    clock: () => options.now ?? NOW,
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function signatureParts(candidate: HermesDailyFarmBriefProposalCandidate): HermesDailyFarmBriefProposalCandidateSignatureInput {
  return {
    schema_version: candidate.schema_version,
    proposal_type: candidate.proposal_type,
    source_business_date: candidate.source_business_date,
    source_version: candidate.source_version,
    attention_reason_code: candidate.source.attention_reason_code,
    target_safe_scope: candidate.target.safe_scope,
    basis: candidate.basis,
    before: candidate.before,
    after: candidate.after,
  };
}

function replaceStaleReasons(
  candidate: HermesDailyFarmBriefProposalCandidate,
  reasons: HermesDailyFarmBriefProposalCandidate["stale"]["reason_codes"],
): HermesDailyFarmBriefProposalCandidate {
  const value = clone(candidate);
  value.stale.reason_codes = [...reasons];
  value.stale.stale_detected = reasons.length > 0;
  value.stale.validation_passed = !reasons.includes("source_generated_at_invalid");
  value.stale.future_explicit_save_eligible = reasons.length === 0;
  value.preview.stale_reason_codes = [...reasons];
  value.preview.stale_detected = reasons.length > 0;
  return value;
}

export async function runDay125ProposalCandidateScenario() {
  const fresh = create(input());
  assert(fresh);
  assert(parseHermesDailyFarmBriefProposalCandidateInput(input()));
  assert(parseHermesDailyFarmBriefProposalCandidate(fresh));
  assert.equal(fresh.schema_version, "hermes.proposal_candidate.work_log_follow_up.v1");
  assert.equal(fresh.proposal_type, "work_log_follow_up");
  assert.equal(fresh.target.target_kind, "work_log_display_scope");
  assert.equal(fresh.source.suggestion_type, "work_log_attention");
  assert.equal(fresh.risk_level, "low");
  assert.equal(fresh.requires_human_review, true);
  assert.equal(fresh.save_allowed, false);
  assert.equal(fresh.apply_allowed, false);
  assert.equal(fresh.expires_at, "2026-07-18T14:59:59.999Z");
  assert.equal(fresh.expected_source_version, 2);
  assert.deepEqual(fresh.stale, { stale_detected: false, reason_codes: [], validation_passed: true, future_explicit_save_eligible: true });
  assert.equal(fresh.preview.proposal_saved, false);
  assert.equal(fresh.preview.proposal_apply_performed, false);

  const displayStale = create(input({ displayState: "stale" }));
  assert(displayStale);
  assert.deepEqual(displayStale.stale.reason_codes, ["source_display_stale"]);
  assert.equal(displayStale.stale.stale_detected, true);
  assert.equal(displayStale.stale.future_explicit_save_eligible, false);
  assert.equal(displayStale.save_allowed, false);
  assert.equal(displayStale.apply_allowed, false);
  assert.equal(displayStale.preview.proposal_saved, false);
  assert.equal(displayStale.preview.proposal_apply_performed, false);

  const old = create(input({ businessDate: "2026-07-16", generatedAt: "2026-07-16T00:00:00.000Z" }));
  assert(old?.stale.reason_codes.includes("source_business_date_old"));
  const mismatch = create(input({ version: 1 }));
  assert(mismatch?.stale.reason_codes.includes("source_version_mismatch"));
  assert.equal(mismatch?.source_version, 1);
  assert.equal(mismatch?.expected_source_version, 2);
  const expired = create(input(), { now: "2026-07-19T00:00:00.000Z" });
  assert(expired?.stale.reason_codes.includes("candidate_expired"));
  const future = create(input({ generatedAt: "2026-07-17T04:00:00.000Z" }));
  assert(future?.stale.reason_codes.includes("source_generated_at_future"));
  const invalidGeneratedAt = create(input({ generatedAt: "not-a-canonical-timestamp" }));
  assert(invalidGeneratedAt);
  assert.deepEqual(invalidGeneratedAt.stale.reason_codes, ["source_generated_at_invalid"]);
  assert.equal(invalidGeneratedAt.source_generated_at, null);
  assert.equal(invalidGeneratedAt.stale.validation_passed, false);

  const combined = create(input({ businessDate: "2026-07-15", generatedAt: "invalid-time", version: 1, displayState: "stale" }), { now: "2026-07-18T15:00:00.000Z" });
  assert.deepEqual(combined?.stale.reason_codes, ["source_display_stale", "source_business_date_old", "source_version_mismatch", "candidate_expired", "source_generated_at_invalid"]);

  assert(old && mismatch && expired && future && combined);
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(replaceStaleReasons(old, old.stale.reason_codes.filter((reason) => reason !== "source_business_date_old"))), null);
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(replaceStaleReasons(mismatch, mismatch.stale.reason_codes.filter((reason) => reason !== "source_version_mismatch"))), null);
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(replaceStaleReasons(expired, expired.stale.reason_codes.filter((reason) => reason !== "candidate_expired"))), null);
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(replaceStaleReasons(future, future.stale.reason_codes.filter((reason) => reason !== "source_generated_at_future"))), null);
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(replaceStaleReasons(fresh, ["source_display_stale"])), null);
  const eligibilityTamper = clone(displayStale); eligibilityTamper.stale.future_explicit_save_eligible = true;
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(eligibilityTamper), null);
  const expectedVersionTamper = clone(fresh); expectedVersionTamper.expected_source_version = 1;
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(expectedVersionTamper), null);
  assert(parseHermesDailyFarmBriefProposalCandidate(combined), "parser must accept the complete recomputed stale reason set in canonical order");

  assert.equal(parseHermesDailyFarmBriefProposalCandidateInput({ ...input(), proposal_type: "unknown_proposal" }), null);
  assert.equal(create({ ...input(), proposal_type: "unknown_proposal" }), null);
  assert.equal(parseHermesDailyFarmBriefProposalCandidateInput({ ...input(), unknown: true }), null);
  const missingInput = clone(input()) as unknown as Record<string, unknown>; delete missingInput.attention;
  assert.equal(parseHermesDailyFarmBriefProposalCandidateInput(missingInput), null);
  assert.equal(create(input({ businessDate: "2026-02-30" })), null);

  const unknownOutput = { ...fresh, unknown: true };
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(unknownOutput), null);
  const missingOutput = clone(fresh) as unknown as Record<string, unknown>; delete missingOutput.before;
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(missingOutput), null);
  const invalidRisk = clone(fresh) as unknown as { risk_level: string }; invalidRisk.risk_level = "medium";
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(invalidRisk), null);
  const noReview = clone(fresh) as unknown as { requires_human_review: boolean }; noReview.requires_human_review = false;
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(noReview), null);
  const invalidCreatedAt = clone(fresh) as unknown as { created_at: string }; invalidCreatedAt.created_at = "2026-07-17T03:00:00Z";
  assert.equal(parseHermesDailyFarmBriefProposalCandidate(invalidCreatedAt), null);

  assert.equal(create({ ...input(), role: "administrator" }), null);
  assert.equal(create({ ...input(), scope: "browser-supplied" }), null);
  assert.equal(create({ ...input(), attention: { ...input().attention, field_id: "raw-field-reference" } }), null);
  assert.equal(create(input({ fieldLabel: "550e8400-e29b-41d4-a716-446655440000" })), null);

  const repeated = create(input());
  assert(repeated);
  assert.equal(repeated.duplicate_signature, fresh.duplicate_signature);
  assert.equal(repeated.candidate_id, fresh.candidate_id);
  const baseParts = signatureParts(fresh);
  const signature = (parts: HermesDailyFarmBriefProposalCandidateSignatureInput) => createHermesDailyFarmBriefProposalCandidateDuplicateSignature(parts);
  assert.notEqual(signature({ ...baseParts, proposal_type: "different_proposal_type" }), fresh.duplicate_signature);
  const differentTarget = create(input({ fieldLabel: null }));
  assert(differentTarget);
  assert.notEqual(differentTarget.duplicate_signature, fresh.duplicate_signature);
  const sameDisplayScope = create(input({ reasonCode: "work_log_started_at_invalid" }));
  assert(sameDisplayScope);
  assert.equal(sameDisplayScope.target.safe_scope, fresh.target.safe_scope, "same browser-safe field/work-type display scope must aggregate intentionally");
  const differentDisplayScope = create(input({ fieldLabel: "南側圃場" }));
  assert(differentDisplayScope);
  assert.notEqual(differentDisplayScope.target.safe_scope, fresh.target.safe_scope);
  assert.equal(Object.hasOwn(fresh.target, "record_id"), false);
  assert.equal(Object.hasOwn(fresh.target, "work_log_id"), false);
  assert.equal(Object.hasOwn(fresh.target, "source_record_reference"), false);
  assert.notEqual(signature({ ...baseParts, basis: `${baseParts.basis}確認` }), fresh.duplicate_signature);
  assert.notEqual(signature({ ...baseParts, source_business_date: "2026-07-16" }), fresh.duplicate_signature);
  assert.notEqual(signature({ ...baseParts, source_version: 3 }), fresh.duplicate_signature);
  assert.notEqual(signature({ ...baseParts, after: `${baseParts.after}再確認` }), fresh.duplicate_signature);

  for (const [key, expected] of Object.entries(HERMES_DAILY_FARM_BRIEF_PROPOSAL_CANDIDATE_SAFETY)) assert.equal(fresh.safety[key as keyof typeof fresh.safety], expected);
  assert.equal(fresh.safety.proposal_saved, false);
  assert.equal(fresh.safety.proposal_apply_performed, false);
  assert.equal(fresh.safety.app_database_write_performed, false);
  assert.equal(fresh.safety.core_database_write_performed, false);
  assert.equal(fresh.safety.database_write_performed, false);
  assert.equal(fresh.safety.model_execution_performed, false);
  assert.equal(fresh.safety.retry_performed, false);

  const serialized = JSON.stringify({ fresh, displayStale, invalidGeneratedAt });
  for (const forbidden of ["field_id", "work_log_id", "crop_cycle_id", "record_id", "scope_key", "principal_ref", "allowed_scope_keys", "550e8400-e29b-41d4-a716-446655440000"]) assert(!serialized.includes(forbidden));
  return {
    result: "pass" as const,
    boundary: "hermes_daily_farm_brief_proposal_candidate",
    proposal_type: fresh.proposal_type,
    suggestion_type: fresh.source.suggestion_type,
    fresh_stale_detected: fresh.stale.stale_detected,
    stale_preview_save_allowed: displayStale.preview.proposal_saved,
    stale_reason_order_verified: true,
    deterministic_signature: true,
    raw_identifier_exposed: false,
    database_write_performed: false,
    model_execution_performed: false,
    retry_performed: false,
  };
}

async function main() {
  console.log(JSON.stringify(await runDay125ProposalCandidateScenario()));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
