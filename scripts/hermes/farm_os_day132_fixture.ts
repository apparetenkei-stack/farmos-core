import { computeFarmOsProposalIntegrityHash, type FarmOsApprovedProposal } from "../../src/lib/hermes/farm_os_approved_proposal_contract";
import type { FarmOsCommandBuildRequest } from "../../src/lib/hermes/farm_os_approved_command_contract";

export function approvedProposalFixture(): FarmOsApprovedProposal {
  const core = {
    proposal_id:"proposal_fixture_day132",proposal_type:"work_log_follow_up",proposal_version:1,
    source_runtime:"farmos-native-runtime" as const,
    trace:{request_id:"request_fixture_day132",correlation_id:"correlation_fixture_day132",source_event_hash:`sha256:${"a".repeat(64)}`},
  };
  const proposalHash=computeFarmOsProposalIntegrityHash(core);
  return {schema_version:"farmos.approved.proposal.v1",...core,risk_level:"l2_internal_apply",review_result:"approved",review_timestamp:"2026-07-21T08:00:00.000Z",review_actor:"human_reviewer",approval_requirement:"privileged_approval",approval_evidence:{approval_id:"approval_fixture_day132",decision:"approve",review_actor:"human_reviewer",review_timestamp:"2026-07-21T08:00:00.000Z",approved_capabilities:["approve_internal_execution"],approved_output_classes:["approved_internal_command_candidate"],proposal_version:1,proposal_hash:proposalHash},approved_outputs:["approved_internal_command_candidate"],audit:{review_audit_reference:"audit_fixture_day132",recorded_at:"2026-07-21T08:00:01.000Z"}};
}
export function commandBuildRequestFixture(): FarmOsCommandBuildRequest {
  return {schema_version:"farmos.command.build.request.v1",command_class:"approved_internal_command",command_version:1,execution_target:"farmos_internal_contract",execution_payload:{schema_version:"farmos.command.payload.work_log_follow_up.v1",operation:"prepare_work_log_follow_up",proposal_id:"proposal_fixture_day132"},capabilities:["build_approved_command","approve_internal_execution"],built_at:"2026-07-21T08:01:00.000Z",correlation_id:"correlation_fixture_day132",known_command_hashes:[]};
}
