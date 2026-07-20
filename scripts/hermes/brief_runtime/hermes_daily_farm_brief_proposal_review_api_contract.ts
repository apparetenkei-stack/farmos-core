import { isCanonicalIso } from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalDetail,
  type HermesDailyFarmBriefProposalListItem,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISIONS,
  normalizeHermesDailyFarmBriefProposalReviewNote,
  type HermesDailyFarmBriefProposalReviewDecision,
  type HermesDailyFarmBriefProposalReviewNextStatus,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH = "/api/hermes/daily-farm-brief/proposals" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION = "hermes.daily_farm_brief.proposal_review_list_api_response.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION = "hermes.daily_farm_brief.proposal_review_detail_api_response.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_PATH_SUFFIX = "/review" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY = {
  authentication_enforced: true, administrator_required: true, role_resolution_server_owned: true,
  database_target_server_owned: true, database_write_performed: false, proposal_insert_performed: false,
  proposal_update_performed: false, proposal_delete_performed: false, proposal_apply_performed: false,
  app_database_write_performed: false, audit_database_write_performed: false, raw_identifier_exposed: false,
  raw_record_exposed: false, principal_ref_exposed: false, credential_exposed: false,
  public_anonymous_access_allowed: false, retry_performed: false, fail_closed: true,
} as const;

export type HermesDailyFarmBriefProposalReviewApiError = "invalid_request" | "invalid_proposal_reference" | "authentication_required" | "access_forbidden" | "method_not_allowed" | "proposal_read_unavailable" | "proposal_not_found";
export type HermesDailyFarmBriefProposalReviewListRequest = { schema_version: "hermes.daily_farm_brief.proposal_review_list_request.v1"; method: "GET"; pathname: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH; requested_at: string; query_parameter_count: 0; body_present: false };
export type HermesDailyFarmBriefProposalReviewDetailRequest = { schema_version: "hermes.daily_farm_brief.proposal_review_detail_request.v1"; method: "GET"; pathname: string; proposal_ref: string; requested_at: string; query_parameter_count: 0; body_present: false };
export type HermesDailyFarmBriefProposalReviewDecisionHttpRequest = {
  decision: HermesDailyFarmBriefProposalReviewDecision;
  review_note: string;
  expected_status: "pending";
  expected_updated_at: string;
};
export type HermesDailyFarmBriefProposalReviewDecisionHttpError =
  | "invalid_request" | "unauthenticated" | "forbidden" | "not_found"
  | "stale" | "invalid_transition" | "expired" | "protected"
  | "unavailable" | "atomic_write_failed";
export type HermesDailyFarmBriefProposalReviewDecisionHttpResponse =
  | { ok: true; proposal_ref: string; previous_status: "pending"; status: HermesDailyFarmBriefProposalReviewNextStatus; updated_at: string }
  | { ok: false; error: HermesDailyFarmBriefProposalReviewDecisionHttpError };
export type HermesDailyFarmBriefProposalReviewListApiResponse =
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION; result: "ok"; error: null; proposals: HermesDailyFarmBriefProposalListItem[]; safety: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY }
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION; result: "error"; error: Exclude<HermesDailyFarmBriefProposalReviewApiError, "invalid_proposal_reference" | "proposal_not_found">; proposals: []; safety: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY };
export type HermesDailyFarmBriefProposalReviewDetailApiResponse =
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION; result: "ok"; error: null; proposal: HermesDailyFarmBriefProposalDetail; safety: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY }
  | { schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION; result: "error"; error: HermesDailyFarmBriefProposalReviewApiError; proposal: null; safety: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY };

