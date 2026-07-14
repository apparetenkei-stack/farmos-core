import assert from "node:assert/strict";
import {
  deriveHermesDailyFarmBusinessDate,
  HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY,
  parseHermesDailyFarmBriefExistingState,
  parseHermesDailyFarmBriefGenerationDecision,
  parseHermesDailyFarmBriefGenerationRequest,
  type HermesDailyFarmBriefExistingState,
  type HermesDailyFarmBriefGenerationRequest,
} from "./brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  createHermesDailyFarmBriefGenerationRequest,
  evaluateHermesDailyFarmBriefScheduledTrigger,
  orchestrateHermesDailyFarmBriefGeneration,
  type HermesDailyFarmBriefGenerationRequestFactoryInput,
} from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";
import { HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY } from "./brief_runtime/hermes_daily_farm_brief_generation_policy";

const scheduledAt = "2026-07-13T20:10:00.000Z";
const manualAt = "2026-07-14T01:00:00.000Z";
const scheduleFixture = { scheduled_local_time: "05:00", allowed_lateness_minutes: 30 } as const;

type RequestOptions = {
  trigger?: "scheduled" | "manual";
  at?: string;
  role?: "system" | "administrator" | "general_staff";
  authorized?: boolean;
  force?: boolean;
  id?: string;
};

function requestCreation(input: RequestOptions = {}): HermesDailyFarmBriefGenerationRequestFactoryInput {
  const trigger = input.trigger ?? "scheduled";
  return {
    triggerType: trigger,
    requestedAt: input.at ?? (trigger === "scheduled" ? scheduledAt : manualAt),
    actorRole: input.role ?? (trigger === "scheduled" ? "system" : "administrator"),
    authorizationVerified: input.authorized ?? true,
    serverForceRegenerationAllowed: input.force ?? false,
    requestIdFactory: () => input.id ?? `request-${trigger}`,
  };
}

function request(input: RequestOptions = {}): HermesDailyFarmBriefGenerationRequest {
  const value = createHermesDailyFarmBriefGenerationRequest(requestCreation(input));
  assert.notEqual(value, null);
  return value as HermesDailyFarmBriefGenerationRequest;
}

function schedule(at = scheduledAt) {
  return evaluateHermesDailyFarmBriefScheduledTrigger({ requestedAt: at, serverSchedule: scheduleFixture });
}

const freshness = (inventory: "fresh" | "stale" | "unknown" = "fresh") => [
  { source_type: "inventory" as const, freshness: inventory },
  { source_type: "work_log" as const, freshness: "fresh" as const },
  { source_type: "field" as const, freshness: "unknown" as const },
  { source_type: "crop_cycle" as const, freshness: "unknown" as const },
  { source_type: "hermes_note" as const, freshness: "unknown" as const },
];

function state(input: Partial<HermesDailyFarmBriefExistingState> = {}): HermesDailyFarmBriefExistingState {
  return {
    schema_version: "hermes.daily_farm_brief.existing_state.v1",
    business_date: "2026-07-14",
    brief_id: "brief-existing",
    generated_at: "2026-07-13T19:00:00.000Z",
    brief_status: "ready",
    source_freshness: freshness(),
    generation_status: "completed",
    generation_request_id: "request-existing",
    generation_retry_count: 0,
    ...input,
  };
}

function decide(input: { requestCreation?: unknown; existing?: unknown | null; scheduleEvaluation?: unknown } = {}) {
  const creation = input.requestCreation ?? requestCreation();
  const scheduledCreation = creation as Partial<HermesDailyFarmBriefGenerationRequestFactoryInput>;
  const result = orchestrateHermesDailyFarmBriefGeneration({
    requestCreation: creation,
    existingState: input.existing ?? null,
    scheduleEvaluation: input.scheduleEvaluation ?? (scheduledCreation.triggerType === "scheduled" && typeof scheduledCreation.requestedAt === "string" ? schedule(scheduledCreation.requestedAt) : undefined),
  });
  assert.notEqual(result, null);
  assert.notEqual(parseHermesDailyFarmBriefGenerationDecision(result), null);
  return result!;
}

