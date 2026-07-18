import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY,
  createHermesDailyFarmBriefProposalReviewDetailApiResponse,
  createHermesDailyFarmBriefProposalReviewDetailRequest,
  createHermesDailyFarmBriefProposalReviewListApiResponse,
  createHermesDailyFarmBriefProposalReviewListRequest,
  parseHermesDailyFarmBriefProposalReviewDetailApiResponse,
  parseHermesDailyFarmBriefProposalReviewDetailRequest,
  parseHermesDailyFarmBriefProposalReviewListApiResponse,
  parseHermesDailyFarmBriefProposalReviewListRequest,
} from "./brief_runtime/hermes_daily_farm_brief_proposal_review_api_contract";
import { createHermesDailyFarmBriefProposalDetail,createHermesDailyFarmBriefProposalListItem } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import { createDay127ApiTestRow } from "./test_hermes_daily_farm_brief_proposal_review_service";

export async function runDay127ProposalReviewApiContractTests(){const row=createDay127ApiTestRow();const now="2026-07-18T04:00:00.000Z";const listItem=createHermesDailyFarmBriefProposalListItem({row,requestedAt:now});const detail=createHermesDailyFarmBriefProposalDetail({row,requestedAt:now});assert(listItem&&detail);
  const listRequest=createHermesDailyFarmBriefProposalReviewListRequest({request:new Request("http://local/api/hermes/daily-farm-brief/proposals"),clock:()=>now});assert(listRequest);assert(parseHermesDailyFarmBriefProposalReviewListRequest(listRequest));assert.equal(parseHermesDailyFarmBriefProposalReviewListRequest({...listRequest,unknown:true}),null);
  const detailRequest=createHermesDailyFarmBriefProposalReviewDetailRequest({request:new Request(`http://local/api/hermes/daily-farm-brief/proposals/${detail.proposal_ref}`),clock:()=>now});assert(detailRequest);assert(parseHermesDailyFarmBriefProposalReviewDetailRequest(detailRequest));assert.equal(parseHermesDailyFarmBriefProposalReviewDetailRequest({...detailRequest,unknown:true}),null);
  const list=createHermesDailyFarmBriefProposalReviewListApiResponse({result:"ok",proposals:[listItem]});assert(parseHermesDailyFarmBriefProposalReviewListApiResponse(list));assert.equal(parseHermesDailyFarmBriefProposalReviewListApiResponse({...list,unknown:true}),null);assert.equal(parseHermesDailyFarmBriefProposalReviewListApiResponse({...list,safety:{...list.safety,unknown:true}}),null);assert.equal(parseHermesDailyFarmBriefProposalReviewListApiResponse({...list,proposals:[row]}),null);
  const listError=createHermesDailyFarmBriefProposalReviewListApiResponse({result:"error",error:"proposal_read_unavailable"});assert(parseHermesDailyFarmBriefProposalReviewListApiResponse(listError));assert.equal(parseHermesDailyFarmBriefProposalReviewListApiResponse({...listError,error:"unknown"}),null);assert.equal(parseHermesDailyFarmBriefProposalReviewListApiResponse({...listError,proposals:[listItem]}),null);
  const detailResponse=createHermesDailyFarmBriefProposalReviewDetailApiResponse({result:"ok",proposal:detail});assert(parseHermesDailyFarmBriefProposalReviewDetailApiResponse(detailResponse));assert.equal(parseHermesDailyFarmBriefProposalReviewDetailApiResponse({...detailResponse,unknown:true}),null);assert.equal(parseHermesDailyFarmBriefProposalReviewDetailApiResponse({...detailResponse,proposal:row}),null);
  const detailError=createHermesDailyFarmBriefProposalReviewDetailApiResponse({result:"error",error:"proposal_not_found"});assert(parseHermesDailyFarmBriefProposalReviewDetailApiResponse(detailError));assert.equal(parseHermesDailyFarmBriefProposalReviewDetailApiResponse({...detailError,error:"unknown"}),null);assert.equal(parseHermesDailyFarmBriefProposalReviewDetailApiResponse({...detailError,proposal:detail}),null);
  assert.deepEqual(Object.keys(list.safety).sort(),Object.keys(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY).sort());assert(!JSON.stringify(list).includes(row.id));assert(!JSON.stringify(detailResponse).includes(row.id));
  return {result:"pass",exact_request_keys:true,exact_response_keys:true,exact_safety_keys:true,unknown_key_rejected:true,unknown_error_rejected:true,raw_row_rejected:true,null_result_consistency:true};}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)console.log(JSON.stringify(await runDay127ProposalReviewApiContractTests()));
