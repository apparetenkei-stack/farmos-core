import { createHermesDailyFarmBriefDisplayProjectionV2 } from "./hermes_daily_farm_brief_display_projection_boundary";
import type { HermesDailyFarmBriefDisplayProjectionV2 } from "./hermes_daily_farm_brief_display_projection_contract";
import { deriveHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
  parseHermesDailyFarmBriefLatestReadSource,
  type HermesDailyFarmBriefAuthenticationResult,
} from "./hermes_daily_farm_brief_latest_api_contract";
import {
  createHermesDailyFarmBriefLatestDisplayApiResponseV2,
  createHermesDailyFarmBriefLatestDisplayReadRequest,
  type HermesDailyFarmBriefLatestDisplayApiError,
  type HermesDailyFarmBriefLatestDisplayState,
} from "./hermes_daily_farm_brief_latest_display_api_contract";
import { createHermesDailyFarmBriefRoleAwareLatestArtifacts } from "./hermes_daily_farm_brief_latest_read_boundary";
import {
  appendFarmOsCoreObservedIdentityHeaders,
  type FarmOsCoreEnvironmentIdentityDecision,
  type FarmOsCoreEnvironmentIdentityRuntime,
} from "../../../src/lib/hermes/farm_os_core_environment_identity_runtime";

export type HermesDailyFarmBriefLatestDisplayDependencies = {
  authenticate: (request: Request) => Promise<unknown>;
  resolveActorContext: (authentication: Extract<HermesDailyFarmBriefAuthenticationResult, { status: "authenticated" }>) => Promise<unknown>;
  readLatestSource: () => Promise<unknown>;
  clock: () => string;
  environment_identity?: FarmOsCoreEnvironmentIdentityRuntime;
};

const RESPONSE_HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" } as const;
function response(error: HermesDailyFarmBriefLatestDisplayApiError, status: 400 | 401 | 403 | 405 | 500): Response {
  const headers = new Headers(RESPONSE_HEADERS); if (status === 405) headers.set("Allow", "GET");
  const body = createHermesDailyFarmBriefLatestDisplayApiResponseV2({ result: "error", error });
  return new Response(JSON.stringify(body), { status, headers });
}
function success(displayState: HermesDailyFarmBriefLatestDisplayState, display: HermesDailyFarmBriefDisplayProjectionV2 | null, identityDecision?: FarmOsCoreEnvironmentIdentityDecision): Response {
  const body = displayState === "current" || displayState === "stale"
    ? display === null ? null : createHermesDailyFarmBriefLatestDisplayApiResponseV2({ result: "ok", displayState, display })
    : createHermesDailyFarmBriefLatestDisplayApiResponseV2({ result: "ok", displayState, display: null });
  if (body === null) return response("latest_display_read_failed", 500);
  const successfulResponse = new Response(JSON.stringify(body), { status: 200, headers: RESPONSE_HEADERS });
  return identityDecision === undefined
    ? successfulResponse
    : appendFarmOsCoreObservedIdentityHeaders(successfulResponse, identityDecision);
}

export async function serveHermesDailyFarmBriefLatestDisplay(input: { request: Request; dependencies: HermesDailyFarmBriefLatestDisplayDependencies }): Promise<Response> {
  if (input.request.method !== "GET") return response("method_not_allowed", 405);
  const request = createHermesDailyFarmBriefLatestDisplayReadRequest({ request: input.request, clock: input.dependencies.clock });
  if (request === null) return response("invalid_request", 400);
  let authentication: ReturnType<typeof parseHermesDailyFarmBriefAuthenticationResult>;
  try { authentication = parseHermesDailyFarmBriefAuthenticationResult(await input.dependencies.authenticate(input.request)); } catch { authentication = null; }
  if (authentication === null || authentication.status === "unauthenticated") return response("authentication_required", 401);
  const identityDecision = input.dependencies.environment_identity?.verifyRequest({ request: input.request, transport_authority: "authenticated_server_transport" });
  if (identityDecision?.decision === "STARTUP_BLOCK") return response("latest_display_read_failed", 500);
  if (identityDecision?.decision === "DENY") return response("access_forbidden", 403);
  let actor: ReturnType<typeof parseHermesDailyFarmBriefAuthenticatedActorContext>;
  try { actor = parseHermesDailyFarmBriefAuthenticatedActorContext(await input.dependencies.resolveActorContext(authentication)); } catch { actor = null; }
  if (actor === null || actor.principal_ref !== authentication.principal_ref) return response("access_forbidden", 403);
  if (identityDecision?.decision === "ALLOW" && input.dependencies.environment_identity?.verifyBoundUse({ use: "database", ...identityDecision.verified_scope }).decision !== "ALLOW") return response("access_forbidden", 403);
  let source: ReturnType<typeof parseHermesDailyFarmBriefLatestReadSource>;
  try { source = parseHermesDailyFarmBriefLatestReadSource(await input.dependencies.readLatestSource()); } catch { source = null; }
  if (source === null) return response("latest_display_read_failed", 500);
  const requestedBusinessDate = deriveHermesDailyFarmBusinessDate(request.requested_at);
  if (requestedBusinessDate === null) return response("latest_display_read_failed", 500);
  if (source.source_kind === "generation_state") {
    const displayState = source.generation_state === "in_progress" ? "generation_in_progress" : source.generation_state === "failed" ? "generation_failed" : "unavailable";
    return success(displayState, null, identityDecision);
  }
  const artifacts = createHermesDailyFarmBriefRoleAwareLatestArtifacts({ businessDate: source.business_date, requestedBusinessDate, scopeIndex: source.scope_index, snapshot: source.snapshot, role: actor.role, allowedScopeKeys: actor.allowed_scope_keys });
  if (artifacts === null) return response("latest_display_read_failed", 500);
  const display = createHermesDailyFarmBriefDisplayProjectionV2({ latestCandidate: artifacts.latest_candidate, roleProjection: artifacts.role_projection, snapshot: source.snapshot });
  if (display === null) return response("latest_display_read_failed", 500);
  return success(display.display_state, display, identityDecision);
}