assert.equal(HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.timezone, "Asia/Tokyo");
assert.equal(HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.schedule.status, "not_configured");
assert.equal(HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.maximum_scheduled_retry_count, 1);
assert.equal(HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.safety.client_force_override_allowed, false);
assert.equal(HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.safety.scheduler_registration_allowed, false);

assert.equal(deriveHermesDailyFarmBusinessDate("2026-07-14T14:59:59.999Z"), "2026-07-14");
assert.equal(deriveHermesDailyFarmBusinessDate("2026-07-14T15:00:00.000Z"), "2026-07-15");
assert.equal(deriveHermesDailyFarmBusinessDate("not-a-date"), null);

assert.equal(decide().decision, "generate");
assert.equal(decide().reason_code, "scheduled_first_generation");
assert.equal(decide({ requestCreation: requestCreation({ trigger: "manual" }) }).reason_code, "manual_first_generation");

const generalStaff = decide({ requestCreation: requestCreation({ trigger: "manual", role: "general_staff", force: true }) });
assert.equal(generalStaff.decision, "reject_unauthorized");
assert.equal(generalStaff.request.force_regeneration, false);
const unverifiedAdmin = decide({ requestCreation: requestCreation({ trigger: "manual", authorized: false, force: true }) });
assert.equal(unverifiedAdmin.decision, "reject_unauthorized");
assert.equal(unverifiedAdmin.request.force_regeneration, false);

const completedScheduled = decide({ existing: state() });
assert.equal(completedScheduled.decision, "reuse_existing");
assert.equal(completedScheduled.duplicate_prevented, true);
const completedManual = decide({ requestCreation: requestCreation({ trigger: "manual" }), existing: state() });
assert.equal(completedManual.decision, "reject_duplicate");
const forcedManual = decide({ requestCreation: requestCreation({ trigger: "manual", force: true }), existing: state() });
assert.equal(forcedManual.decision, "generate");
assert.equal(forcedManual.reason_code, "manual_force_regeneration_allowed");

const clientForceAttempt = createHermesDailyFarmBriefGenerationRequest({
  ...requestCreation({ trigger: "manual", force: false, id: "server-request" }),
  force_regeneration: true,
});
assert.equal(clientForceAttempt, null);

const rawCanonicalForceAttempt = orchestrateHermesDailyFarmBriefGeneration({
  requestCreation: {
    ...request({ trigger: "manual" }),
    force_regeneration: true,
  },
  existingState: state(),
});
assert.equal(rawCanonicalForceAttempt, null);

const scheduledForceAttempt = decide({ requestCreation: requestCreation({ force: true }), existing: state() });
assert.equal(scheduledForceAttempt.request.force_regeneration, false);
assert.equal(scheduledForceAttempt.decision, "reuse_existing");

const scheduledUnauthorized = decide({ requestCreation: requestCreation({ authorized: false }) });
assert.equal(scheduledUnauthorized.decision, "reject_unauthorized");
assert.equal(scheduledUnauthorized.reason_code, "scheduled_generation_not_authorized");

const inProgress = state({ brief_id: null, generated_at: null, brief_status: null, source_freshness: null, generation_status: "in_progress" });
assert.equal(decide({ existing: inProgress }).decision, "wait_in_progress");
const forcedInProgress = decide({ requestCreation: requestCreation({ trigger: "manual", force: true }), existing: inProgress });
assert.equal(forcedInProgress.decision, "wait_in_progress");
assert.equal(forcedInProgress.reason_code, "same_day_generation_in_progress");
const failed = state({ brief_id: null, generated_at: null, brief_status: null, source_freshness: null, generation_status: "failed", generation_retry_count: 0 });
assert.equal(decide({ existing: failed }).reason_code, "previous_generation_failed");
assert.equal(decide({ requestCreation: requestCreation({ trigger: "manual" }), existing: failed }).decision, "generate");
assert.equal(decide({ existing: { ...failed, generation_retry_count: 1 } }).reason_code, "scheduled_retry_limit_reached");

