import assert from "node:assert/strict";
import {
  InMemoryWorkPlanAssignmentStore,
  computeAssignmentCandidateSnapshotHash,
  computeWorkPlanDraftSnapshotHash,
  computeWorkPlanRequestFingerprint,
  createWorkPlanObserverFinding,
  parseAssignmentCandidate,
  parseWorkPlanCommandDraft,
  parseWorkPlanDraft,
  simulateWorkPlanAssignmentApply,
  type WorkPlanAssignmentAuthority,
  type WorkPlanAssignmentRequest,
} from "../../src/lib/hermes/farm_os_work_plan_assignment_contract";
import { DAY145A_NOW, authorityPort, baseAuthority, baseCandidate, baseDraft, makeRequest } from "./farm_os_day145a_fixture";

const assertions:string[]=[];
const seal=(request:WorkPlanAssignmentRequest)=>({...request,request_fingerprint:computeWorkPlanRequestFingerprint(request)}) as WorkPlanAssignmentRequest;
const boundAuthority=(request:WorkPlanAssignmentRequest,overrides:Partial<WorkPlanAssignmentAuthority>={}):WorkPlanAssignmentAuthority=>({...baseAuthority,draft_snapshot_hash:computeWorkPlanDraftSnapshotHash(request.work_plan_draft),candidate_snapshot_hash:request.assignment_candidate?computeAssignmentCandidateSnapshotHash(request.assignment_candidate):null,...overrides});
const run=async(request:WorkPlanAssignmentRequest,authority:WorkPlanAssignmentAuthority|{state:"not_found"|"unknown"}=baseAuthority,store=new InMemoryWorkPlanAssignmentStore())=>simulateWorkPlanAssignmentApply({request,authority_port:authorityPort(authority),store,now:DAY145A_NOW});
const reject=async(name:string,request:WorkPlanAssignmentRequest,code:string,authority:WorkPlanAssignmentAuthority|{state:"not_found"|"unknown"}=baseAuthority)=>{const result=await run(request,authority);assert.equal(result.rejection_code,code,name);assert.equal(result.command_draft,null);assert.equal(result.audit.business_write_performed,false);assert.equal(result.audit.external_side_effect_performed,false);assertions.push(name)};

assert.ok(parseWorkPlanDraft(baseDraft));assertions.push("draft_valid");
assert.equal(parseWorkPlanDraft({...baseDraft,status:"confirmed"}),null);assertions.push("draft_confirmed_separation");
assert.ok(parseWorkPlanDraft({...baseDraft,status:"confirmed"},{coreGenerated:false}));assertions.push("confirmed_reference_only");
assert.ok(parseAssignmentCandidate(baseCandidate));assertions.push("candidate_valid");
const store=new InMemoryWorkPlanAssignmentStore(),valid=await run(makeRequest(),baseAuthority,store);
assert.equal(valid.result,"draft_ready");assert.ok(valid.command_draft&&parseWorkPlanCommandDraft(valid.command_draft));assert.equal(valid.command_draft?.command_type,"assignment_candidate");assert.equal(valid.audit.authority_result,"authorized");assertions.push("approved_assignment_ready");
const draftOnly=makeRequest({request_id:"request_draft",operation_kind:"create_work_plan_draft",assignment_candidate:null,reauthorization_evidence:{...makeRequest().reauthorization_evidence,capability:"edit_work_plan"},idempotency_key:"idempotency_draft"});const draftOnlyResult=await run(draftOnly,boundAuthority(draftOnly),new InMemoryWorkPlanAssignmentStore());assert.equal(draftOnlyResult.result,"draft_ready");assert.equal(draftOnlyResult.command_draft?.command_type,"create_work_plan_draft");assertions.push("edit_work_plan_draft_ready");
const replay=await run(makeRequest(),baseAuthority,store);assert.equal(replay.result,"already_processed");assert.equal(store.counters.command_draft_count,1);assertions.push("same_key_replay");
const edited=makeRequest({request_id:"request_edited",idempotency_key:"idempotency_edited",human_edit_revision:1,work_plan_draft:{...baseDraft,planned_start_time:"10:00",title:"人間編集後の確認作業"},assignment_candidate:{...baseCandidate,candidate_reason:"管理者が理由を編集し再検証"}});const editedResult=await run(edited,boundAuthority(edited),new InMemoryWorkPlanAssignmentStore());assert.equal(editedResult.result,"draft_ready");assert.equal(editedResult.audit.human_edit_revalidated,true);assertions.push("human_edit_revalidated");

