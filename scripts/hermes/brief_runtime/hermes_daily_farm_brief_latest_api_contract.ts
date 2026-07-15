import { isCanonicalIso, isHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefLatestCandidate,
} from "./hermes_daily_farm_brief_execution_contract";
import {
  parseHermesDailyFarmBriefAllowedScopeKeys,
  parseHermesDailyFarmBriefScopeIndex,
  type HermesDailyFarmBriefRole,
  type HermesDailyFarmBriefScopeIndex,
} from "./hermes_daily_farm_brief_scope_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";

export const HERMES_DAILY_FARM_BRIEF_LATEST_PATH =
  "/api/hermes/daily-farm-brief/latest" as const;

export const HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY = {
  database_write_performed: false,
  app_db_write_performed: false,
  core_db_write_performed: false,
  brief_persistence_performed: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  audit_write_performed: false,
  notification_performed: false,
  queue_operation_performed: false,
  worker_claim_performed: false,
  model_execution_performed: false,
  scheduler_registration_performed: false,
  client_role_override_allowed: false,
  client_scope_override_allowed: false,
  raw_identifier_exposed: false,
  raw_record_exposed: false,
  raw_fact_exposed: false,
  secret_exposed: false,
  public_anonymous_access_allowed: false,
  retry_performed: false,
  authentication_enforced: true,
  role_resolution_server_owned: true,
  latest_candidate_parser_enforced: true,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefLatestReadRequest = {
  schema_version: "hermes.daily_farm_brief.latest_read_request.v1";
  method: "GET";
  pathname: typeof HERMES_DAILY_FARM_BRIEF_LATEST_PATH;
  requested_at: string;
  query_parameter_count: 0;
};

export type HermesDailyFarmBriefAuthenticationResult =
  | {
      schema_version: "hermes.daily_farm_brief.authentication_result.v1";
      status: "unauthenticated";
      principal_ref: null;
    }
  | {
      schema_version: "hermes.daily_farm_brief.authentication_result.v1";
      status: "authenticated";
      principal_ref: string;
    };

export type HermesDailyFarmBriefAuthenticatedActorContext = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1";
  principal_ref: string;
  role: HermesDailyFarmBriefRole;
  allowed_scope_keys: string[];
  authorization_verified: true;
};

export type HermesDailyFarmBriefLatestGenerationState = "in_progress" | "failed" | "unavailable";

export type HermesDailyFarmBriefLatestReadSource =
  | {
      schema_version: "hermes.daily_farm_brief.latest_read_source.v1";
      source_kind: "projectable_brief";
      business_date: string;
      scope_index: HermesDailyFarmBriefScopeIndex;
      snapshot: HermesDailyFarmSnapshot;
      generation_state: null;
    }
  | {
      schema_version: "hermes.daily_farm_brief.latest_read_source.v1";
      source_kind: "generation_state";
      business_date: string;
      scope_index: null;
      snapshot: null;
      generation_state: HermesDailyFarmBriefLatestGenerationState;
    };

export type HermesDailyFarmBriefLatestApiError =
  | "invalid_request"
  | "authentication_required"
  | "access_forbidden"
  | "method_not_allowed"
  | "latest_read_failed";

export type HermesDailyFarmBriefLatestApiResponse = {
  schema_version: "hermes.daily_farm_brief.latest_api_response.v1";
  result: "ok" | "error";
  error: HermesDailyFarmBriefLatestApiError | null;
  latest: HermesDailyFarmBriefLatestCandidate | null;
  safety: typeof HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY;
};

type JsonRecord = Record<string, unknown>;
const PRINCIPAL_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function createHermesDailyFarmBriefLatestReadRequest(input: {
  request: Request;
  clock: () => string;
}): HermesDailyFarmBriefLatestReadRequest | null {
  let url: URL;
  let requestedAt: string;
  try {
    url = new URL(input.request.url);
    requestedAt = input.clock();
  } catch {
    return null;
  }
  return parseHermesDailyFarmBriefLatestReadRequest({
    schema_version: "hermes.daily_farm_brief.latest_read_request.v1",
    method: input.request.method,
    pathname: url.pathname,
    requested_at: requestedAt,
    query_parameter_count: [...url.searchParams].length,
  });
}

export function parseHermesDailyFarmBriefLatestReadRequest(
  value: unknown,
): HermesDailyFarmBriefLatestReadRequest | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "method", "pathname", "requested_at", "query_parameter_count"]) ||
    value.schema_version !== "hermes.daily_farm_brief.latest_read_request.v1" ||
    value.method !== "GET" ||
    value.pathname !== HERMES_DAILY_FARM_BRIEF_LATEST_PATH ||
    !isCanonicalIso(value.requested_at) ||
    value.query_parameter_count !== 0
  ) return null;
  return value as HermesDailyFarmBriefLatestReadRequest;
}

