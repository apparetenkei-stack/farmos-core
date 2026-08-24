import { parseHermesDailyFarmBriefLatestCandidate } from "./hermes_daily_farm_brief_execution_contract";
import {
  createHermesDailyFarmBriefLatestApiResponse,
  createHermesDailyFarmBriefLatestReadRequest,
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
  parseHermesDailyFarmBriefLatestReadSource,
  type HermesDailyFarmBriefAuthenticationResult,
  type HermesDailyFarmBriefLatestApiError,
} from "./hermes_daily_farm_brief_latest_api_contract";
import {
  createHermesDailyFarmBriefGenerationStateLatestCandidate,
  createHermesDailyFarmBriefRoleAwareLatestCandidate,
} from "./hermes_daily_farm_brief_latest_read_boundary";
import { deriveHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";
import {
  appendFarmOsCoreObservedIdentityHeaders,
  type FarmOsCoreEnvironmentIdentityRuntime,
} from "../../../src/lib/hermes/farm_os_core_environment_identity_runtime";

export type HermesDailyFarmBriefLatestReadDependencies = {
  authenticate: (request: Request) => Promise<unknown>;
  resolveActorContext: (
    authentication: Extract<HermesDailyFarmBriefAuthenticationResult, { status: "authenticated" }>,
  ) => Promise<unknown>;
  readLatestSource: () => Promise<unknown>;
  clock: () => string;
  environment_identity?: FarmOsCoreEnvironmentIdentityRuntime;
};

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function response(error: HermesDailyFarmBriefLatestApiError, status: 400 | 401 | 403 | 405 | 500): Response {
  const headers = new Headers(RESPONSE_HEADERS);
  if (status === 405) headers.set("Allow", "GET");
  return new Response(JSON.stringify(createHermesDailyFarmBriefLatestApiResponse({ result: "error", error })), { status, headers });
}

export async function serveHermesDailyFarmBriefLatestRead(input: {
  request: Request;
  dependencies: HermesDailyFarmBriefLatestReadDependencies;
}): Promise<Response> {
  if (input.request.method !== "GET") return response("method_not_allowed", 405);
  const request = createHermesDailyFarmBriefLatestReadRequest({ request: input.request, clock: input.dependencies.clock });
  if (request === null) return response("invalid_request", 400);

  let authentication: ReturnType<typeof parseHermesDailyFarmBriefAuthenticationResult>;
  try {
    authentication = parseHermesDailyFarmBriefAuthenticationResult(await input.dependencies.authenticate(input.request));
  } catch {
    authentication = null;
  }
  if (authentication === null || authentication.status === "unauthenticated") return response("authentication_required", 401);

  const identityDecision = input.dependencies.environment_identity?.verifyRequest({
    request: input.request,
    transport_authority: "authenticated_server_transport",
  });
  if (identityDecision?.decision === "STARTUP_BLOCK") {
    return response("latest_read_failed", 500);
  }
  if (identityDecision?.decision === "DENY") {
    return response("access_forbidden", 403);
  }

  let actor: ReturnType<typeof parseHermesDailyFarmBriefAuthenticatedActorContext>;
  try {
    actor = parseHermesDailyFarmBriefAuthenticatedActorContext(await input.dependencies.resolveActorContext(authentication));
  } catch {
    actor = null;
  }
  if (actor === null || actor.principal_ref !== authentication.principal_ref) return response("access_forbidden", 403);

  if (identityDecision?.decision === "ALLOW" &&
    input.dependencies.environment_identity?.verifyBoundUse({
      use: "database",
      ...identityDecision.verified_scope,
    }).decision !== "ALLOW") return response("access_forbidden", 403);

  let source: ReturnType<typeof parseHermesDailyFarmBriefLatestReadSource>;
  try {
    source = parseHermesDailyFarmBriefLatestReadSource(await input.dependencies.readLatestSource());
  } catch {
    source = null;
  }
  if (source === null) return response("latest_read_failed", 500);
  const requestedBusinessDate = deriveHermesDailyFarmBusinessDate(request.requested_at);
  if (requestedBusinessDate === null) return response("latest_read_failed", 500);
  const candidate = source.source_kind === "projectable_brief"
    ? createHermesDailyFarmBriefRoleAwareLatestCandidate({
        businessDate: source.business_date,
        requestedBusinessDate,
        scopeIndex: source.scope_index,
        snapshot: source.snapshot,
        role: actor.role,
        allowedScopeKeys: actor.allowed_scope_keys,
      })
    : createHermesDailyFarmBriefGenerationStateLatestCandidate({
        businessDate: source.business_date,
        role: actor.role,
        generationState: source.generation_state,
      });
  const latest = parseHermesDailyFarmBriefLatestCandidate(candidate);
  if (latest === null || latest.role !== actor.role) return response("latest_read_failed", 500);

  const successfulResponse = new Response(JSON.stringify(createHermesDailyFarmBriefLatestApiResponse({ result: "ok", latest })), {
    status: 200,
    headers: RESPONSE_HEADERS,
  });
  return identityDecision === undefined
    ? successfulResponse
    : appendFarmOsCoreObservedIdentityHeaders(successfulResponse, identityDecision);
}