await reject("proposal_not_approved",seal({...makeRequest(),approved_proposal:{...makeRequest().approved_proposal,status:"pending" as "approved"}}),"proposal_not_approved");
await reject("proposal_expired",seal({...makeRequest(),approved_proposal:{...makeRequest().approved_proposal,expires_at:"2026-07-24T02:59:00.000Z"}}),"proposal_expired");
await reject("approval_missing",{...makeRequest(),approval_evidence:null as never},"approval_missing");
await reject("approval_expired",seal({...makeRequest(),approval_evidence:{...makeRequest().approval_evidence,expires_at:"2026-07-24T02:59:00.000Z"}}),"approval_expired");
await reject("reauthorization_missing",seal({...makeRequest(),reauthorization_evidence:null as never}),"reauthorization_missing");
await reject("actor_inactive",makeRequest(), "actor_inactive",{...baseAuthority,actor_active:false});
await reject("assign_staff_missing",makeRequest(),"capability_missing",{...baseAuthority,capabilities:["edit_work_plan"]});
await reject("edit_work_plan_missing",draftOnly,"capability_missing",{...baseAuthority,capabilities:["assign_staff"]});
await reject("scope_mismatch",makeRequest(),"scope_mismatch",{...baseAuthority,scope:"farming_app:field:field_beta:1"});
await reject("target_unknown",makeRequest(),"target_unknown",{...baseAuthority,target_known:false});
await reject("member_unknown",makeRequest(),"member_unknown",{...baseAuthority,member_known:false});
await reject("member_inactive",makeRequest(),"member_inactive",{...baseAuthority,member_active:false});
await reject("participation_inactive",makeRequest(),"participation_inactive",{...baseAuthority,participation_active:false});
await reject("availability_unknown",makeRequest(),"availability_unknown",{...baseAuthority,availability:"unknown"});
await reject("member_unavailable",makeRequest(),"member_unavailable",{...baseAuthority,availability:"unavailable"});
await reject("capability_mismatch",makeRequest(),"capability_mismatch",{...baseAuthority,member_capabilities:[]});
await reject("authoritative_required_capability_mismatch",makeRequest(),"capability_mismatch",{...baseAuthority,required_capabilities:["record_own_work"]});
await reject("time_overlap",makeRequest(),"time_overlap",{...baseAuthority,time_overlap:true});
await reject("duplicate_assignment_authority",makeRequest(),"duplicate_assignment",{...baseAuthority,duplicate_assignment:true});
await reject("workload_exceeded",makeRequest(),"workload_exceeded",{...baseAuthority,workload_minutes:450});
await reject("stale_expected_version",makeRequest(),"stale_expected_version",{...baseAuthority,target_version:2});
await reject("reauthorization_expired",{...makeRequest(),reauthorization_evidence:{...makeRequest().reauthorization_evidence,expires_at:"2026-07-24T02:59:00.000Z"}},"reauthorization_expired",{...baseAuthority,expires_at:"2026-07-24T02:59:00.000Z"});
await reject("authority_missing",makeRequest(),"authority_unavailable",{state:"not_found"});
await reject("hermes_direct_execution",seal({...makeRequest(),runtime:"hermes"}),"hermes_direct_execution");
await reject("business_write_attempt",seal({...makeRequest(),business_write_requested:true as false}),"business_write_attempt_detected");
await reject("external_side_effect_attempt",seal({...makeRequest(),external_side_effect_requested:true as false}),"external_side_effect_attempt_detected");
await reject("invalid_identifier",seal({...makeRequest(),request_id:"!"}),"invalid_identifier");
await reject("invalid_timestamp",seal({...makeRequest(),requested_at:"not-time"}),"invalid_timestamp");
await reject("future_requested_at",seal({...makeRequest(),requested_at:"2026-07-24T03:01:00.000Z"}),"invalid_timestamp");
await reject("unknown_field",seal({...makeRequest(),unexpected:true} as WorkPlanAssignmentRequest),"unknown_field");
await reject("authoritative_status_input",seal({...makeRequest(),work_plan_draft:{...baseDraft,status:"confirmed"}}),"draft_invalid");
await reject("candidate_rejected_status",seal({...makeRequest(),assignment_candidate:{...baseCandidate,status:"rejected"}}),"assignment_candidate_invalid");
const unknownAvailability=seal({...makeRequest(),assignment_candidate:{...baseCandidate,availability_status:"unknown"}});await reject("candidate_availability_unknown",unknownAvailability,"availability_unknown",boundAuthority(unknownAvailability));
const unknownConflict=seal({...makeRequest(),assignment_candidate:{...baseCandidate,conflict_status:"unknown"}});await reject("candidate_conflict_unknown",unknownConflict,"evidence_stale",boundAuthority(unknownConflict));
await reject("candidate_expired",seal({...makeRequest(),assignment_candidate:{...baseCandidate,expires_at:"2026-07-24T02:59:00.000Z"}}),"evidence_stale");
await reject("candidate_duration_mismatch",seal({...makeRequest(),assignment_candidate:{...baseCandidate,estimated_duration_minutes:1}}),"assignment_candidate_invalid");
await reject("target_capability_binding",seal({...makeRequest(),work_plan_draft:{...baseDraft,target_reference:{...baseDraft.target_reference,required_capability:"assign_staff"}}}),"capability_mismatch");
const authoritativeCommand={...valid.command_draft,command_type:"assign_member"};assert.equal(parseWorkPlanCommandDraft(authoritativeCommand),null);assertions.push("authoritative_command_forbidden");
assert.equal(parseWorkPlanCommandDraft({...valid.command_draft,payload:{...valid.command_draft?.payload,unexpected:true}}),null);assertions.push("command_payload_unknown_rejected");
await reject("draft_snapshot_hash_mismatch",makeRequest(),"authority_mismatch",{...baseAuthority,draft_snapshot_hash:"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"});
await reject("candidate_snapshot_hash_mismatch",makeRequest(),"authority_mismatch",{...baseAuthority,candidate_snapshot_hash:"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"});

