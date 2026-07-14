import {
  deriveHermesDailyFarmBusinessDate,
  HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY,
  isCanonicalIso,
  parseHermesDailyFarmBriefExistingState,
  parseHermesDailyFarmBriefGenerationRequest,
  parseHermesDailyFarmBriefScheduleEvaluation,
  type HermesDailyFarmBriefExistingState,
  type HermesDailyFarmBriefGenerationDecision,
  type HermesDailyFarmBriefGenerationRequest,
  type HermesDailyFarmBriefGenerationRole,
  type HermesDailyFarmBriefGenerationTrigger,
  type HermesDailyFarmBriefScheduleEvaluation,
} from "./hermes_daily_farm_brief_generation_contract";
import {
  HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY,
  HERMES_DAILY_FARM_BRIEF_TIMEZONE,
  type HermesDailyFarmBriefServerSchedule,
} from "./hermes_daily_farm_brief_generation_policy";
import {
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";

export type HermesDailyFarmBriefGenerationRequestFactoryInput = {
  triggerType: HermesDailyFarmBriefGenerationTrigger;
  requestedAt: string;
  actorRole: HermesDailyFarmBriefGenerationRole;
  authorizationVerified: boolean;
  serverForceRegenerationAllowed: boolean;
  requestIdFactory: () => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequestFactoryInput(
  value: unknown,
): value is HermesDailyFarmBriefGenerationRequestFactoryInput {
  if (!isRecord(value)) return false;
  const keys = [
    "triggerType",
    "requestedAt",
    "actorRole",
    "authorizationVerified",
    "serverForceRegenerationAllowed",
    "requestIdFactory",
  ];
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)) &&
    ["scheduled", "manual"].includes(String(value.triggerType)) &&
    typeof value.requestedAt === "string" &&
    ["system", "administrator", "general_staff"].includes(String(value.actorRole)) &&
    typeof value.authorizationVerified === "boolean" &&
    typeof value.serverForceRegenerationAllowed === "boolean" &&
    typeof value.requestIdFactory === "function";
}

export function createHermesDailyFarmBriefGenerationRequest(
  input: HermesDailyFarmBriefGenerationRequestFactoryInput | unknown,
): HermesDailyFarmBriefGenerationRequest | null {
  if (!isRequestFactoryInput(input)) return null;
  const businessDate = deriveHermesDailyFarmBusinessDate(input.requestedAt);
  if (businessDate === null) return null;
  let requestId: string;
  try {
    requestId = input.requestIdFactory();
  } catch {
    return null;
  }
  const forceRegeneration =
    input.triggerType === "manual" &&
    input.actorRole === "administrator" &&
    input.authorizationVerified &&
    input.serverForceRegenerationAllowed;
  const request: HermesDailyFarmBriefGenerationRequest = {
    schema_version: "hermes.daily_farm_brief.generation_request.v1",
    trigger_type: input.triggerType,
    requested_at: input.requestedAt,
    timezone: HERMES_DAILY_FARM_BRIEF_TIMEZONE,
    business_date: businessDate,
    request_id: requestId,
    force_regeneration: forceRegeneration,
    requested_by_role: input.actorRole,
    authorization_verified: input.authorizationVerified,
  };
  return parseHermesDailyFarmBriefGenerationRequest(request);
}

function isValidServerSchedule(schedule: HermesDailyFarmBriefServerSchedule): boolean {
  const match = /^(\d{2}):(\d{2})$/u.exec(schedule.scheduled_local_time);
  if (match === null) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 && Number.isInteger(schedule.allowed_lateness_minutes) && schedule.allowed_lateness_minutes > 0 && schedule.allowed_lateness_minutes <= 180;
}

