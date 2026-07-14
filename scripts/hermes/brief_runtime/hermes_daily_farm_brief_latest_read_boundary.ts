import {
  parseHermesDailyFarmBriefExecutionResult,
  parseHermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefExecutionResult,
  type HermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefLatestSourceStatus,
} from "./hermes_daily_farm_brief_execution_contract";
import {
  deriveHermesDailyFarmBusinessDate,
  isCanonicalIso,
  parseHermesDailyFarmBriefExistingState,
  type HermesDailyFarmBriefExistingState,
} from "./hermes_daily_farm_brief_generation_contract";
import { HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY } from "./hermes_daily_farm_brief_generation_policy";
import { HERMES_DAILY_FARM_SOURCE_ORDER } from "./hermes_daily_farm_brief_policy";
import type { HermesDailyFarmBriefRole } from "./hermes_daily_farm_brief_scope_contract";

function emptyCandidate(input: {
  businessDate: string;
  role: HermesDailyFarmBriefRole;
  displayState: "unavailable" | "generation_in_progress" | "generation_failed";
  limitations: string[];
}): HermesDailyFarmBriefLatestCandidate | null {
  return parseHermesDailyFarmBriefLatestCandidate({
    schema_version: "hermes.daily_farm_brief.latest_candidate.v1",
    business_date: input.businessDate,
    generated_at: null,
    brief_status: null,
    role: input.role,
    visible_scope_count: 0,
    source_status: [],
    stale: false,
    stale_reason_codes: [],
    limitations: [...input.limitations].sort(),
    display_state: input.displayState,
  });
}

function existingCandidate(input: {
  state: HermesDailyFarmBriefExistingState;
  requestedBusinessDate: string;
  role: HermesDailyFarmBriefRole;
  now: string;
}): HermesDailyFarmBriefLatestCandidate | null {
  if (input.state.generation_status !== "completed" || input.state.generated_at === null || input.state.brief_status === null || input.state.source_freshness === null || Date.parse(input.state.generated_at) > Date.parse(input.now) || input.state.business_date > input.requestedBusinessDate) return null;
  const reasons: HermesDailyFarmBriefLatestCandidate["stale_reason_codes"] = [];
  if (input.state.business_date < input.requestedBusinessDate) reasons.push("previous_business_date");
  if (input.state.source_freshness.some((source) => (source.source_type === "inventory" || source.source_type === "work_log") && source.freshness !== "fresh")) reasons.push("required_source_stale");
  if (Date.parse(input.now) - Date.parse(input.state.generated_at) >= HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.generated_brief_stale_after_ms) reasons.push("generated_at_stale");
  const statuses: HermesDailyFarmBriefLatestSourceStatus[] = HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType) => ({
    source_type: sourceType,
    status: "unknown",
    freshness: input.state.source_freshness?.find((source) => source.source_type === sourceType)?.freshness ?? "unknown",
    record_count: null,
  }));
  return parseHermesDailyFarmBriefLatestCandidate({
    schema_version: "hermes.daily_farm_brief.latest_candidate.v1",
    business_date: input.state.business_date,
    generated_at: input.state.generated_at,
    brief_status: input.state.brief_status,
    role: input.role,
    visible_scope_count: 0,
    source_status: statuses,
    stale: reasons.length > 0,
    stale_reason_codes: reasons,
    limitations: ["existing_state_summary_only", "scope_projection_unavailable"],
    display_state: reasons.length > 0 ? "stale" : "current",
  });
}

export function readHermesDailyFarmBriefLatestCandidate(input: {
  executionResult: unknown | null;
  existingState: unknown | null;
  now: string;
  role: HermesDailyFarmBriefRole;
}): HermesDailyFarmBriefLatestCandidate | null {
  if (!isCanonicalIso(input.now) || !["administrator", "general_staff"].includes(input.role)) return null;
  const businessDate = deriveHermesDailyFarmBusinessDate(input.now);
  if (businessDate === null) return null;
  const execution: HermesDailyFarmBriefExecutionResult | null = input.executionResult === null ? null : parseHermesDailyFarmBriefExecutionResult(input.executionResult);
  if (input.executionResult !== null && execution === null) return null;
  if (execution?.status === "completed" && execution.latest_candidate !== null) {
    const candidate = parseHermesDailyFarmBriefLatestCandidate(execution.latest_candidate);
    if (candidate === null || candidate.role !== input.role || candidate.business_date > businessDate || candidate.generated_at === null || Date.parse(candidate.generated_at) > Date.parse(input.now)) return null;
    return candidate;
  }

  const state = input.existingState === null ? null : parseHermesDailyFarmBriefExistingState(input.existingState);
  if (input.existingState !== null && state === null) return null;
  if (state?.generation_status === "completed") return existingCandidate({ state, requestedBusinessDate: businessDate, role: input.role, now: input.now });
  if (state?.generation_status === "in_progress" || execution?.generation_decision.decision === "wait_in_progress") return emptyCandidate({ businessDate, role: input.role, displayState: "generation_in_progress", limitations: ["generation_in_progress"] });
  if (state?.generation_status === "failed" || execution?.status === "failed_closed") return emptyCandidate({ businessDate, role: input.role, displayState: "generation_failed", limitations: ["generation_failed"] });
  return emptyCandidate({ businessDate, role: input.role, displayState: "unavailable", limitations: ["latest_brief_unavailable"] });
}