type JsonRecord = Record<string, unknown>;
function record(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function safety(value: unknown): boolean { return record(value) && exact(value, Object.keys(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY)) && Object.entries(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY).every(([key, expected]) => value[key] === expected); }
const LIST_KEYS = ["proposal_ref","proposal_type","proposal_type_label","status","status_label","risk_level","risk_label","title","summary","created_at","expires_at","expiry_state","source_kind","source_kind_label","requires_human_review","proposal_apply_performed"] as const;
const DETAIL_KEYS = ["proposal_ref","proposal_type","proposal_type_label","status","status_label","risk_level","risk_label","title","body","reason","target_display","work_type_label","basis","before","after","created_at","updated_at","expires_at","expiry_state","source_business_date","source_version","source_kind","source_kind_label","requires_human_review","proposal_apply_ready","proposal_apply_performed"] as const;
const STATUSES = ["pending","approved","rejected","needs_revision","applied","expired"];
const RISKS = ["low","medium","high"];
function listItem(value: unknown): value is HermesDailyFarmBriefProposalListItem { return record(value) && exact(value, LIST_KEYS) && parseHermesDailyFarmBriefProposalSafeReference(value.proposal_ref) !== null && value.proposal_type === "work_log_follow_up" && STATUSES.includes(String(value.status)) && RISKS.includes(String(value.risk_level)) && typeof value.title === "string" && typeof value.summary === "string" && isCanonicalIso(value.created_at) && isCanonicalIso(value.expires_at) && ["active","expired"].includes(String(value.expiry_state)) && value.source_kind === "daily_farm_brief_attention" && value.requires_human_review === true && typeof value.proposal_apply_performed === "boolean"; }
function detail(value: unknown): value is HermesDailyFarmBriefProposalDetail { return record(value) && exact(value, DETAIL_KEYS) && listItem({ proposal_ref:value.proposal_ref,proposal_type:value.proposal_type,proposal_type_label:value.proposal_type_label,status:value.status,status_label:value.status_label,risk_level:value.risk_level,risk_label:value.risk_label,title:value.title,summary:value.basis,created_at:value.created_at,expires_at:value.expires_at,expiry_state:value.expiry_state,source_kind:value.source_kind,source_kind_label:value.source_kind_label,requires_human_review:value.requires_human_review,proposal_apply_performed:value.proposal_apply_performed }) && isCanonicalIso(value.updated_at) && [value.body,value.reason,value.target_display,value.work_type_label,value.basis,value.before,value.after,value.source_business_date].every((item) => typeof item === "string") && Number.isSafeInteger(value.source_version) && Number(value.source_version)>0 && value.proposal_apply_ready === false; }

export function parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest(value:unknown):HermesDailyFarmBriefProposalReviewDecisionHttpRequest|null {
  if(!record(value)||!exact(value,["decision","review_note","expected_status","expected_updated_at"]))return null;
  const note=normalizeHermesDailyFarmBriefProposalReviewNote(value.review_note);
  if(!(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISIONS as readonly unknown[]).includes(value.decision)||note===null||value.expected_status!=="pending"||!isCanonicalIso(value.expected_updated_at))return null;
  return {decision:value.decision as HermesDailyFarmBriefProposalReviewDecision,review_note:note,expected_status:"pending",expected_updated_at:value.expected_updated_at};
}
const DECISION_HTTP_ERRORS=["invalid_request","unauthenticated","forbidden","not_found","stale","invalid_transition","expired","protected","unavailable","atomic_write_failed"] as const;
export function parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse(value:unknown):HermesDailyFarmBriefProposalReviewDecisionHttpResponse|null {
  let decoded:unknown=value;
  if(typeof value==="string"){try{decoded=JSON.parse(value);}catch{return null;}}
  if(!record(decoded))return null;
  if(decoded.ok===false)return exact(decoded,["ok","error"])&&(DECISION_HTTP_ERRORS as readonly unknown[]).includes(decoded.error)?decoded as HermesDailyFarmBriefProposalReviewDecisionHttpResponse:null;
  return decoded.ok===true&&exact(decoded,["ok","proposal_ref","previous_status","status","updated_at"])&&parseHermesDailyFarmBriefProposalSafeReference(decoded.proposal_ref)!==null&&decoded.previous_status==="pending"&&["approved","rejected","needs_revision"].includes(String(decoded.status))&&isCanonicalIso(decoded.updated_at)?decoded as HermesDailyFarmBriefProposalReviewDecisionHttpResponse:null;
}

export function createHermesDailyFarmBriefProposalReviewListRequest(input:{request:Request;clock:()=>string}): HermesDailyFarmBriefProposalReviewListRequest|null { let url:URL;let now:string;try{url=new URL(input.request.url);now=input.clock();}catch{return null;}return parseHermesDailyFarmBriefProposalReviewListRequest({schema_version:"hermes.daily_farm_brief.proposal_review_list_request.v1",method:input.request.method,pathname:url.pathname,requested_at:now,query_parameter_count:[...url.searchParams].length,body_present:input.request.body!==null}); }
export function parseHermesDailyFarmBriefProposalReviewListRequest(value:unknown):HermesDailyFarmBriefProposalReviewListRequest|null { return record(value)&&exact(value,["schema_version","method","pathname","requested_at","query_parameter_count","body_present"])&&value.schema_version==="hermes.daily_farm_brief.proposal_review_list_request.v1"&&value.method==="GET"&&value.pathname===HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH&&isCanonicalIso(value.requested_at)&&value.query_parameter_count===0&&value.body_present===false?value as HermesDailyFarmBriefProposalReviewListRequest:null; }
export function createHermesDailyFarmBriefProposalReviewDetailRequest(input:{request:Request;clock:()=>string}):HermesDailyFarmBriefProposalReviewDetailRequest|null { let url:URL;let now:string;try{url=new URL(input.request.url);now=input.clock();}catch{return null;}const prefix=`${HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH}/`;const segment=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length):"";return parseHermesDailyFarmBriefProposalReviewDetailRequest({schema_version:"hermes.daily_farm_brief.proposal_review_detail_request.v1",method:input.request.method,pathname:url.pathname,proposal_ref:segment,requested_at:now,query_parameter_count:[...url.searchParams].length,body_present:input.request.body!==null}); }
export function parseHermesDailyFarmBriefProposalReviewDetailRequest(value:unknown):HermesDailyFarmBriefProposalReviewDetailRequest|null { return record(value)&&exact(value,["schema_version","method","pathname","proposal_ref","requested_at","query_parameter_count","body_present"])&&value.schema_version==="hermes.daily_farm_brief.proposal_review_detail_request.v1"&&value.method==="GET"&&typeof value.proposal_ref==="string"&&value.proposal_ref.length>0&&!value.proposal_ref.includes("/")&&value.pathname===`${HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_PATH}/${value.proposal_ref}`&&isCanonicalIso(value.requested_at)&&value.query_parameter_count===0&&value.body_present===false?value as HermesDailyFarmBriefProposalReviewDetailRequest:null; }