export function parseHermesDailyFarmBriefAuthenticationResult(
  value: unknown,
): HermesDailyFarmBriefAuthenticationResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "status", "principal_ref"]) ||
    value.schema_version !== "hermes.daily_farm_brief.authentication_result.v1" ||
    !["authenticated", "unauthenticated"].includes(String(value.status))
  ) return null;
  if (value.status === "unauthenticated" && value.principal_ref !== null) return null;
  if (value.status === "authenticated" && (typeof value.principal_ref !== "string" || !PRINCIPAL_REF_PATTERN.test(value.principal_ref))) return null;
  return value as HermesDailyFarmBriefAuthenticationResult;
}

export function parseHermesDailyFarmBriefAuthenticatedActorContext(
  value: unknown,
): HermesDailyFarmBriefAuthenticatedActorContext | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "principal_ref", "role", "allowed_scope_keys", "authorization_verified"]) ||
    value.schema_version !== "hermes.daily_farm_brief.authenticated_actor_context.v1" ||
    typeof value.principal_ref !== "string" ||
    !PRINCIPAL_REF_PATTERN.test(value.principal_ref) ||
    !["administrator", "general_staff"].includes(String(value.role)) ||
    value.authorization_verified !== true
  ) return null;
  const allowedScopeKeys = parseHermesDailyFarmBriefAllowedScopeKeys(value.allowed_scope_keys);
  if (allowedScopeKeys === null || JSON.stringify(allowedScopeKeys) !== JSON.stringify(value.allowed_scope_keys)) return null;
  if (value.role === "administrator" && allowedScopeKeys.length !== 0) return null;
  return { ...(value as HermesDailyFarmBriefAuthenticatedActorContext), allowed_scope_keys: allowedScopeKeys };
}

export function parseHermesDailyFarmBriefLatestReadSource(
  value: unknown,
): HermesDailyFarmBriefLatestReadSource | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "source_kind", "business_date", "scope_index", "snapshot", "generation_state"]) ||
    value.schema_version !== "hermes.daily_farm_brief.latest_read_source.v1" ||
    !["projectable_brief", "generation_state"].includes(String(value.source_kind)) ||
    !isHermesDailyFarmBusinessDate(value.business_date)
  ) return null;
  if (value.source_kind === "generation_state") {
    if (
      value.scope_index !== null ||
      value.snapshot !== null ||
      !["in_progress", "failed", "unavailable"].includes(String(value.generation_state))
    ) return null;
    return {
      schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
      source_kind: "generation_state",
      business_date: value.business_date,
      scope_index: null,
      snapshot: null,
      generation_state: value.generation_state as HermesDailyFarmBriefLatestGenerationState,
    };
  }
  if (value.generation_state !== null) return null;
  const scopeIndex = parseHermesDailyFarmBriefScopeIndex(value.scope_index);
  const snapshot = parseHermesDailyFarmSnapshot(value.snapshot);
  if (
    scopeIndex === null ||
    snapshot === null ||
    scopeIndex.generated_at !== snapshot.generated_at ||
    scopeIndex.brief_status !== snapshot.status
  ) return null;
  return {
    schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
    source_kind: "projectable_brief",
    business_date: value.business_date,
    scope_index: scopeIndex,
    snapshot,
    generation_state: null,
  };
}

export function createHermesDailyFarmBriefLatestApiResponse(input:
  | { result: "ok"; latest: HermesDailyFarmBriefLatestCandidate }
  | { result: "error"; error: HermesDailyFarmBriefLatestApiError }
): HermesDailyFarmBriefLatestApiResponse {
  return {
    schema_version: "hermes.daily_farm_brief.latest_api_response.v1",
    result: input.result,
    error: input.result === "ok" ? null : input.error,
    latest: input.result === "ok" ? input.latest : null,
    safety: HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY,
  };
}

export function parseHermesDailyFarmBriefLatestApiResponse(
  value: unknown,
): HermesDailyFarmBriefLatestApiResponse | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "result", "error", "latest", "safety"]) ||
    value.schema_version !== "hermes.daily_farm_brief.latest_api_response.v1" ||
    !["ok", "error"].includes(String(value.result)) ||
    !isRecord(value.safety) ||
    !hasExactKeys(value.safety, Object.keys(HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY)) ||
    !Object.entries(HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY).every(([key, expected]) => value.safety[key] === expected)
  ) return null;
  const latest = value.latest === null ? null : parseHermesDailyFarmBriefLatestCandidate(value.latest);
  const errors: HermesDailyFarmBriefLatestApiError[] = ["invalid_request", "authentication_required", "access_forbidden", "method_not_allowed", "latest_read_failed"];
  if (value.result === "ok" ? (value.error !== null || latest === null) : (value.latest !== null || !errors.includes(value.error as HermesDailyFarmBriefLatestApiError))) return null;
  return { ...(value as HermesDailyFarmBriefLatestApiResponse), latest };
}
