import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
  type HermesDailyFarmBriefAuthenticationResult,
} from "./hermes_daily_farm_brief_latest_api_contract";
import {
  createHermesDailyFarmBriefProposalReviewDetailApiResponse,
  createHermesDailyFarmBriefProposalReviewDetailRequest,
  createHermesDailyFarmBriefProposalReviewListApiResponse,
  createHermesDailyFarmBriefProposalReviewListRequest,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH,
  type HermesDailyFarmBriefProposalReviewApiError,
  parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest,
  type HermesDailyFarmBriefProposalReviewDecisionHttpError,
} from "./hermes_daily_farm_brief_proposal_review_api_contract";
import {
  createHermesDailyFarmBriefProposalDetail,
  createHermesDailyFarmBriefProposalListItem,
  parseHermesDailyFarmBriefProposalSafeReference,
  parseHermesDailyFarmBriefProposalReviewRawRow,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import type { HermesDailyFarmBriefProposalReviewReadRepository } from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_repository";
import {
  prepareHermesDailyFarmBriefProposalReviewDecision,
  type DailyFarmBriefProposalReviewDecisionRepository,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";
import { HERMES_DAY128_PROTECTED_PROPOSAL_ID } from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_repository";

export type HermesDailyFarmBriefProposalReviewServiceDependencies = {
  authenticate: (request: Request) => Promise<unknown>;
  resolveActorContext: (authentication: Extract<HermesDailyFarmBriefAuthenticationResult,{status:"authenticated"}>) => Promise<unknown>;
  readRepository: () => Promise<HermesDailyFarmBriefProposalReviewReadRepository | null>;
  clock: () => string;
};
export type HermesDailyFarmBriefProposalReviewDecisionServiceDependencies = HermesDailyFarmBriefProposalReviewServiceDependencies & {
  reviewRepository: () => Promise<DailyFarmBriefProposalReviewDecisionRepository | null>;
};

const HEADERS={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"} as const;
function httpStatus(error:HermesDailyFarmBriefProposalReviewApiError):400|401|403|404|405|503 { if(error==="authentication_required")return 401;if(error==="access_forbidden")return 403;if(error==="proposal_not_found")return 404;if(error==="method_not_allowed")return 405;if(error==="proposal_read_unavailable")return 503;return 400; }
function listError(error:Exclude<HermesDailyFarmBriefProposalReviewApiError,"invalid_proposal_reference"|"proposal_not_found">):Response { const headers=new Headers(HEADERS);if(error==="method_not_allowed")headers.set("Allow","GET");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewListApiResponse({result:"error",error})),{status:httpStatus(error),headers}); }
function detailError(error:HermesDailyFarmBriefProposalReviewApiError):Response { const headers=new Headers(HEADERS);if(error==="method_not_allowed")headers.set("Allow","GET");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewDetailApiResponse({result:"error",error})),{status:httpStatus(error),headers}); }
async function authorize(request:Request,deps:HermesDailyFarmBriefProposalReviewServiceDependencies) {
  let authentication:ReturnType<typeof parseHermesDailyFarmBriefAuthenticationResult>;
  try{authentication=parseHermesDailyFarmBriefAuthenticationResult(await deps.authenticate(request));}catch{authentication=null;}
  if(authentication===null||authentication.status!=="authenticated")return {error:"authentication_required" as const,authentication:null,actor:null};
  let actor:ReturnType<typeof parseHermesDailyFarmBriefAuthenticatedActorContext>;
  try{actor=parseHermesDailyFarmBriefAuthenticatedActorContext(await deps.resolveActorContext(authentication));}catch{actor=null;}
  if(actor===null||actor.principal_ref!==authentication.principal_ref||actor.role!=="administrator"||actor.authorization_verified!==true||actor.allowed_scope_keys.length!==0)return {error:"access_forbidden" as const,authentication:null,actor:null};
  return {error:null,authentication,actor};
}