const conflictStore=new InMemoryWorkPlanAssignmentStore();await run(makeRequest(),baseAuthority,conflictStore);const conflict=makeRequest({assignment_candidate:{...baseCandidate,candidate_reason:"異なるfingerprint"},request_id:"request_conflict"});const conflictResult=await run(conflict,boundAuthority(conflict),conflictStore);assert.equal(conflictResult.rejection_code,"idempotency_conflict");assertions.push("idempotency_conflict");
const duplicateStore=new InMemoryWorkPlanAssignmentStore();await run(makeRequest(),baseAuthority,duplicateStore);const duplicateDraft=makeRequest({request_id:"request_duplicate",idempotency_key:"idempotency_duplicate"});assert.equal((await run(duplicateDraft,baseAuthority,duplicateStore)).rejection_code,"duplicate_draft");assertions.push("duplicate_draft");
const reuseStore=new InMemoryWorkPlanAssignmentStore();await run(makeRequest(),baseAuthority,reuseStore);const betaDraft={...baseDraft,work_plan_draft_id:"draft_beta",source_proposal_id:"proposal_beta"};const reuse=makeRequest({request_id:"request_reuse",idempotency_key:"idempotency_reuse",approved_proposal:{proposal_id:"proposal_beta",status:"approved",expires_at:"2026-07-25T03:00:00.000Z"},approval_evidence:{...makeRequest().approval_evidence,proposal_id:"proposal_beta"},work_plan_draft:betaDraft,assignment_candidate:{...baseCandidate,assignment_candidate_id:"assignment_beta",work_plan_draft_id:"draft_beta"}});const betaAuthority=boundAuthority(reuse,{proposal_id:"proposal_beta"});assert.equal((await run(reuse,betaAuthority,reuseStore)).rejection_code,"approval_reused");assertions.push("approval_reuse");

const timeoutResult=await simulateWorkPlanAssignmentApply({request:makeRequest(),authority_port:{getAuthority:()=>new Promise(()=>undefined)},store:new InMemoryWorkPlanAssignmentStore(),now:DAY145A_NOW});assert.equal(timeoutResult.result,"outcome_unknown");assert.equal(timeoutResult.audit.authoritative_state_required,true);assert.equal(timeoutResult.command_draft,null);assertions.push("timeout_state_refetch");
assert.equal(valid.findings.length,0);const workload=await run(makeRequest(),{...baseAuthority,workload_minutes:450});assert.equal(workload.findings[0]?.automatic_policy_adoption,false);assert.equal(workload.findings[0]?.automatic_skill_adoption,false);assertions.push("observer_candidate_only");
const disagreement=createWorkPlanObserverFinding("runtime_disagreement",baseDraft,baseCandidate,"correlation_alpha");assert.equal(disagreement.candidate_only,true);assert.equal(disagreement.automatic_policy_adoption,false);assertions.push("runtime_disagreement_traceable");
assert.deepEqual(store.counters,{reservation_count:2,command_draft_count:1,production_execution_count:0,business_write_count:0,external_side_effect_count:0});assertions.push("zero_effects");

console.log(JSON.stringify({schema_version:"farmos.day145a.fixture-report.v1",fixture_count:assertions.length,pass_count:assertions.length,fail_count:0,assertions,production_execution_count:0,business_write_count:0,external_side_effect_count:0,hermes_direct_execution_count:0,observer_auto_adoption_count:0}));
