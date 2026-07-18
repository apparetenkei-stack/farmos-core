import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHermesDailyFarmBriefProposalReviewServerDependencies,resolveHermesDay128LocalReviewRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_server_boundary";
import type { DailyFarmBriefProposalReviewDecisionRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

const route=await readFile("src/app/api/hermes/daily-farm-brief/proposals/[proposalRef]/review/route.ts","utf8");
assert.match(route,/export const runtime = "nodejs"/u);assert.match(route,/force-dynamic/u);assert.match(route,/export async function POST/u);
assert.doesNotMatch(route,/export async function (?:GET|PUT|PATCH|DELETE)/u);assert.doesNotMatch(route,/postgres|repository|select\s|insert\s|update\s|delete\s/iu);assert.match(route,/serveHermesDailyFarmBriefProposalReviewDecision/u);
const service=await readFile("scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_service.ts","utf8");assert.match(service,/"Cache-Control":"no-store"/u);assert.match(service,/"Content-Type":"application\/json; charset=utf-8"/u);assert.doesNotMatch(service,/raw database principal secret/u);
const repository:DailyFarmBriefProposalReviewDecisionRepository={recordProposalReviewDecision:async()=>({result:"atomic_write_failed"})};
let readinessCalls=0;let executorCalls=0;
const diagnose=async(input:Parameters<NonNullable<Parameters<typeof resolveHermesDay128LocalReviewRepository>[0]["diagnoseReadiness"]>>[0])=>{readinessCalls+=1;input.transactionExecutorFactory("farmos_core_day114_test");return{state:"ready",repository};};
const executorFactory=()=>{executorCalls+=1;return{executeSingleConnectionTransaction:async()=>({ok:false,committed:false})};};
for(const environment of [{},{HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED:"false"},{HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED:"true",HERMES_DAY126_ISOLATED_TEST_DATABASE:"not_isolated"}]){
  assert.equal(await resolveHermesDay128LocalReviewRepository({environment,diagnoseReadiness:diagnose,transactionExecutorFactory:executorFactory}),null);
}
assert.equal(readinessCalls,0);assert.equal(executorCalls,0);
const ready=await resolveHermesDay128LocalReviewRepository({environment:{HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED:"true",HERMES_DAY126_ISOLATED_TEST_DATABASE:"farmos_core_day114_test"},diagnoseReadiness:diagnose,transactionExecutorFactory:executorFactory});
assert.equal(ready,repository);assert.equal(readinessCalls,1);assert.equal(executorCalls,1);

const AUTH={schema_version:"hermes.daily_farm_brief.authentication_result.v1",status:"authenticated",principal_ref:"admin_fixture"} as const;
const ADMIN={schema_version:"hermes.daily_farm_brief.authenticated_actor_context.v1",principal_ref:"admin_fixture",role:"administrator",allowed_scope_keys:[],authorization_verified:true} as const;
const provider={authenticateServerRequest:async()=>({schema_version:"hermes.daily_farm_brief.server_authentication_provider.v1",status:"authenticated",principal_ref:"admin_fixture"})};
const directory={resolvePrincipal:async()=>ADMIN};
let productionCalls=0;let localCalls=0;
const productionAdapterFactory=async()=>{productionCalls+=1;return{readiness:{state:"ready",denial_reason:null,production_adapter_selected:true,authentication_available:true,administrator_authorized:true,database_connection_available:true,transaction_available:true,proposal_read_available:true,proposal_five_column_update_available:true,audit_insert_available:true,rollback_verified:true,forbidden_privileges_absent:true,app_database_write_privilege_present:false,database_write_performed:false,production_connection_performed:false,retry_count:0},readRepository:null,reviewRepository:repository,close:async()=>undefined} as const;};
const productionDependencies=createHermesDailyFarmBriefProposalReviewServerDependencies({environment:{},authenticationProvider:provider,actorDirectory:directory,clock:()=>"2026-07-18T04:00:00.000Z",productionAdapterFactory});
assert.equal(await productionDependencies.reviewRepository({authentication:AUTH,actor:ADMIN}),repository);
assert.equal(productionCalls,1);
const localDependencies=createHermesDailyFarmBriefProposalReviewServerDependencies({environment:{HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED:"true",HERMES_DAY126_ISOLATED_TEST_DATABASE:"farmos_core_day114_test"},authenticationProvider:provider,actorDirectory:directory,clock:()=>"2026-07-18T04:00:00.000Z",productionAdapterFactory,localReviewRepositoryResolver:async()=>{localCalls+=1;return repository;}});
assert.equal(await localDependencies.reviewRepository({authentication:AUTH,actor:ADMIN}),repository);
assert.equal(localCalls,1);assert.equal(productionCalls,1,"production adapter must not run when explicit local adapter is selected");
const isolatedWithoutLocalFlag=createHermesDailyFarmBriefProposalReviewServerDependencies({environment:{HERMES_DAY126_ISOLATED_TEST_DATABASE:"farmos_core_day114_test"},authenticationProvider:provider,actorDirectory:directory,clock:()=>"2026-07-18T04:00:00.000Z",productionAdapterFactory});
assert.equal(await isolatedWithoutLocalFlag.reviewRepository({authentication:AUTH,actor:ADMIN}),null);
assert.equal(productionCalls,1,"isolated target must never fall through to production adapter");
console.log("Daily Brief Proposal review decision route boundary tests passed");
