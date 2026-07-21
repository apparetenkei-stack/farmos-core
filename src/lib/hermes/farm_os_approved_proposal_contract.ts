import { createHash } from "node:crypto";
import { FARM_OS_RISK_POLICIES, resolveRiskPolicy, type FarmOsApprovalRequirement, type FarmOsRiskLevel } from "./farm_os_risk_taxonomy";
import { resolveFarmOsCommandClass, type FarmOsApprovedOutputClass } from "./farm_os_command_registry";

export const FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION = "farmos.approved.proposal.v1" as const;
export const FARM_OS_L3_REAUTHENTICATION_MAX_AGE_MS = 5 * 60 * 1000;
export type FarmOsReauthenticationEvidence={reauthenticated_actor:"human_reviewer";reauthenticated_at:string;reauthentication_method:"human_session_reauthentication";final_confirmation_at:string;confirmation_scope_hash:string};
export type FarmOsApprovalEvidence = {
  approval_id: string;
  decision: "approve";
  review_actor: "human_reviewer";
  review_timestamp: string;
  approved_capabilities: readonly string[];
  approved_output_classes: readonly FarmOsApprovedOutputClass[];
  proposal_version: number;
  proposal_hash: string;
  reauthentication_evidence: FarmOsReauthenticationEvidence | null;
};
export type FarmOsApprovedProposal = {
  schema_version: typeof FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION;
  proposal_id: string; proposal_type: string; proposal_version: number;
  risk_level: Extract<FarmOsRiskLevel, "l2_internal_apply" | "l3_external_execution">;
  review_result: "approved"; review_timestamp: string; review_actor: "human_reviewer";
  approval_requirement: FarmOsApprovalRequirement; approval_evidence: FarmOsApprovalEvidence;
  approved_outputs: readonly [FarmOsApprovedOutputClass]; source_runtime: "farmos-native-runtime";
  trace: { request_id: string; correlation_id: string; source_event_hash: string };
  audit: { review_audit_reference: string; recorded_at: string };
};
export type FarmOsContractParseResult<T> = { valid: true; value: T; blocked_reason: null } | { valid: false; value: null; blocked_reason: string };

