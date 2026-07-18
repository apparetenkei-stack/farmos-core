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
  type HermesDailyFarmBriefProposalReviewApiError,
} from "./hermes_daily_farm_brief_proposal_review_api_contract";
import {
  createHermesDailyFarmBriefProposalDetail,
  createHermesDailyFarmBriefProposalListItem,
  parseHermesDailyFarmBriefProposalSafeReference,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import type { HermesDailyFarmBriefProposalReviewReadRepository } from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_repository";

export type HermesDailyFarmBriefProposalReviewServiceDependencies = {
  authenticate: (request: Request) => Promise<unknown>;
  resolveActorContext: (authentication: Extract<HermesDailyFarmBriefAuthenticationResult,{status:"authenticated"}>) => Promise<unknown>;
  readRepository: () => Promise<HermesDailyFarmBriefProposalReviewReadRepository | null>;
  clock: () => string;
};

const HEADERS={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"} as const;
function httpStatus(error:HermesDailyFarmBriefProposalReviewApiError):400|401|403|404|405|503 { if(error==="authentication_required")return 401;if(error==="access_forbidden")return 403;if(error==="proposal_not_found")return 404;if(error==="method_not_allowed")return 405;if(error==="proposal_read_unavailable")return 503;return 400; }
function listError(error:Exclude<HermesDailyFarmBriefProposalReviewApiError,"invalid_proposal_reference"|"proposal_not_found">):Response { const headers=new Headers(HEADERS);if(error==="method_not_allowed")headers.set("Allow","GET");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewListApiResponse({result:"error",error})),{status:httpStatus(error),headers}); }
function detailError(error:HermesDailyFarmBriefProposalReviewApiError):Response { const headers=new Headers(HEADERS);if(error==="method_not_allowed")headers.set("Allow","GET");return new Response(JSON.stringify(createHermesDailyFarmBriefProposalReviewDetailApiResponse({result:"error",error})),{status:httpStatus(error),headers}); }
async function authorize(request:Request,deps:HermesDailyFarmBriefProposalReviewServiceDependencies) {
  let authentication:ReturnType<typeof parseHermesDailyFarmBriefAuthenticationResult>;
  try{authentication=parseHermesDailyFarmBriefAuthenticationResult(await deps.authenticate(request));}catch{authentication=null;}
  if(authentication===null||authentication.status!=="authenticated")return {error:"authentication_required" as const};
  let actor:ReturnType<typeof parseHermesDailyFarmBriefAuthenticatedActorContext>;
  try{actor=parseHermesDailyFarmBriefAuthenticatedActorContext(await deps.resolveActorContext(authentication));}catch{actor=null;}
  if(actor===null||actor.principal_ref!==authentication.principal_ref||actor.role!=="administrator"||actor.authorization_verified!==true||actor.allowed_scope_keys.length!==0)return {error:"access_forbidden" as const};
  return {error:null};
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
