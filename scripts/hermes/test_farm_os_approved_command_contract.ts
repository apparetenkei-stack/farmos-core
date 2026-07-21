import assert from "node:assert/strict";
import {
  buildFarmOsApprovedCommand,
  parseFarmOsApprovedCommand,
} from "../../src/lib/hermes/farm_os_approved_command_contract";
import { createFarmOsExecutionGatewayReservation } from "../../src/lib/hermes/farm_os_execution_gateway_contract";
import type { FarmOsApprovedProposal } from "../../src/lib/hermes/farm_os_approved_proposal_contract";

const proposal: FarmOsApprovedProposal = {
  schema_version: "farmos.approved.proposal.v1", proposal_id: "proposal_fixture_day132",
  proposal_type: "work_log_follow_up", proposal_version: 1,
  risk_level: "l2_internal_apply", review_result: "approved",
  review_timestamp: "2026-07-21T08:00:00.000Z", review_actor: "human_reviewer",
  approval_requirement: "privileged_approval",
  approval_evidence: { evidence_id: "approval_fixture_day132", approval_requirement: "privileged_approval", capabilities: ["approve_internal_execution"], approved_at: "2026-07-21T08:00:00.000Z", approved_by: "fixture-human-reviewer", reauthenticated_at: "2026-07-21T07:59:00.000Z" },
  approved_outputs: ["approved_internal_command"], source_runtime: "farmos-native-runtime",
  trace: { request_id: "request_fixture_day132", correlation_id: "correlation_fixture_day132", source_event_hash: `sha256:${"a".repeat(64)}` },
  audit: { review_audit_reference: "audit_fixture_day132", recorded_at: "2026-07-21T08:00:01.000Z" },
};

const build = () => buildFarmOsApprovedCommand({ approved_proposal: proposal, command_class: "approved_internal_command", capabilities: ["approve_internal_execution"], execution_target_reference: proposal.proposal_id, parameters: { fixture: true }, built_at: "2026-07-21T08:01:00.000Z" });
const assertions: Record<string, boolean> = {};
const check = (name: string, condition: boolean) => { assertions[name] = condition; assert.equal(condition, true, name); };
const result = build();
check("builder_accepts_approved_proposal", result.result === "built");
assert.equal(result.result, "built");
check("command_contract_valid", parseFarmOsApprovedCommand(result.command).valid);
check("reservation_not_persisted", result.reservation.persisted === false);
check("gateway_not_called", result.gateway_call_count === 0);
check("execution_zero", result.internal_execution_count === 0 && result.external_execution_count === 0);
check("tampered_hash_rejected", parseFarmOsApprovedCommand({ ...result.command, command_hash: `sha256:${"b".repeat(64)}` }).blocked_reason === "command_hash_mismatch");
check("unknown_field_rejected", parseFarmOsApprovedCommand({ ...result.command, unknown: true }).blocked_reason === "invalid_schema");
check("rollback_mismatch_rejected", parseFarmOsApprovedCommand({ ...result.command, rollback_class: "discard" }).blocked_reason === "rollback_class_mismatch");
check("command_id_mismatch_rejected", parseFarmOsApprovedCommand({ ...result.command, command_id: "command_invalid_day132" }).blocked_reason === "command_id_mismatch");
check("unknown_command_rejected", buildFarmOsApprovedCommand({ approved_proposal: proposal, command_class: "unknown", capabilities: [], execution_target_reference: proposal.proposal_id, parameters: {}, built_at: "2026-07-21T08:01:00.000Z" }).blocked_reason === "unknown_command_class");
check("arbitrary_target_rejected", buildFarmOsApprovedCommand({ approved_proposal: proposal, command_class: "approved_internal_command", capabilities: ["approve_internal_execution"], execution_target_reference: "arbitrary_target_day132", parameters: {}, built_at: "2026-07-21T08:01:00.000Z" }).blocked_reason === "invalid_execution_target");
const gateway = createFarmOsExecutionGatewayReservation(result.command);
check("gateway_contract_blocked", gateway.result.result_state === "blocked" && gateway.result.gateway_call_performed === false);
check("gateway_request_is_non_execution", gateway.request.execution_requested === false && gateway.request.dry_run_only === true);
const externalProposal: FarmOsApprovedProposal = {
  ...proposal,
  risk_level: "l3_external_execution",
  approval_requirement: "final_confirmation_and_reauthentication",
  approval_evidence: {
    ...proposal.approval_evidence,
    approval_requirement: "final_confirmation_and_reauthentication",
    capabilities: ["approve_external_execution"],
  },
  approved_outputs: ["approved_external_command"],
};
const external = buildFarmOsApprovedCommand({
  approved_proposal: externalProposal,
  command_class: "approved_external_command",
  capabilities: ["approve_external_execution"],
  execution_target_reference: externalProposal.proposal_id,
  parameters: { fixture: true },
  built_at: "2026-07-21T08:01:00.000Z",
});
check(
  "external_class_contract_only",
  external.result === "built" && external.external_execution_count === 0,
);
console.log(JSON.stringify({ assertions, assertion_count: Object.keys(assertions).length }));
