import assert from "node:assert/strict";

import {
  parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest,
  parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse,
} from "./brief_runtime/hermes_daily_farm_brief_proposal_review_api_contract";

const request={decision:"approve",review_note:"確認しました。",expected_status:"pending",expected_updated_at:"2026-07-17T21:05:00.000Z"};
assert.deepEqual(parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest(request),request);
assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest({...request,unknown:true}),null);
for(const value of ["apply","approved","APPROVE",""])assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest({...request,decision:value}),null);
assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest({...request,review_note:"  "}),null);
assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest({...request,expected_updated_at:"2026-07-17 21:05:00"}),null);
const ref="daily_brief_proposal_aaaaaaaaaaaaaaaaaaaaaaaa";
assert.deepEqual(parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({ok:true,proposal_ref:ref,previous_status:"pending",status:"approved",updated_at:"2026-07-18T04:00:00.000Z"}),{ok:true,proposal_ref:ref,previous_status:"pending",status:"approved",updated_at:"2026-07-18T04:00:00.000Z"});
assert.deepEqual(parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({ok:false,error:"stale"}),{ok:false,error:"stale"});
assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({ok:false,error:"raw_database_error"}),null);
assert.equal(parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({ok:true,proposal_ref:ref,previous_status:"pending",status:"approved",updated_at:"2026-07-18T04:00:00.000Z",id:"raw"}),null);
console.log("Daily Brief Proposal review decision API contract tests passed");