export async function serveHermesDailyFarmBriefProposalReviewList(input:{request:Request;dependencies:HermesDailyFarmBriefProposalReviewServiceDependencies}):Promise<Response>{
  if(input.request.method!=="GET")return listError("method_not_allowed");
  const request=createHermesDailyFarmBriefProposalReviewListRequest({request:input.request,clock:input.dependencies.clock});
  if(request===null)return listError("invalid_request");
  const authorization=await authorize(input.request,input.dependencies);if(authorization.error!==null)return listError(authorization.error);
  let repository:HermesDailyFarmBriefProposalReviewReadRepository|null;try{repository=await input.dependencies.readRepository();}catch{repository=null;}if(repository===null)return listError("proposal_read_unavailable");
  try{const rows=await repository.listDailyBriefProposalRows(100);const proposals=rows.map((row)=>createHermesDailyFarmBriefProposalListItem({row,requestedAt:request.requested_at}));if(proposals.some((item)=>item===null))return listError("proposal_read_unavailable");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewListApiResponse({result:"ok",proposals:proposals as NonNullable<(typeof proposals)[number]>[]})),{status:200,headers:HEADERS});}catch{return listError("proposal_read_unavailable");}
}

export async function serveHermesDailyFarmBriefProposalReviewDetail(input:{request:Request;dependencies:HermesDailyFarmBriefProposalReviewServiceDependencies}):Promise<Response>{
  if(input.request.method!=="GET")return detailError("method_not_allowed");
  const request=createHermesDailyFarmBriefProposalReviewDetailRequest({request:input.request,clock:input.dependencies.clock});
  if(request===null)return detailError("invalid_request");
  if(parseHermesDailyFarmBriefProposalSafeReference(request.proposal_ref)===null)return detailError("invalid_proposal_reference");
  const authorization=await authorize(input.request,input.dependencies);if(authorization.error!==null)return detailError(authorization.error);
  let repository:HermesDailyFarmBriefProposalReviewReadRepository|null;try{repository=await input.dependencies.readRepository();}catch{repository=null;}if(repository===null)return detailError("proposal_read_unavailable");
  try{const row=await repository.findDailyBriefProposalRowBySafeReference(request.proposal_ref);if(row===null)return detailError("proposal_not_found");const proposal=createHermesDailyFarmBriefProposalDetail({row,requestedAt:request.requested_at});if(proposal===null||proposal.proposal_ref!==request.proposal_ref)return detailError("proposal_read_unavailable");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewDetailApiResponse({result:"ok",proposal})),{status:200,headers:HEADERS});}catch{return detailError("proposal_read_unavailable");}
}

function decisionResponse(status:number,body:{ok:false;error:HermesDailyFarmBriefProposalReviewDecisionHttpError}|{ok:true;proposal_ref:string;previous_status:"pending";status:"approved"|"rejected"|"needs_revision";updated_at:string}):Response{
  return new Response(JSON.stringify(body),{status,headers:HEADERS});
}
function decisionError(error:HermesDailyFarmBriefProposalReviewDecisionHttpError):Response{
  const status=error==="invalid_request"?400:error==="unauthenticated"?401:error==="forbidden"?403:error==="not_found"?404:["stale","invalid_transition","expired","protected"].includes(error)?409:500;
  return decisionResponse(status,{ok:false,error});
}

