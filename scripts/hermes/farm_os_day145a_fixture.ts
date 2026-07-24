import {
  FARM_OS_ASSIGNMENT_CANDIDATE_SCHEMA_VERSION,
  FARM_OS_WORK_PLAN_ASSIGNMENT_SCHEMA_VERSION,
  FARM_OS_WORK_PLAN_DRAFT_SCHEMA_VERSION,
  FARM_OS_WORK_PLAN_POLICY_VERSION,
  computeAssignmentCandidateSnapshotHash,
  computeWorkPlanDraftSnapshotHash,
  computeWorkPlanRequestFingerprint,
  type AssignmentCandidate,
  type WorkPlanAssignmentAuthority,
  type WorkPlanAssignmentRequest,
  type WorkPlanDraft,
} from "../../src/lib/hermes/farm_os_work_plan_assignment_contract";
import { FARM_OS_CROP_WORKFORCE_SCHEMA_VERSION, type FarmOsTypedContextReference } from "../../src/lib/hermes/farm_os_crop_planning_workforce_governance";

export const DAY145A_NOW = "2026-07-24T03:00:00.000Z";
const scope = "farming_app:field:field_alpha:3";
const targetReference:FarmOsTypedContextReference={schema_version:FARM_OS_CROP_WORKFORCE_SCHEMA_VERSION,context_type:"field",source_system:"farming_app",reference_id:"field_alpha",reference_version:3,observed_at:"2026-07-24T02:59:00.000Z",freshness_status:"fresh",scope:{scope_type:"field",scope_reference:"field_alpha",valid_from:"2026-07-01T00:00:00.000Z",valid_until:"2026-08-01T00:00:00.000Z"},required_capability:"edit_work_plan"};
const memberReference:FarmOsTypedContextReference={schema_version:FARM_OS_CROP_WORKFORCE_SCHEMA_VERSION,context_type:"workforce_member",source_system:"farming_app",reference_id:"member_alpha",reference_version:4,observed_at:"2026-07-24T02:59:00.000Z",freshness_status:"fresh",scope:{scope_type:"field",scope_reference:"field_alpha",valid_from:"2026-07-01T00:00:00.000Z",valid_until:"2026-08-01T00:00:00.000Z"},required_capability:"assign_staff"};
export const baseDraft:WorkPlanDraft={schema_version:FARM_OS_WORK_PLAN_DRAFT_SCHEMA_VERSION,work_plan_draft_id:"draft_alpha",source_proposal_id:"proposal_alpha",source_approval_id:"approval_alpha",target_reference:targetReference,title:"圃場条件の確認作業",description:"管理者レビュー用の作業予定Draft",planned_date:"2026-07-25",planned_start_time:"09:00",estimated_duration_minutes:60,priority:"normal",status:"review_ready",expected_version:3,created_at:"2026-07-24T02:55:00.000Z",expires_at:"2026-07-25T03:00:00.000Z"};
export const baseCandidate:AssignmentCandidate={schema_version:FARM_OS_ASSIGNMENT_CANDIDATE_SCHEMA_VERSION,assignment_candidate_id:"assignment_alpha",work_plan_draft_id:"draft_alpha",member_reference:memberReference,candidate_reason:"必要能力と予定時間が一致する候補",required_capabilities:["view_field_instructions"],matched_capabilities:["view_field_instructions"],scope,estimated_duration_minutes:60,availability_status:"available",conflict_status:"none",status:"review_ready",created_at:"2026-07-24T02:56:00.000Z",expires_at:"2026-07-25T03:00:00.000Z"};
export const baseAuthority:WorkPlanAssignmentAuthority={actor_id:"actor_admin",actor_active:true,capabilities:["edit_work_plan","assign_staff"],scope,policy_version:FARM_OS_WORK_PLAN_POLICY_VERSION,reauthorized_at:"2026-07-24T02:58:00.000Z",expires_at:"2026-07-24T03:05:00.000Z",proposal_id:"proposal_alpha",proposal_approved:true,proposal_expires_at:"2026-07-25T03:00:00.000Z",approval_id:"approval_alpha",approved_by:"reviewer_alpha",approval_expires_at:"2026-07-25T03:00:00.000Z",target_known:true,target_version:3,evidence_observed_at:"2026-07-24T02:59:00.000Z",draft_snapshot_hash:computeWorkPlanDraftSnapshotHash(baseDraft),candidate_snapshot_hash:computeAssignmentCandidateSnapshotHash(baseCandidate),required_capabilities:["view_field_instructions"],member_id:"member_alpha",member_known:true,member_active:true,participation_active:true,member_capabilities:["view_field_instructions"],member_scope:scope,availability:"available",time_overlap:false,duplicate_assignment:false,workload_minutes:120,workload_limit_minutes:480,source:"authorization_service"};

export function makeRequest(overrides:Record<string,unknown>={}):WorkPlanAssignmentRequest{
  const raw={schema_version:FARM_OS_WORK_PLAN_ASSIGNMENT_SCHEMA_VERSION,request_id:"request_alpha",operation_kind:"assignment_candidate",approved_proposal:{proposal_id:"proposal_alpha",status:"approved",expires_at:"2026-07-25T03:00:00.000Z"},approval_evidence:{approval_id:"approval_alpha",proposal_id:"proposal_alpha",decision:"approved",decided_by:"reviewer_alpha",decided_at:"2026-07-24T02:50:00.000Z",expires_at:"2026-07-25T03:00:00.000Z"},work_plan_draft:structuredClone(baseDraft),assignment_candidate:structuredClone(baseCandidate),requested_by:"actor_admin",requested_at:"2026-07-24T03:00:00.000Z",authority_evidence_ref:"authority_alpha",reauthorization_evidence:{actor_id:"actor_admin",actor_type:"human",capability:"assign_staff",scope,authenticated_at:"2026-07-24T02:57:00.000Z",reauthorized_at:"2026-07-24T02:58:00.000Z",expires_at:"2026-07-24T03:05:00.000Z",policy_version:FARM_OS_WORK_PLAN_POLICY_VERSION,authorization_result:"authorized"},expected_version:3,idempotency_key:"idempotency_alpha",correlation_id:"correlation_alpha",causation_id:"causation_alpha",runtime:"farmos_native_runtime",human_edit_revision:0,business_write_requested:false,external_side_effect_requested:false,...overrides} as unknown as Omit<WorkPlanAssignmentRequest,"request_fingerprint">;
  return{...raw,request_fingerprint:computeWorkPlanRequestFingerprint(raw)};
}
export const authorityPort=(authority:WorkPlanAssignmentAuthority|{state:"not_found"|"unknown"}=baseAuthority)=>({getAuthority:async()=>structuredClone(authority)});
