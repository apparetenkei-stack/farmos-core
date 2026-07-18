import type { HermesDailyFarmBriefProposalReviewDecisionServiceDependencies } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
  type HermesDailyFarmBriefActorDirectory,
  type HermesDailyFarmBriefServerAuthenticationProvider,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "./hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay127ProposalReviewPostgresReadiness } from "./hermes_daily_farm_brief_proposal_review_postgres_readiness";
import { createHermesDailyFarmBriefPilotIdentityBoundary } from "./hermes_daily_farm_brief_pilot_authentication";
import { diagnoseHermesDay128ReviewPostgresReadiness } from "./hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";
import { createHermesDay128DockerReviewTransactionExecutor } from "./hermes_daily_farm_brief_proposal_review_decision_postgres_executor";
import { HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import type { DailyFarmBriefProposalReviewDecisionRepository } from "./hermes_daily_farm_brief_proposal_review_decision_boundary";
import type { HermesDay128ReviewPostgresTransactionExecutor } from "./hermes_daily_farm_brief_proposal_review_decision_postgres_repository";
import {
  createHermesDailyFarmBriefProposalProductionReviewAdapter,
  type HermesDailyFarmBriefProductionReviewAdapterResult,
} from "./hermes_daily_farm_brief_proposal_review_production_adapter";

export const HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED_ENV = "HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED" as const;

type ReviewReadinessResolver = (input:{
  databaseTarget:unknown;
  transactionExecutorFactory:(databaseTarget:typeof HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE)=>HermesDay128ReviewPostgresTransactionExecutor|null;
})=>Promise<{state:string;repository:DailyFarmBriefProposalReviewDecisionRepository|null}>;

export async function resolveHermesDay128LocalReviewRepository(input:{
  environment:Readonly<Record<string,string|undefined>>;
  diagnoseReadiness?:ReviewReadinessResolver;
  transactionExecutorFactory?:(databaseTarget:typeof HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE)=>HermesDay128ReviewPostgresTransactionExecutor|null;
}):Promise<DailyFarmBriefProposalReviewDecisionRepository|null>{
  if(input.environment[HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED_ENV]!=="true")return null;
  const databaseTarget=input.environment[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV];
  if(databaseTarget!==HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE)return null;
  const readiness=await (input.diagnoseReadiness??diagnoseHermesDay128ReviewPostgresReadiness)({databaseTarget,transactionExecutorFactory:input.transactionExecutorFactory??createHermesDay128DockerReviewTransactionExecutor});
  return readiness.state==="ready"?readiness.repository:null;
}

export function createHermesDailyFarmBriefProposalReviewServerDependencies(input:{
  environment:Readonly<Record<string,string|undefined>>;
  authenticationProvider:HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory:HermesDailyFarmBriefActorDirectory;
  clock:()=>string;
  productionAdapterFactory?:typeof createHermesDailyFarmBriefProposalProductionReviewAdapter;
  localReviewRepositoryResolver?:typeof resolveHermesDay128LocalReviewRepository;
}):HermesDailyFarmBriefProposalReviewDecisionServiceDependencies{
  let productionAdapter:Promise<HermesDailyFarmBriefProductionReviewAdapterResult>|null=null;
  const resolveProduction=(authorization:Parameters<HermesDailyFarmBriefProposalReviewDecisionServiceDependencies["reviewRepository"]>[0])=>{
    productionAdapter??=(input.productionAdapterFactory??createHermesDailyFarmBriefProposalProductionReviewAdapter)({
      environment:input.environment,
      authentication:authorization.authentication,
      actor:authorization.actor,
    });
    return productionAdapter;
  };
  return {
    authenticate:(request)=>authenticateHermesDailyFarmBriefServerRequest(input.authenticationProvider,request),
    resolveActorContext:(authentication)=>resolveHermesDailyFarmBriefActorContext(input.actorDirectory,authentication),
    readRepository:async(authorization)=>{
      if(input.environment[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV]===HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE){
        const readiness=await diagnoseHermesDay127ProposalReviewPostgresReadiness({databaseTarget:input.environment[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV]});
        return readiness.state==="ready"?readiness.repository:null;
      }
      return (await resolveProduction(authorization)).readRepository;
    },
    reviewRepository:async(authorization)=>{
      if(input.environment[HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED_ENV]==="true"){
        return (input.localReviewRepositoryResolver??resolveHermesDay128LocalReviewRepository)({environment:input.environment});
      }
      if(input.environment[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV]===HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE){
        return null;
      }
      return (await resolveProduction(authorization)).reviewRepository;
    },
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
