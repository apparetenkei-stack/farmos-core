import assert from "node:assert/strict";

import { serveHermesDailyFarmBriefProposalReviewDecision,type HermesDailyFarmBriefProposalReviewDecisionServiceDependencies } from "./brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import { parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse } from "./brief_runtime/hermes_daily_farm_brief_proposal_review_api_contract";
import { createDay127ApiTestRow } from "./test_hermes_daily_farm_brief_proposal_review_service";
import { createHermesDailyFarmBriefProposalSafeReference } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import { HERMES_DAY128_PROTECTED_PROPOSAL_ID } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_repository";
import type { DailyFarmBriefProposalReviewDecisionRepository,ProposalReviewDecisionRepositoryResult } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

const AUTH={schema_version:"hermes.daily_farm_brief.authentication_result.v1",status:"authenticated",principal_ref:"admin_fixture"};
const ADMIN={schema_version:"hermes.daily_farm_brief.authenticated_actor_context.v1",principal_ref:"admin_fixture",role:"administrator",allowed_scope_keys:[],authorization_verified:true};
const STAFF={...ADMIN,role:"general_staff",allowed_scope_keys:["safe_scope"]};
const row=createDay127ApiTestRow();
const ref=createHermesDailyFarmBriefProposalSafeReference(row.source_refs_json.idempotency_key);
const body={decision:"approve",review_note:"確認しました。",expected_status:"pending",expected_updated_at:row.updated_at};
class ReviewRepo implements DailyFarmBriefProposalReviewDecisionRepository{constructor(readonly value:ProposalReviewDecisionRepositoryResult|Error){}async recordProposalReviewDecision(command:Parameters<DailyFarmBriefProposalReviewDecisionRepository["recordProposalReviewDecision"]>[0]){if(this.value instanceof Error)throw this.value;if(this.value.result==="recorded")return{...this.value,nextStatus:command.nextStatus,updatedAt:command.newUpdatedAt};return this.value;}}
const recorded:ProposalReviewDecisionRepositoryResult={result:"recorded",previousStatus:"pending",nextStatus:"approved",updatedAt:"2026-07-18T04:00:00.000Z",proposalUpdateCount:1,auditInsertCount:1,transactionCommitted:true,retryCount:0};
function deps(input:{actor?:unknown;auth?:unknown;found?:unknown|null;review?:DailyFarmBriefProposalReviewDecisionRepository|null;clock?:string}={}):HermesDailyFarmBriefProposalReviewDecisionServiceDependencies{return{authenticate:async()=>input.auth??AUTH,resolveActorContext:async()=>input.actor??ADMIN,readRepository:async()=>({listDailyBriefProposalRows:async()=>[],findDailyBriefProposalRowBySafeReference:async()=>input.found===undefined?row:input.found as never}),reviewRepository:async()=>input.review===undefined?new ReviewRepo(recorded):input.review,clock:()=>input.clock??"2026-07-18T04:00:00.000Z"};}
function request(value:unknown=body,urlRef=ref){return new Request(`http://local/api/hermes/daily-farm-brief/proposals/${urlRef}/review`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(value)});}
async function call(d=deps(),value:unknown=body,urlRef=ref){return serveHermesDailyFarmBriefProposalReviewDecision({request:request(value,urlRef),dependencies:d});}
async function json(response:Response){return JSON.parse(await response.text()) as Record<string,unknown>;}

const success=await call();assert.equal(success.status,200);assert.deepEqual(parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse(await success.text()),{ok:true,proposal_ref:ref,previous_status:"pending",status:"approved",updated_at:"2026-07-18T04:00:00.000Z"});
assert.equal((await call(deps(),{...body,unknown:true})).status,400);
assert.equal((await call(deps({auth:{schema_version:"hermes.daily_farm_brief.authentication_result.v1",status:"unauthenticated",principal_ref:null}}))).status,401);
assert.equal((await call(deps({actor:STAFF}))).status,403);
assert.equal((await call(deps({actor:{...ADMIN,principal_ref:"other"}}))).status,403);
assert.equal((await call(deps({found:null}))).status,404);
assert.equal((await call(deps(),{...body,expected_updated_at:"2026-07-17T21:06:00.000Z"})).status,409);
assert.equal((await call(deps({clock:"2026-07-20T00:00:00.000Z"}))).status,409);
assert.equal((await call(deps({found:{...row,status:"approved"}}))).status,409);
assert.equal((await call(deps({found:{...row,id:HERMES_DAY128_PROTECTED_PROPOSAL_ID}}))).status,409);
assert.equal((await call(deps({review:null}))).status,500);
assert.equal((await call(deps({review:new ReviewRepo({result:"atomic_write_failed"})}))).status,500);
assert.equal((await call(deps({review:new ReviewRepo({result:"stale"})}))).status,409);
const failed=await call(deps({review:new ReviewRepo(new Error("raw database principal secret"))}));assert.equal(failed.status,500);const failedBody=JSON.stringify(await json(failed));assert(!failedBody.includes("raw database"));assert(!failedBody.includes(row.id));
console.log("Daily Brief Proposal review decision service tests passed");
