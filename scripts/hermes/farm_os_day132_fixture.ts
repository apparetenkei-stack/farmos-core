import { computeFarmOsConfirmationScopeHash,computeFarmOsProposalIntegrityHash,type FarmOsApprovedProposal,type FarmOsProposalIntegrityMaterial } from "../../src/lib/hermes/farm_os_approved_proposal_contract";
import type { FarmOsCommandBuildRequest } from "../../src/lib/hermes/farm_os_approved_command_contract";

export function approvedProposalFixture(): FarmOsApprovedProposal {
  const now=Date.now();const reviewTimestamp=new Date(now-120_000).toISOString();
  const core = {
    proposal_id:"proposal_fixture_day132",proposal_type:"work_log_follow_up",proposal_version:1,
    source_runtime:"farmos-native-runtime" as const,
    trace:{request_id:"request_fixture_day132",correlation_id:"correlation_fixture_day132",source_event_hash:`sha256:${"a".repeat(64)}`},
  };
  const material:FarmOsProposalIntegrityMaterial={...core,risk_level:"l2_internal_apply",approval_requirement:"privileged_approval",approved_outputs:["approved_internal_command_candidate"],approved_capabilities:["approve_internal_execution"],review_result:"approved",review_actor:"human_reviewer",review_timestamp:reviewTimestamp,approval_id:"approval_fixture_day132",decision:"approve",reauthentication_evidence:null};
  const proposalHash=computeFarmOsProposalIntegrityHash(material);
  return {schema_version:"farmos.approved.proposal.v1",...core,risk_level:material.risk_level,review_result:material.review_result,review_timestamp:material.review_timestamp,review_actor:material.review_actor,approval_requirement:material.approval_requirement,approval_evidence:{approval_id:material.approval_id,decision:material.decision,review_actor:material.review_actor,review_timestamp:material.review_timestamp,approved_capabilities:material.approved_capabilities,approved_output_classes:material.approved_outputs,proposal_version:1,proposal_hash:proposalHash,reauthentication_evidence:null},approved_outputs:["approved_internal_command_candidate"],audit:{review_audit_reference:"audit_fixture_day132",recorded_at:new Date(now-90_000).toISOString()}};
}
export function externalApprovedProposalFixture():FarmOsApprovedProposal{
  const base=approvedProposalFixture();const material:FarmOsProposalIntegrityMaterial={proposal_id:base.proposal_id,proposal_type:base.proposal_type,proposal_version:base.proposal_version,risk_level:"l3_external_execution",approval_requirement:"final_confirmation_and_reauthentication",approved_outputs:["approved_external_command_candidate"],approved_capabilities:["approve_external_execution"],source_runtime:base.source_runtime,trace:base.trace,review_result:"approved",review_actor:"human_reviewer",review_timestamp:base.review_timestamp,approval_id:"approval_external_day132",decision:"approve",reauthentication_evidence:null};
  const now=Date.now();const scopeHash=computeFarmOsConfirmationScopeHash(material);material.reauthentication_evidence={reauthenticated_actor:"human_reviewer",reauthenticated_at:new Date(now-60_000).toISOString(),reauthentication_method:"human_session_reauthentication",final_confirmation_at:new Date(now-30_000).toISOString(),confirmation_scope_hash:scopeHash};
  const proposalHash=computeFarmOsProposalIntegrityHash(material);return{...base,risk_level:material.risk_level,approval_requirement:material.approval_requirement,approved_outputs:["approved_external_command_candidate"],approval_evidence:{approval_id:material.approval_id,decision:"approve",review_actor:"human_reviewer",review_timestamp:material.review_timestamp,approved_capabilities:material.approved_capabilities,approved_output_classes:material.approved_outputs,proposal_version:material.proposal_version,proposal_hash:proposalHash,reauthentication_evidence:material.reauthentication_evidence},audit:{...base.audit,recorded_at:new Date(now-15_000).toISOString()}};
}
export function commandBuildRequestFixture(): FarmOsCommandBuildRequest {
  return {schema_version:"farmos.command.build.request.v1",command_class:"approved_internal_command",command_version:1,execution_target:"farmos_internal_contract",execution_payload:{schema_version:"farmos.command.payload.work_log_follow_up.v1",operation:"prepare_work_log_follow_up",proposal_id:"proposal_fixture_day132"},expected_business_version:7,capabilities:["build_approved_command","approve_internal_execution"],built_at:new Date().toISOString(),correlation_id:"correlation_fixture_day132",known_command_hashes:[]};
}
