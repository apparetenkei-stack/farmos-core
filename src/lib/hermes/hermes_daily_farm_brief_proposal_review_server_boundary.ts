import type { HermesDailyFarmBriefProposalReviewServiceDependencies } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
  type HermesDailyFarmBriefActorDirectory,
  type HermesDailyFarmBriefServerAuthenticationProvider,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "./hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay127ProposalReviewPostgresReadiness } from "./hermes_daily_farm_brief_proposal_review_postgres_readiness";
import { createHermesDailyFarmBriefPilotIdentityBoundary } from "./hermes_daily_farm_brief_pilot_authentication";

export function createHermesDailyFarmBriefProposalReviewServerDependencies(input:{
  environment:Readonly<Record<string,string|undefined>>;
  authenticationProvider:HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory:HermesDailyFarmBriefActorDirectory;
  clock:()=>string;
}):HermesDailyFarmBriefProposalReviewServiceDependencies{
  return {
    authenticate:(request)=>authenticateHermesDailyFarmBriefServerRequest(input.authenticationProvider,request),
    resolveActorContext:(authentication)=>resolveHermesDailyFarmBriefActorContext(input.actorDirectory,authentication),
    readRepository:async()=>{const readiness=await diagnoseHermesDay127ProposalReviewPostgresReadiness({databaseTarget:input.environment[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV]});return readiness.state==="ready"?readiness.repository:null;},
    clock:input.clock,
  };
}

const identity=createHermesDailyFarmBriefPilotIdentityBoundary(process.env);
export const hermesDailyFarmBriefProposalReviewServerDependencies=createHermesDailyFarmBriefProposalReviewServerDependencies({
  environment:process.env,
  authenticationProvider:identity.authenticationProvider,
  actorDirectory:identity.actorDirectory,
  clock:()=>new Date().toISOString(),
});