const previousDay = decide({ existing: state({ business_date: "2026-07-13", generated_at: "2026-07-13T01:00:00.000Z" }) });
assert.equal(previousDay.decision, "generate");
assert.equal(previousDay.should_show_stale, true);
assert.ok(previousDay.stale_reason_codes.includes("previous_business_date"));
assert.equal(previousDay.stale_age_days, 1);
const staleSource = decide({ existing: state({ source_freshness: freshness("stale") }) });
assert.equal(staleSource.should_show_stale, true);
assert.deepEqual(staleSource.stale_source_types, ["inventory"]);

assert.equal(parseHermesDailyFarmBriefExistingState({ ...state(), generated_at: null }), null);
assert.equal(decide({ existing: state({ generated_at: "2026-07-14T02:00:00.000Z" }) }).reason_code, "existing_state_invalid");
assert.equal(decide({ existing: { ...state(), extra: true } }).decision, "reject_invalid_state");
assert.equal(decide({ existing: state({ business_date: "2026-07-15" }) }).reason_code, "business_date_mismatch");

const missingSchedule = decide({ scheduleEvaluation: evaluateHermesDailyFarmBriefScheduledTrigger({ requestedAt: scheduledAt }) });
assert.equal(missingSchedule.decision, "fail_closed");
assert.equal(missingSchedule.reason_code, "schedule_not_configured");
const outsideAt = "2026-07-13T21:00:00.000Z";
const outside = decide({ requestCreation: requestCreation({ at: outsideAt }), scheduleEvaluation: schedule(outsideAt) });
assert.equal(outside.reason_code, "schedule_outside_window");

const deterministicRequestCreation = requestCreation({ id: "request-deterministic" });
assert.deepEqual(
  decide({ requestCreation: deterministicRequestCreation }),
  decide({ requestCreation: deterministicRequestCreation }),
);
assert.equal(createHermesDailyFarmBriefGenerationRequest({
  triggerType: "scheduled",
  requestedAt: scheduledAt,
  actorRole: "system",
  authorizationVerified: true,
  serverForceRegenerationAllowed: false,
  requestIdFactory: () => "",
}), null);

assert.equal(parseHermesDailyFarmBriefGenerationRequest({ ...request(), unknown: true }), null);
assert.equal(parseHermesDailyFarmBriefExistingState({ ...state(), unknown: true }), null);
const validDecision = decide();
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...validDecision, unknown: true }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...validDecision, stale_reason_count: 1 }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...validDecision, safety: { ...HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY, database_write_performed: true } }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...validDecision, decision: "reuse_existing" }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...completedScheduled, duplicate_prevented: false }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...previousDay, stale_reason_codes: ["generated_at_stale", "previous_business_date"] }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...staleSource, stale_source_types: ["field"] }), null);
assert.equal(parseHermesDailyFarmBriefGenerationDecision({ ...completedScheduled, existing_state_summary: { ...completedScheduled.existing_state_summary!, has_brief: false } }), null);

const sourceText = [
  HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY,
  HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY,
];
assert.equal(sourceText.some((value) => JSON.stringify(value).includes("secret_exposed\":true")), false);
assert.equal(validDecision.safety.database_write_performed, false);
assert.equal(validDecision.safety.queue_operation_performed, false);
assert.equal(validDecision.safety.worker_claim_performed, false);
assert.equal(validDecision.safety.model_execution_performed, false);
assert.equal(validDecision.safety.scheduler_registration_performed, false);
assert.equal(validDecision.safety.external_fetch_performed, false);

console.log(JSON.stringify({
  result: "pass",
  boundary: "hermes_daily_farm_brief_generation_orchestration",
  business_date_boundary: true,
  duplicate_prevention: true,
  stale_semantics: true,
  deterministic: true,
  external_connection_performed: false,
}));
