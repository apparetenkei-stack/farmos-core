import assert from "node:assert/strict";
import {
  parseFarmOsApprovedProposal,
  parseFarmOsApprovedProposalJson,
  type FarmOsApprovedProposal,
} from "../../src/lib/hermes/farm_os_approved_proposal_contract";

const proposal: FarmOsApprovedProposal = {
  schema_version: "farmos.approved.proposal.v1",
  proposal_id: "proposal_fixture_day132",
  proposal_type: "work_log_follow_up",
  proposal_version: 1,
  risk_level: "l2_internal_apply",
  review_result: "approved",
  review_timestamp: "2026-07-21T08:00:00.000Z",
  review_actor: "human_reviewer",
  approval_requirement: "privileged_approval",
  approval_evidence: {
    evidence_id: "approval_fixture_day132",
    approval_requirement: "privileged_approval",
    capabilities: ["approve_internal_execution"],
    approved_at: "2026-07-21T08:00:00.000Z",
    approved_by: "fixture-human-reviewer",
    reauthenticated_at: "2026-07-21T07:59:00.000Z",
  },
  approved_outputs: ["approved_internal_command"],
  source_runtime: "farmos-native-runtime",
  trace: {
    request_id: "request_fixture_day132",
    correlation_id: "correlation_fixture_day132",
    source_event_hash: `sha256:${"a".repeat(64)}`,
  },
  audit: {
    review_audit_reference: "audit_fixture_day132",
    recorded_at: "2026-07-21T08:00:01.000Z",
  },
};

const assertions: Record<string, boolean> = {};
const check = (name: string, condition: boolean) => {
  assertions[name] = condition;
  assert.equal(condition, true, name);
};

check("valid_approved_proposal", parseFarmOsApprovedProposal(proposal).valid);
check(
  "missing_key_rejected",
  parseFarmOsApprovedProposal(({ proposal_id: proposal.proposal_id })).blocked_reason ===
    "invalid_schema",
);
check(
  "unknown_key_rejected",
  parseFarmOsApprovedProposal({ ...proposal, unknown: true }).blocked_reason ===
    "invalid_schema",
);
check(
  "unknown_proposal_rejected",
  parseFarmOsApprovedProposal({ ...proposal, proposal_type: "unknown" })
    .blocked_reason === "unknown_proposal_type",
);
check(
  "wrong_risk_rejected",
  parseFarmOsApprovedProposal({ ...proposal, risk_level: "l3_external_execution" })
    .blocked_reason === "risk_mismatch",
);
check(
  "invalid_trace_rejected",
  parseFarmOsApprovedProposal({
    ...proposal,
    trace: { ...proposal.trace, source_event_hash: "invalid" },
  }).blocked_reason === "invalid_trace",
);
const json = JSON.stringify(proposal);
const duplicateJson = json.replace(
  '"proposal_id":',
  '"proposal_id":"proposal_duplicate_day132","proposal_id":',
);
check("json_parser_valid", parseFarmOsApprovedProposalJson(json).valid);
check(
  "duplicate_field_rejected",
  parseFarmOsApprovedProposalJson(duplicateJson).blocked_reason === "duplicate_field",
);

console.log(JSON.stringify({ assertions, assertion_count: Object.keys(assertions).length }));