export async function serveHermesDailyFarmBriefProposalReviewDecision(input:{request:Request;dependencies:HermesDailyFarmBriefProposalReviewDecisionServiceDependencies}):Promise<Response>{
  if(input.request.method!=="POST")return decisionError("invalid_request");
  let url:URL;try{url=new URL(input.request.url);}catch{return decisionError("invalid_request");}
  if([...url.searchParams].length!==0)return decisionError("invalid_request");
  const prefix=`${HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH}/`;
  const suffix="/review";
  if(!url.pathname.startsWith(prefix)||!url.pathname.endsWith(suffix))return decisionError("invalid_request");
  const proposalRef=url.pathname.slice(prefix.length,-suffix.length);
  if(proposalRef.includes("/")||parseHermesDailyFarmBriefProposalSafeReference(proposalRef)===null)return decisionError("invalid_request");

  const authorization=await authorize(input.request,input.dependencies);
  if(authorization.error==="authentication_required")return decisionError("unauthenticated");
  if(authorization.error!==null||authorization.authentication===null||authorization.actor===null)return decisionError("forbidden");

  let rawBody:unknown;try{rawBody=await input.request.json();}catch{return decisionError("invalid_request");}
  const body=parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest(rawBody);
  if(body===null)return decisionError("invalid_request");

  let readRepository:HermesDailyFarmBriefProposalReviewReadRepository|null;
  try{readRepository=await input.dependencies.readRepository();}catch{readRepository=null;}
  if(readRepository===null)return decisionError("unavailable");
  let rawRow:Awaited<ReturnType<HermesDailyFarmBriefProposalReviewReadRepository["findDailyBriefProposalRowBySafeReference"]>>;
  try{rawRow=await readRepository.findDailyBriefProposalRowBySafeReference(proposalRef);}catch{return decisionError("unavailable");}
  if(rawRow===null)return decisionError("not_found");
  const row=parseHermesDailyFarmBriefProposalReviewRawRow(rawRow);
  if(row===null)return decisionError("unavailable");

  let now:string;try{now=input.dependencies.clock();}catch{return decisionError("unavailable");}
  const preparation=prepareHermesDailyFarmBriefProposalReviewDecision({
    request:{proposal_ref:proposalRef,...body},
    authentication:authorization.authentication,
    actor:authorization.actor,
    currentState:{proposal_ref:proposalRef,current_status:row.status,current_updated_at:row.updated_at,expires_at:row.payload.expires_at,applied_at:row.applied_at,applied_by:(rawRow as {applied_by:string|null}).applied_by,protected_fixture:(rawRow as {id:string}).id===HERMES_DAY128_PROTECTED_PROPOSAL_ID},
    clock:()=>now,
  });
  if(preparation.status!=="ready"){
    const mapped:Record<string,HermesDailyFarmBriefProposalReviewDecisionHttpError>={proposal_not_found:"not_found",proposal_protected:"protected",proposal_expired:"expired",invalid_transition:"invalid_transition",stale_proposal:"stale",authentication_required:"unauthenticated",access_forbidden:"forbidden",invalid_request:"invalid_request",review_decision_unavailable:"unavailable"};
    return decisionError(mapped[preparation.error]??"unavailable");
  }

  let repository:DailyFarmBriefProposalReviewDecisionRepository|null;try{repository=await input.dependencies.reviewRepository();}catch{repository=null;}
  if(repository===null)return decisionError("unavailable");
  let result:Awaited<ReturnType<DailyFarmBriefProposalReviewDecisionRepository["recordProposalReviewDecision"]>>;
  try{result=await repository.recordProposalReviewDecision(preparation.command);}catch{return decisionError("atomic_write_failed");}
  if(result.result==="stale")return decisionError("stale");
  if(result.result==="not_found")return decisionError("not_found");
  if(result.result==="protected")return decisionError("protected");
  if(result.result==="expired")return decisionError("expired");
  if(result.result==="invalid_transition")return decisionError("invalid_transition");
  if(result.result!=="recorded"||result.previousStatus!=="pending"||result.nextStatus!==preparation.command.nextStatus||result.updatedAt!==preparation.command.newUpdatedAt||result.proposalUpdateCount!==1||result.auditInsertCount!==1||result.transactionCommitted!==true||result.retryCount!==0)return decisionError("atomic_write_failed");
  return decisionResponse(200,{ok:true,proposal_ref:proposalRef,previous_status:"pending",status:result.nextStatus,updated_at:result.updatedAt});
}
