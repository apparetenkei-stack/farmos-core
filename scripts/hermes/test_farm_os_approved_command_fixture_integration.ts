import assert from "node:assert/strict";
import {
  buildFarmOsApprovedCommand,
  parseFarmOsApprovedCommand,
} from "../../src/lib/hermes/farm_os_approved_command_contract";
import {
  parseFarmOsApprovedProposal,
  type FarmOsApprovedProposal,
} from "../../src/lib/hermes/farm_os_approved_proposal_contract";

const base: FarmOsApprovedProposal = {
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
const buildInput = { approved_proposal: base, command_class: "approved_internal_command", capabilities: ["approve_internal_execution"], execution_target_reference: base.proposal_id, parameters: { fixture: true }, built_at: "2026-07-21T08:01:00.000Z" } as const;
type CaseResult = { test_case_id: string; classification: string; allowed: boolean; blocked_reason: string | null; assertion_count: number };
const cases: CaseResult[] = [];
const record = (test_case_id: string, classification: string, allowed: boolean, blocked_reason: string | null, checks: readonly [string, boolean][]) => {
  let assertion_count = 0;
  for (const [name, condition] of checks) { assertion_count += 1; assert.equal(condition, true, `${test_case_id}:${name}`); }
  cases.push({ test_case_id, classification, allowed, blocked_reason, assertion_count });
};
const counters = { command_build_count: 0, command_rejected_count: 0, command_validation_count: 0, gateway_call_count: 0, internal_execution_count: 0, external_execution_count: 0 };
const validateProposal = (value: unknown) => { counters.command_validation_count += 1; return parseFarmOsApprovedProposal(value); };
const runBuild = (input: Parameters<typeof buildFarmOsApprovedCommand>[0]) => { counters.command_validation_count += 1; const result = buildFarmOsApprovedCommand(input); if (result.result === "built") counters.command_build_count += 1; else counters.command_rejected_count += 1; counters.gateway_call_count += result.gateway_call_count; counters.internal_execution_count += result.internal_execution_count; counters.external_execution_count += result.external_execution_count; return result; };

const a = validateProposal(base);
record("A", "approved_proposal", a.valid, a.blocked_reason, [["approved", a.valid], ["review", base.review_result === "approved"]]);
const b = runBuild(buildInput);
record("B", "approved_command", b.result === "built", b.blocked_reason, [["built", b.result === "built"], ["gateway_zero", b.gateway_call_count === 0]]);
const c = validateProposal({ ...base, proposal_type: "unknown" });
record("C", "unknown_proposal", c.valid, c.blocked_reason, [["blocked", !c.valid], ["reason", c.blocked_reason === "unknown_proposal_type"]]);
const d = validateProposal({ ...base, approval_evidence: { ...base.approval_evidence, capabilities: [] } });
record("D", "missing_approval", d.valid, d.blocked_reason, [["blocked", !d.valid], ["reason", d.blocked_reason === "approval_evidence_invalid"]]);
const e = runBuild({ ...buildInput, capabilities: [] });
record("E", "missing_capability", e.result === "built", e.blocked_reason, [["blocked", e.result === "rejected"], ["reason", e.blocked_reason === "missing_required_capability"]]);
const f = validateProposal({ ...base, risk_level: "l3_external_execution" });
record("F", "wrong_risk", f.valid, f.blocked_reason, [["blocked", !f.valid], ["reason", f.blocked_reason === "risk_mismatch"]]);
assert.equal(b.result, "built");
const g = runBuild({ ...buildInput, reserved_command_hashes: [b.command.command_hash] });
record("G", "duplicate_command", g.result === "built", g.blocked_reason, [["blocked", g.result === "rejected"], ["reason", g.blocked_reason === "duplicate_command"]]);
const h = validateProposal({ ...base, schema_version: "invalid" });
record("H", "invalid_schema", h.valid, h.blocked_reason, [["blocked", !h.valid], ["reason", h.blocked_reason === "invalid_schema"]]);
const i = validateProposal({ ...base, trace: { ...base.trace, source_event_hash: "invalid" } });
record("I", "invalid_trace", i.valid, i.blocked_reason, [["blocked", !i.valid], ["reason", i.blocked_reason === "invalid_trace"]]);
const j = runBuild({ ...buildInput, command_class: "unknown" });
record("J", "unknown_command", j.result === "built", j.blocked_reason, [["blocked", j.result === "rejected"], ["reason", j.blocked_reason === "unknown_command_class"]]);

assert.equal(counters.gateway_call_count, 0);
assert.equal(counters.internal_execution_count, 0);
assert.equal(counters.external_execution_count, 0);
if (b.result === "built") assert.equal(parseFarmOsApprovedCommand(b.command).valid, true);
console.log(JSON.stringify({ cases, test_observed_command_build_count: counters.command_build_count, test_observed_command_rejected_count: counters.command_rejected_count, test_observed_command_validation_count: counters.command_validation_count, test_observed_gateway_call_count: counters.gateway_call_count, test_observed_internal_execution_count: counters.internal_execution_count, test_observed_external_execution_count: counters.external_execution_count }));