const LIST_ERRORS=["invalid_request","authentication_required","access_forbidden","method_not_allowed","proposal_read_unavailable"];
const DETAIL_ERRORS=[...LIST_ERRORS,"invalid_proposal_reference","proposal_not_found"];
export function createHermesDailyFarmBriefProposalReviewListApiResponse(input:{result:"ok";proposals:HermesDailyFarmBriefProposalListItem[]}|{result:"error";error:HermesDailyFarmBriefProposalReviewListApiResponse extends infer _T?Exclude<HermesDailyFarmBriefProposalReviewApiError,"invalid_proposal_reference"|"proposal_not_found">:never}):HermesDailyFarmBriefProposalReviewListApiResponse { return input.result==="ok"?{schema_version:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION,result:"ok",error:null,proposals:input.proposals,safety:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY}:{schema_version:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION,result:"error",error:input.error,proposals:[],safety:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY}; }
export function createHermesDailyFarmBriefProposalReviewDetailApiResponse(input:{result:"ok";proposal:HermesDailyFarmBriefProposalDetail}|{result:"error";error:HermesDailyFarmBriefProposalReviewApiError}):HermesDailyFarmBriefProposalReviewDetailApiResponse { return input.result==="ok"?{schema_version:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION,result:"ok",error:null,proposal:input.proposal,safety:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY}:{schema_version:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION,result:"error",error:input.error,proposal:null,safety:HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_API_SAFETY}; }
export function parseHermesDailyFarmBriefProposalReviewListApiResponse(value:unknown):HermesDailyFarmBriefProposalReviewListApiResponse|null { try{const v=typeof value==="string"?JSON.parse(value):value;if(!record(v)||!exact(v,["schema_version","result","error","proposals","safety"])||v.schema_version!==HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_LIST_API_SCHEMA_VERSION||!safety(v.safety)||!Array.isArray(v.proposals))return null;if(v.result==="error")return LIST_ERRORS.includes(String(v.error))&&v.proposals.length===0?v as HermesDailyFarmBriefProposalReviewListApiResponse:null;if(v.result!=="ok"||v.error!==null||!v.proposals.every(listItem))return null;return v as HermesDailyFarmBriefProposalReviewListApiResponse;}catch{return null;} }
export function parseHermesDailyFarmBriefProposalReviewDetailApiResponse(value:unknown):HermesDailyFarmBriefProposalReviewDetailApiResponse|null { try{const v=typeof value==="string"?JSON.parse(value):value;if(!record(v)||!exact(v,["schema_version","result","error","proposal","safety"])||v.schema_version!==HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DETAIL_API_SCHEMA_VERSION||!safety(v.safety))return null;if(v.result==="error")return DETAIL_ERRORS.includes(String(v.error))&&v.proposal===null?v as HermesDailyFarmBriefProposalReviewDetailApiResponse:null;if(v.result!=="ok"||v.error!==null||!detail(v.proposal))return null;return v as HermesDailyFarmBriefProposalReviewDetailApiResponse;}catch{return null;} }