const KEYS = ["schema_version","proposal_id","proposal_type","proposal_version","risk_level","review_result","review_timestamp","review_actor","approval_requirement","approval_evidence","approved_outputs","source_runtime","trace","audit"] as const;
const APPROVAL_KEYS = ["approval_id","decision","review_actor","review_timestamp","approved_capabilities","approved_output_classes","proposal_version","proposal_hash","reauthentication_evidence"] as const;
const REAUTH_KEYS=["reauthenticated_actor","reauthenticated_at","reauthentication_method","final_confirmation_at","confirmation_scope_hash"] as const;
const TRACE_KEYS = ["request_id","correlation_id","source_event_hash"] as const;
const AUDIT_KEYS = ["review_audit_reference","recorded_at"] as const;
export const isFarmOsRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const hasExactFarmOsKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
export const isFarmOsIdentifier = (value: unknown): value is string => typeof value === "string" && /^[a-z][a-z0-9_-]{7,127}$/u.test(value);
export const isFarmOsDigest = (value: unknown): value is string => typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
export const isCanonicalFarmOsIso = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
export const canonicalFarmOsJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalFarmOsJson).join(",")}]`;
  if (isFarmOsRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalFarmOsJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
export const hashFarmOsContract = (value: unknown) => `sha256:${createHash("sha256").update(canonicalFarmOsJson(value), "utf8").digest("hex")}`;
export type FarmOsProposalIntegrityMaterial={proposal_id:string;proposal_type:string;proposal_version:number;risk_level:FarmOsApprovedProposal["risk_level"];approval_requirement:FarmOsApprovalRequirement;approved_outputs:readonly FarmOsApprovedOutputClass[];approved_capabilities:readonly string[];source_runtime:"farmos-native-runtime";trace:FarmOsApprovedProposal["trace"];review_result:"approved";review_actor:"human_reviewer";review_timestamp:string;approval_id:string;decision:"approve";reauthentication_evidence:FarmOsReauthenticationEvidence|null};
const sorted=(values:readonly string[])=>[...values].sort();
const scopeMaterial=(value:FarmOsProposalIntegrityMaterial)=>({proposal_id:value.proposal_id,proposal_type:value.proposal_type,proposal_version:value.proposal_version,risk_level:value.risk_level,approval_requirement:value.approval_requirement,approved_outputs:sorted(value.approved_outputs),approved_capabilities:sorted(value.approved_capabilities),source_runtime:value.source_runtime,trace:{request_id:value.trace.request_id,correlation_id:value.trace.correlation_id,source_event_hash:value.trace.source_event_hash},review_result:value.review_result,review_actor:value.review_actor,review_timestamp:value.review_timestamp,approval_id:value.approval_id,decision:value.decision});
export const computeFarmOsConfirmationScopeHash=(value:FarmOsProposalIntegrityMaterial)=>hashFarmOsContract(scopeMaterial(value));
export const computeFarmOsProposalIntegrityHash=(value:FarmOsProposalIntegrityMaterial)=>hashFarmOsContract({...scopeMaterial(value),reauthentication_evidence:value.reauthentication_evidence});
export const createFarmOsProposalIntegrityMaterial=(proposal:Omit<FarmOsApprovedProposal,"approval_evidence">&{approval_evidence:Omit<FarmOsApprovalEvidence,"proposal_hash">}):FarmOsProposalIntegrityMaterial=>({proposal_id:proposal.proposal_id,proposal_type:proposal.proposal_type,proposal_version:proposal.proposal_version,risk_level:proposal.risk_level,approval_requirement:proposal.approval_requirement,approved_outputs:proposal.approved_outputs,approved_capabilities:proposal.approval_evidence.approved_capabilities,source_runtime:proposal.source_runtime,trace:proposal.trace,review_result:proposal.review_result,review_actor:proposal.review_actor,review_timestamp:proposal.review_timestamp,approval_id:proposal.approval_evidence.approval_id,decision:proposal.approval_evidence.decision,reauthentication_evidence:proposal.approval_evidence.reauthentication_evidence});
const exactSet = (value: unknown, expected: readonly string[]): value is string[] => Array.isArray(value) && value.length === expected.length && value.every((item) => typeof item === "string" && expected.includes(item)) && new Set(value).size === value.length;
export function validateFarmOsReauthenticationEvidence(material:FarmOsProposalIntegrityMaterial):string|null{
  const evidence=material.reauthentication_evidence;
  if(material.risk_level==="l2_internal_apply")return evidence===null?null:"REAUTHENTICATION_EVIDENCE_INVALID";
  if(evidence===null||evidence===undefined)return"REAUTHENTICATION_EVIDENCE_MISSING";
  if(!isFarmOsRecord(evidence)||!hasExactFarmOsKeys(evidence,REAUTH_KEYS)||evidence.reauthenticated_actor!==material.review_actor||evidence.reauthentication_method!=="human_session_reauthentication"||!isCanonicalFarmOsIso(evidence.reauthenticated_at))return"REAUTHENTICATION_EVIDENCE_INVALID";
  if(!isCanonicalFarmOsIso(evidence.final_confirmation_at))return"FINAL_CONFIRMATION_MISSING";
  const reviewed=Date.parse(material.review_timestamp),reauthenticated=Date.parse(evidence.reauthenticated_at),confirmed=Date.parse(evidence.final_confirmation_at),evaluated=Date.now();
  if(reauthenticated<reviewed||confirmed<reauthenticated||confirmed-reauthenticated>FARM_OS_L3_REAUTHENTICATION_MAX_AGE_MS||evaluated<confirmed||evaluated-confirmed>FARM_OS_L3_REAUTHENTICATION_MAX_AGE_MS)return"REAUTHENTICATION_EVIDENCE_INVALID";
  if(!isFarmOsDigest(evidence.confirmation_scope_hash)||evidence.confirmation_scope_hash!==computeFarmOsConfirmationScopeHash(material))return"FINAL_CONFIRMATION_SCOPE_MISMATCH";
  return null;
}

export function parseFarmOsApprovedProposal(value: unknown): FarmOsContractParseResult<FarmOsApprovedProposal> {
  if (!isFarmOsRecord(value)) return { valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID" };
  if (!Object.hasOwn(value,"approval_evidence") || value.approval_evidence === null) return { valid:false,value:null,blocked_reason:"APPROVAL_EVIDENCE_MISSING" };
  if (!hasExactFarmOsKeys(value, KEYS)) return { valid:false,value:null,blocked_reason:"UNKNOWN_FIELD" };
  if (value.schema_version !== FARM_OS_APPROVED_PROPOSAL_SCHEMA_VERSION) return { valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID" };
  if (!isFarmOsIdentifier(value.proposal_id) || !Number.isSafeInteger(value.proposal_version) || (value.proposal_version as number) < 1) return { valid:false,value:null,blocked_reason:"PROPOSAL_VERSION_UNSUPPORTED" };
  const proposalPolicy = resolveRiskPolicy(value.proposal_type);
  if (!proposalPolicy || proposalPolicy.proposal_type_status !== "active") return { valid:false,value:null,blocked_reason:"PROPOSAL_TYPE_UNKNOWN" };
  if (value.review_result !== "approved" || value.review_actor !== "human_reviewer" || !isCanonicalFarmOsIso(value.review_timestamp)) return { valid:false,value:null,blocked_reason:"PROPOSAL_NOT_APPROVED" };
  if (value.source_runtime !== "farmos-native-runtime" || !Array.isArray(value.approved_outputs) || value.approved_outputs.length !== 1) return { valid:false,value:null,blocked_reason:"OUTPUT_CLASS_NOT_APPROVED" };
  const command = (["approved_internal_command","approved_external_command"] as const).map(resolveFarmOsCommandClass).find((entry) => entry?.allowed_output_classes[0] === value.approved_outputs[0]);
  if (!command) return { valid:false,value:null,blocked_reason:"OUTPUT_CLASS_NOT_APPROVED" };
  if (value.risk_level !== command.required_risk_level) return { valid:false,value:null,blocked_reason:"RISK_LEVEL_MISMATCH" };
  const risk = FARM_OS_RISK_POLICIES[command.required_risk_level];
  if (value.approval_requirement !== risk.approval_requirement) return { valid:false,value:null,blocked_reason:"APPROVAL_SCOPE_MISMATCH" };
  if (!isFarmOsRecord(value.trace) || !hasExactFarmOsKeys(value.trace, TRACE_KEYS) || !isFarmOsIdentifier(value.trace.request_id) || !isFarmOsIdentifier(value.trace.correlation_id) || !isFarmOsDigest(value.trace.source_event_hash)) return { valid:false,value:null,blocked_reason:"TRACE_INVALID" };
  if (!isFarmOsRecord(value.audit) || !hasExactFarmOsKeys(value.audit, AUDIT_KEYS) || !isFarmOsIdentifier(value.audit.review_audit_reference) || !isCanonicalFarmOsIso(value.audit.recorded_at)) return { valid:false,value:null,blocked_reason:"AUDIT_CONTEXT_INVALID" };
  if (!isFarmOsRecord(value.approval_evidence) || !hasExactFarmOsKeys(value.approval_evidence, APPROVAL_KEYS)) return { valid:false,value:null,blocked_reason:"APPROVAL_EVIDENCE_INVALID" };
  const evidence = value.approval_evidence;
  const candidate = value as unknown as FarmOsApprovedProposal;
  if (!isFarmOsIdentifier(evidence.approval_id) || evidence.decision !== "approve" || evidence.review_actor !== value.review_actor || evidence.review_timestamp !== value.review_timestamp || evidence.proposal_version !== value.proposal_version) return { valid:false,value:null,blocked_reason:"APPROVAL_EVIDENCE_INVALID" };
  if (!exactSet(evidence.approved_capabilities, command.required_capabilities) || !exactSet(evidence.approved_output_classes, value.approved_outputs as unknown[] as string[])) return { valid:false,value:null,blocked_reason:"APPROVAL_SCOPE_MISMATCH" };
  const reauthenticationError=validateFarmOsReauthenticationEvidence(createFarmOsProposalIntegrityMaterial(candidate));
  if(reauthenticationError)return{valid:false,value:null,blocked_reason:reauthenticationError};
  if (!isFarmOsDigest(evidence.proposal_hash) || evidence.proposal_hash !== computeFarmOsProposalIntegrityHash(createFarmOsProposalIntegrityMaterial(candidate))) return { valid:false,value:null,blocked_reason:"PROPOSAL_HASH_INVALID" };
  if (Date.parse(value.audit.recorded_at as string) < Date.parse(value.review_timestamp as string)) return { valid:false,value:null,blocked_reason:"AUDIT_CONTEXT_INVALID" };
  return { valid:true,value:candidate,blocked_reason:null };
}

type Cursor={index:number;duplicate:boolean};
const ws=(text:string,c:Cursor)=>{while(/\s/u.test(text[c.index]??""))c.index+=1;};
const str=(text:string,c:Cursor)=>{const start=c.index;c.index+=1;while(c.index<text.length){if(text[c.index]==="\\")c.index+=2;else if(text[c.index++]==='"')return JSON.parse(text.slice(start,c.index));}throw new Error("invalid");};
const scan=(text:string,c:Cursor):void=>{ws(text,c);if(text[c.index]==="{"){c.index+=1;const keys=new Set<string>();ws(text,c);if(text[c.index]==="}"){c.index+=1;return;}while(c.index<text.length){if(text[c.index]!=='"')throw new Error("invalid");const key=str(text,c);if(keys.has(key))c.duplicate=true;keys.add(key);ws(text,c);if(text[c.index++]!==":")throw new Error("invalid");scan(text,c);ws(text,c);const d=text[c.index++];if(d==="}")return;if(d!==",")throw new Error("invalid");ws(text,c);}throw new Error("invalid");}if(text[c.index]==="["){c.index+=1;ws(text,c);if(text[c.index]==="]"){c.index+=1;return;}while(c.index<text.length){scan(text,c);ws(text,c);const d=text[c.index++];if(d==="]")return;if(d!==",")throw new Error("invalid");ws(text,c);}throw new Error("invalid");}if(text[c.index]==='"'){str(text,c);return;}const start=c.index;while(c.index<text.length&&!/[\s,}\]]/u.test(text[c.index]))c.index+=1;JSON.parse(text.slice(start,c.index));};
export function parseFarmOsDuplicateAwareJson(text:unknown):{valid:true;value:unknown;blocked_reason:null}|{valid:false;value:null;blocked_reason:"DUPLICATE_FIELD"|"COMMAND_SCHEMA_INVALID"}{if(typeof text!=="string")return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};try{const c:Cursor={index:0,duplicate:false};scan(text,c);ws(text,c);if(c.index!==text.length)throw new Error("invalid");if(c.duplicate)return{valid:false,value:null,blocked_reason:"DUPLICATE_FIELD"};return{valid:true,value:JSON.parse(text),blocked_reason:null};}catch{return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};}}
export function parseFarmOsApprovedProposalJson(text: unknown): FarmOsContractParseResult<FarmOsApprovedProposal>{const raw=parseFarmOsDuplicateAwareJson(text);if(!raw.valid)return{valid:false,value:null,blocked_reason:raw.blocked_reason};return parseFarmOsApprovedProposal(raw.value);}
