import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveHermesDay128LocalReviewRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_server_boundary";
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
console.log("Daily Brief Proposal review decision route boundary tests passed");
