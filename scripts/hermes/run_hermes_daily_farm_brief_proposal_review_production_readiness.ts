import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
  type HermesDailyFarmBriefAuthenticatedActorContext,
  type HermesDailyFarmBriefAuthenticationResult,
} from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { createHermesDailyFarmBriefPilotIdentityBoundary } from "../../src/lib/hermes/hermes_daily_farm_brief_pilot_authentication";
import { createHermesDailyFarmBriefProposalProductionReviewAdapter } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_production_adapter";

const FALLBACK_ACTOR: HermesDailyFarmBriefAuthenticatedActorContext = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
  principal_ref: "production-readiness-unavailable",
  role: "general_staff",
  allowed_scope_keys: ["unavailable"],
  authorization_verified: true,
};

const identity = createHermesDailyFarmBriefPilotIdentityBoundary(process.env);
const token = process.env.HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN;
let authentication: HermesDailyFarmBriefAuthenticationResult = {
  schema_version: "hermes.daily_farm_brief.authentication_result.v1",
  status: "unauthenticated",
  principal_ref: null,
};
let actor = FALLBACK_ACTOR;

if (typeof token === "string" && token.length > 0) {
  const request = new Request("https://production-readiness.invalid/", {
    headers: { authorization: `Bearer ${token}` },
  });
  authentication = parseHermesDailyFarmBriefAuthenticationResult(
    await authenticateHermesDailyFarmBriefServerRequest(identity.authenticationProvider, request),
  ) ?? authentication;
  if (authentication.status === "authenticated") {
    actor = parseHermesDailyFarmBriefAuthenticatedActorContext(
      await resolveHermesDailyFarmBriefActorContext(identity.actorDirectory, authentication),
    ) ?? actor;
  }
}

const adapter = await createHermesDailyFarmBriefProposalProductionReviewAdapter({
  environment: process.env,
  authentication,
  actor,
});

console.log(JSON.stringify({
  boundary: "daily_farm_brief_proposal_production_review_readiness",
  ...adapter.readiness,
  repository_available: adapter.reviewRepository !== null,
  credential_exposed: false,
  raw_identifier_exposed: false,
}));

await adapter.close();