export function evaluateHermesDailyFarmBriefScheduledTrigger(input: {
  requestedAt: string;
  serverSchedule?: HermesDailyFarmBriefServerSchedule;
}): HermesDailyFarmBriefScheduleEvaluation {
  if (!isCanonicalIso(input.requestedAt) || input.serverSchedule === undefined || !isValidServerSchedule(input.serverSchedule)) {
    return {
      schema_version: "hermes.daily_farm_brief.schedule_evaluation.v1",
      configured: false,
      within_schedule_window: false,
      schedule_window_start: null,
      schedule_window_end: null,
      reason_code: "schedule_not_configured",
    };
  }
  const businessDate = deriveHermesDailyFarmBusinessDate(input.requestedAt) as string;
  const start = new Date(`${businessDate}T${input.serverSchedule.scheduled_local_time}:00.000+09:00`);
  const end = new Date(start.getTime() + input.serverSchedule.allowed_lateness_minutes * 60_000);
  const requested = Date.parse(input.requestedAt);
  const within = requested >= start.getTime() && requested < end.getTime();
  return {
    schema_version: "hermes.daily_farm_brief.schedule_evaluation.v1",
    configured: true,
    within_schedule_window: within,
    schedule_window_start: start.toISOString(),
    schedule_window_end: end.toISOString(),
    reason_code: within ? "schedule_within_window" : "schedule_outside_window",
  };
}

type DecisionInput = {
  requestCreation: unknown;
  existingState: unknown | null;
  scheduleEvaluation?: unknown;
};

function stateSummary(state: HermesDailyFarmBriefExistingState | null) {
  return state === null ? null : {
    business_date: state.business_date,
    generation_status: state.generation_status,
    brief_status: state.brief_status,
    has_brief: state.brief_id !== null,
    generation_retry_count: state.generation_retry_count,
  };
}

function calendarAgeDays(older: string, newer: string): number {
  return Math.max(0, Math.floor((Date.parse(`${newer}T00:00:00.000Z`) - Date.parse(`${older}T00:00:00.000Z`)) / 86_400_000));
}

function staleDetails(request: HermesDailyFarmBriefGenerationRequest, state: HermesDailyFarmBriefExistingState | null) {
  const reasonCodes: HermesDailyFarmBriefGenerationDecision["stale_reason_codes"] = [];
  const sourceTypes: HermesDailyFarmSourceType[] = [];
  let ageDays: number | null = null;
  if (state?.generation_status !== "completed") return { reasonCodes, sourceTypes, ageDays };
  if (state.business_date < request.business_date) {
    reasonCodes.push("previous_business_date");
    ageDays = calendarAgeDays(state.business_date, request.business_date);
  }
  for (const source of state.source_freshness ?? []) {
    if (["inventory", "work_log"].includes(source.source_type) && source.freshness !== "fresh") sourceTypes.push(source.source_type);
  }
  if (sourceTypes.length > 0) reasonCodes.push("required_source_stale");
  if (state.generated_at !== null && Date.parse(request.requested_at) - Date.parse(state.generated_at) >= HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.generated_brief_stale_after_ms) reasonCodes.push("generated_at_stale");
  return { reasonCodes, sourceTypes: HERMES_DAILY_FARM_SOURCE_ORDER.filter((type) => sourceTypes.includes(type)), ageDays };
}

function buildDecision(input: {
  request: HermesDailyFarmBriefGenerationRequest;
  state: HermesDailyFarmBriefExistingState | null;
  schedule: HermesDailyFarmBriefScheduleEvaluation | null;
  decision: HermesDailyFarmBriefGenerationDecision["decision"];
  reason: HermesDailyFarmBriefGenerationDecision["reason_code"];
  duplicatePrevented?: boolean;
}): HermesDailyFarmBriefGenerationDecision {
  const stale = staleDetails(input.request, input.state);
  return {
    schema_version: "hermes.daily_farm_brief.generation_decision.v1",
    decision: input.decision,
    reason_code: input.reason,
    request: input.request,
    existing_state_summary: stateSummary(input.state),
    schedule: input.schedule,
    should_execute_generation: input.decision === "generate",
    should_reuse_existing: input.decision === "reuse_existing",
    should_show_stale: stale.reasonCodes.length > 0,
    duplicate_prevented: input.duplicatePrevented ?? false,
    stale_reason_codes: stale.reasonCodes,
    stale_reason_count: stale.reasonCodes.length,
    stale_age_days: stale.ageDays,
    stale_source_types: stale.sourceTypes,
    safety: HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY,
  };
}

