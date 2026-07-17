import {
  parseHermesDailyFarmBriefDisplayProjection,
  parseHermesDailyFarmBriefDisplayProjectionV2,
  type HermesDailyFarmBriefDisplayProjection,
  type HermesDailyFarmBriefDisplayProjectionV2,
} from "./hermes_daily_farm_brief_display_projection_contract";
import { isCanonicalIso } from "./hermes_daily_farm_brief_generation_contract";

export const HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_PATH = "/api/hermes/daily-farm-brief/latest-display" as const;
export const HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY = {
  authentication_required: true,
  authorization_required: true,
  server_owned_role: true,
  server_owned_scope_filter: true,
  persisted_source_read_only: true,
  source_read_maximum_once: true,
  raw_latest_candidate_exposed: false,
  raw_role_projection_exposed: false,
  raw_snapshot_exposed: false,
  raw_scope_index_exposed: false,
  raw_identifier_exposed: false,
  internal_code_exposed: false,
  credential_exposed: false,
  database_write_performed: false,
  proposal_write_performed: false,
  model_execution_performed: false,
  cache_disabled: true,
  fail_closed: true,
} as const;
export const HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY = {
  ...HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY,
  retry_performed: false,
} as const;

export type HermesDailyFarmBriefLatestDisplayState = "current" | "stale" | "generation_in_progress" | "generation_failed" | "unavailable";
export type HermesDailyFarmBriefLatestDisplayApiError = "invalid_request" | "authentication_required" | "access_forbidden" | "latest_display_read_failed" | "method_not_allowed";
export type HermesDailyFarmBriefLatestDisplayReadRequest = { schema_version: "hermes.daily_farm_brief.latest_display_read_request.v1"; method: "GET"; pathname: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_PATH; requested_at: string; query_parameter_count: 0; body_present: false };
export type HermesDailyFarmBriefLatestDisplayApiResponse =
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1"; result: "ok"; display_state: "current" | "stale"; display: HermesDailyFarmBriefDisplayProjection; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY }
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1"; result: "ok"; display_state: "generation_in_progress" | "generation_failed" | "unavailable"; display: null; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY }
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1"; result: "error"; error: HermesDailyFarmBriefLatestDisplayApiError; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY };
export type HermesDailyFarmBriefLatestDisplayApiResponseV2 =
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2"; result: "ok"; display_state: "current" | "stale"; display: HermesDailyFarmBriefDisplayProjectionV2; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY }
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2"; result: "ok"; display_state: "generation_in_progress" | "generation_failed" | "unavailable"; display: null; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY }
  | { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2"; result: "error"; error: HermesDailyFarmBriefLatestDisplayApiError; safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY };

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function safety(value: unknown): boolean { return isRecord(value) && exact(value, Object.keys(HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY)) && Object.entries(HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY).every(([key, expected]) => value[key] === expected); }
function safetyV2(value: unknown): boolean { return isRecord(value) && exact(value, Object.keys(HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY)) && Object.entries(HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY).every(([key, expected]) => value[key] === expected); }

export function createHermesDailyFarmBriefLatestDisplayReadRequest(input: { request: Request; clock: () => string }): HermesDailyFarmBriefLatestDisplayReadRequest | null {
  let url: URL; let requestedAt: string;
  try { url = new URL(input.request.url); requestedAt = input.clock(); } catch { return null; }
  return parseHermesDailyFarmBriefLatestDisplayReadRequest({ schema_version: "hermes.daily_farm_brief.latest_display_read_request.v1", method: input.request.method, pathname: url.pathname, requested_at: requestedAt, query_parameter_count: [...url.searchParams].length, body_present: input.request.body !== null });
}
export function parseHermesDailyFarmBriefLatestDisplayReadRequest(value: unknown): HermesDailyFarmBriefLatestDisplayReadRequest | null {
  if (!isRecord(value) || !exact(value, ["schema_version", "method", "pathname", "requested_at", "query_parameter_count", "body_present"]) || value.schema_version !== "hermes.daily_farm_brief.latest_display_read_request.v1" || value.method !== "GET" || value.pathname !== HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_PATH || !isCanonicalIso(value.requested_at) || value.query_parameter_count !== 0 || value.body_present !== false) return null;
  return value as HermesDailyFarmBriefLatestDisplayReadRequest;
}

export function createHermesDailyFarmBriefLatestDisplayApiResponse(input:
  | { result: "ok"; displayState: HermesDailyFarmBriefLatestDisplayState; display: HermesDailyFarmBriefDisplayProjection | null }
  | { result: "error"; error: HermesDailyFarmBriefLatestDisplayApiError }
): HermesDailyFarmBriefLatestDisplayApiResponse | null {
  const value = input.result === "error"
    ? { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1", result: "error", error: input.error, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY }
    : { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1", result: "ok", display_state: input.displayState, display: input.display, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY };
  return parseHermesDailyFarmBriefLatestDisplayApiResponse(value);
}

export function parseHermesDailyFarmBriefLatestDisplayApiResponse(value: unknown): HermesDailyFarmBriefLatestDisplayApiResponse | null {
  try {
    const response = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(response) || response.schema_version !== "hermes.daily_farm_brief.latest_display_api_response.v1" || !["ok", "error"].includes(String(response.result)) || !safety(response.safety)) return null;
    if (response.result === "error") {
      if (!exact(response, ["schema_version", "result", "error", "safety"]) || !["invalid_request", "authentication_required", "access_forbidden", "latest_display_read_failed", "method_not_allowed"].includes(String(response.error))) return null;
      return response as HermesDailyFarmBriefLatestDisplayApiResponse;
    }
    if (!exact(response, ["schema_version", "result", "display_state", "display", "safety"]) || !["current", "stale", "generation_in_progress", "generation_failed", "unavailable"].includes(String(response.display_state))) return null;
    if (response.display_state === "current" || response.display_state === "stale") {
      const display = parseHermesDailyFarmBriefDisplayProjection(response.display);
      if (display === null || display.display_state !== response.display_state) return null;
      return { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v1", result: "ok", display_state: response.display_state, display, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY };
    }
    if (response.display !== null) return null;
    return response as HermesDailyFarmBriefLatestDisplayApiResponse;
  } catch { return null; }
}

export function createHermesDailyFarmBriefLatestDisplayApiResponseV2(input:
  | { result: "ok"; displayState: HermesDailyFarmBriefLatestDisplayState; display: HermesDailyFarmBriefDisplayProjectionV2 | null }
  | { result: "error"; error: HermesDailyFarmBriefLatestDisplayApiError }
): HermesDailyFarmBriefLatestDisplayApiResponseV2 | null {
  const value = input.result === "error"
    ? { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2", result: "error", error: input.error, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY }
    : { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2", result: "ok", display_state: input.displayState, display: input.display, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY };
  return parseHermesDailyFarmBriefLatestDisplayApiResponseV2(value);
}

export function parseHermesDailyFarmBriefLatestDisplayApiResponseV2(value: unknown): HermesDailyFarmBriefLatestDisplayApiResponseV2 | null {
  try {
    const response = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(response) || response.schema_version !== "hermes.daily_farm_brief.latest_display_api_response.v2" || !["ok", "error"].includes(String(response.result)) || !safetyV2(response.safety)) return null;
    if (response.result === "error") {
      if (!exact(response, ["schema_version", "result", "error", "safety"]) || !["invalid_request", "authentication_required", "access_forbidden", "latest_display_read_failed", "method_not_allowed"].includes(String(response.error))) return null;
      return response as HermesDailyFarmBriefLatestDisplayApiResponseV2;
    }
    if (!exact(response, ["schema_version", "result", "display_state", "display", "safety"]) || !["current", "stale", "generation_in_progress", "generation_failed", "unavailable"].includes(String(response.display_state))) return null;
    if (response.display_state === "current" || response.display_state === "stale") {
      const display = parseHermesDailyFarmBriefDisplayProjectionV2(response.display);
      if (display === null || display.display_state !== response.display_state) return null;
      return { schema_version: "hermes.daily_farm_brief.latest_display_api_response.v2", result: "ok", display_state: response.display_state, display, safety: HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_V2_SAFETY };
    }
    if (response.display !== null) return null;
    return response as HermesDailyFarmBriefLatestDisplayApiResponseV2;
  } catch { return null; }
}
