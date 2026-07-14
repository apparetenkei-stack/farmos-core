import {
  evaluateHermesDailyFarmBriefScheduledTrigger,
  orchestrateHermesDailyFarmBriefGeneration,
  type HermesDailyFarmBriefGenerationRequestFactoryInput,
} from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";
import type { HermesDailyFarmBriefExistingState } from "./brief_runtime/hermes_daily_farm_brief_generation_contract";

const scheduledAt = "2026-07-13T20:10:00.000Z";
const schedule = evaluateHermesDailyFarmBriefScheduledTrigger({
  requestedAt: scheduledAt,
  serverSchedule: { scheduled_local_time: "05:00", allowed_lateness_minutes: 30 },
});

function request(trigger: "scheduled" | "manual", role: "system" | "administrator" | "general_staff" = trigger === "scheduled" ? "system" : "administrator") {
  return {
    triggerType: trigger,
    requestedAt: scheduledAt,
    actorRole: role,
    authorizationVerified: role !== "general_staff",
    serverForceRegenerationAllowed: false,
    requestIdFactory: () => `preview-${trigger}-${role}`,
  } satisfies HermesDailyFarmBriefGenerationRequestFactoryInput;
}

const completed: HermesDailyFarmBriefExistingState = {
  schema_version: "hermes.daily_farm_brief.existing_state.v1",
  business_date: "2026-07-14",
  brief_id: "preview-existing",
  generated_at: "2026-07-13T19:00:00.000Z",
  brief_status: "ready",
  source_freshness: [
    { source_type: "inventory", freshness: "fresh" },
    { source_type: "work_log", freshness: "fresh" },
    { source_type: "field", freshness: "unknown" },
    { source_type: "crop_cycle", freshness: "unknown" },
    { source_type: "hermes_note", freshness: "unknown" },
  ],
  generation_status: "completed",
  generation_request_id: "preview-completed-request",
  generation_retry_count: 0,
};

const inProgress: HermesDailyFarmBriefExistingState = {
  ...completed,
  brief_id: null,
  generated_at: null,
  brief_status: null,
  source_freshness: null,
  generation_status: "in_progress",
};

const previousDay: HermesDailyFarmBriefExistingState = {
  ...completed,
  business_date: "2026-07-13",
  generated_at: "2026-07-13T01:00:00.000Z",
};

function previewCase(name: string, trigger: "scheduled" | "manual", existingState: unknown | null, role?: "system" | "administrator" | "general_staff") {
  const requestCreation = request(trigger, role);
  const decision = orchestrateHermesDailyFarmBriefGeneration({
    requestCreation,
    existingState,
    scheduleEvaluation: trigger === "scheduled" ? schedule : undefined,
  });
  if (decision === null) throw new Error("preview_decision_invalid");
  return {
    case: name,
    schema: decision.schema_version,
    decision: decision.decision,
    reason: decision.reason_code,
    business_date: decision.request.business_date,
    should_execute_generation: decision.should_execute_generation,
    should_reuse_existing: decision.should_reuse_existing,
    should_show_stale: decision.should_show_stale,
    duplicate_prevented: decision.duplicate_prevented,
    safety: decision.safety,
  };
}

console.log(JSON.stringify({
  boundary: "hermes_daily_farm_brief_generation_orchestration_preview",
  fixture_only: true,
  schedule_configuration: "fixture_server_owned",
  production_schedule_status: "not_configured",
  cases: [
    previewCase("first_scheduled_generation", "scheduled", null),
    previewCase("duplicate_completed", "scheduled", completed),
    previewCase("manual_unauthorized", "manual", null, "general_staff"),
    previewCase("in_progress_wait", "scheduled", inProgress),
    previewCase("stale_previous_day_brief", "scheduled", previousDay),
  ],
  raw_records_output: false,
  raw_identifiers_output: false,
  external_connection_performed: false,
}));