export function orchestrateHermesDailyFarmBriefGeneration(
  input: DecisionInput,
): HermesDailyFarmBriefGenerationDecision | null {
  const request = createHermesDailyFarmBriefGenerationRequest(input.requestCreation);
  if (request === null) return null;
  const schedule = request.trigger_type === "scheduled"
    ? parseHermesDailyFarmBriefScheduleEvaluation(input.scheduleEvaluation)
    : null;
  if (request.trigger_type === "scheduled") {
    if (schedule === null || !schedule.configured) return buildDecision({ request, state: null, schedule: schedule ?? evaluateHermesDailyFarmBriefScheduledTrigger({ requestedAt: request.requested_at }), decision: "fail_closed", reason: "schedule_not_configured" });
    if (!schedule.within_schedule_window || Date.parse(request.requested_at) < Date.parse(schedule.schedule_window_start as string) || Date.parse(request.requested_at) >= Date.parse(schedule.schedule_window_end as string)) return buildDecision({ request, state: null, schedule, decision: "fail_closed", reason: "schedule_outside_window" });
  }
  if (request.trigger_type === "manual" && (request.requested_by_role !== "administrator" || !request.authorization_verified)) {
    return buildDecision({ request, state: null, schedule: null, decision: "reject_unauthorized", reason: "manual_regeneration_not_authorized" });
  }
  if (request.trigger_type === "scheduled" && (request.requested_by_role !== "system" || !request.authorization_verified)) {
    return buildDecision({ request, state: null, schedule, decision: "reject_unauthorized", reason: "scheduled_generation_not_authorized" });
  }
  const state = input.existingState === null ? null : parseHermesDailyFarmBriefExistingState(input.existingState);
  if (input.existingState !== null && state === null) return buildDecision({ request, state: null, schedule, decision: "reject_invalid_state", reason: "existing_state_invalid" });
  if (state?.generated_at !== null && state !== null && Date.parse(state.generated_at) > Date.parse(request.requested_at)) return buildDecision({ request, state, schedule, decision: "reject_invalid_state", reason: "existing_state_invalid" });
  if (state !== null && state.business_date > request.business_date) return buildDecision({ request, state, schedule, decision: "reject_invalid_state", reason: "business_date_mismatch" });
  const sameDay = state?.business_date === request.business_date;
  if (sameDay && state?.generation_status === "in_progress") return buildDecision({ request, state, schedule, decision: "wait_in_progress", reason: "same_day_generation_in_progress", duplicatePrevented: true });
  if (sameDay && state?.generation_status === "completed") {
    if (request.trigger_type === "manual" && request.force_regeneration) return buildDecision({ request, state, schedule, decision: "generate", reason: "manual_force_regeneration_allowed", duplicatePrevented: true });
    const stale = staleDetails(request, state).reasonCodes.length > 0;
    return buildDecision({ request, state, schedule, decision: request.trigger_type === "scheduled" ? "reuse_existing" : "reject_duplicate", reason: stale ? "existing_brief_stale" : "same_day_completed_exists", duplicatePrevented: true });
  }
  if (sameDay && state?.generation_status === "failed") {
    if (request.trigger_type === "scheduled" && state.generation_retry_count >= HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.maximum_scheduled_retry_count) return buildDecision({ request, state, schedule, decision: "fail_closed", reason: "scheduled_retry_limit_reached", duplicatePrevented: true });
    return buildDecision({ request, state, schedule, decision: "generate", reason: "previous_generation_failed", duplicatePrevented: true });
  }
  return buildDecision({ request, state, schedule, decision: "generate", reason: request.trigger_type === "scheduled" ? "scheduled_first_generation" : "manual_first_generation" });
}
