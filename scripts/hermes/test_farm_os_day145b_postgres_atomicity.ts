import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { baseDraft } from "./farm_os_day145a_fixture";
import {
  FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  persistCoreProposalCandidate,
  type ProposalCreationRecord,
  type ProposalCreationTransactionPort,
  type PersistCoreProposalCandidateRequest,
} from "../../src/lib/hermes/farm_os_eligible_proposal_persistence";
import { ProductionProposalCreationTransaction } from "../../src/lib/hermes/farm_os_eligible_proposal_postgres";
import { computeWorkPlanDraftSnapshotHash } from "../../src/lib/hermes/farm_os_work_plan_assignment_contract";

const rawUrl = process.env.DAY145B_CORE_TEST_DATABASE_URL;
const mode = process.env.DAY145B_ATOMICITY_MODE;
assert.ok(rawUrl);
assert.ok(["projection", "audit", "completion"].includes(String(mode)));
const url = new URL(rawUrl);
assert.ok(url.hostname === "localhost" || url.hostname === "127.0.0.1");
assert.ok(url.pathname.slice(1).endsWith("_test"));
const pool = new Pool({ connectionString: rawUrl, max: 2 });
const now = "2026-07-26T03:00:00.000Z";
const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
const draft = {
  ...structuredClone(baseDraft),
  work_plan_draft_id: `draft_atomic_${suffix}`,
  source_proposal_id: `source_atomic_${suffix}`,
  source_approval_id: `approval_atomic_${suffix}`,
  planned_date: "2026-07-27",
  created_at: "2026-07-26T02:55:00.000Z",
  expires_at: "2026-07-27T03:00:00.000Z",
};
const payload = {
  schema_version: "farmos.work-plan-draft-proposal.v1" as const,
  source_candidate_id: draft.work_plan_draft_id,
  source_candidate_schema_version: "farmos.work-plan-draft.v1" as const,
  candidate_snapshot_hash: computeWorkPlanDraftSnapshotHash(draft),
  candidate_payload: draft,
  target_reference: draft.target_reference,
  scope_constraints: {
    scope_type: "exact_target" as const,
    scope_id: draft.target_reference.reference_id,
    target_reference: draft.target_reference.reference_id,
  },
  created_at: now,
  expires_at: "2026-07-27T03:00:00.000Z",
};
const request: PersistCoreProposalCandidateRequest = {
  contract_version: FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  proposal_type: "work_plan_draft",
  payload,
  source_system: "farmos_core",
  source_reference: draft.work_plan_draft_id,
  source_version: "farmos_work_plan_draft_v1",
  parent_proposal_id: null,
  created_by_kind: "native_runtime",
  created_by_reference: "atomicity_fixture_workload",
  correlation_id: `correlation_atomic_${suffix}`,
  causation_id: `causation_atomic_${suffix}`,
  idempotency_key: `idempotency_atomic_${suffix}`,
  requested_at: now,
};
class Capture implements ProposalCreationTransactionPort {
  record: ProposalCreationRecord | null = null;
  async persistAtomically(input: ProposalCreationRecord) {
    this.record = structuredClone(input);
    return { kind: "unavailable" as const };
  }
}
const capture = new Capture();
await persistCoreProposalCandidate({
  request,
  flags: {
    eligibleProposalPersistenceEnabled: true,
    proposalExecutionProjectionEnabled: true,
  },
  authentication: {
    authenticate: async () => ({
      kind: "authenticated",
      workload_id: "atomicity_fixture_workload",
      workload_kind: "native_runtime",
      issuer: "local_fixture",
      audience: "farmos-core.proposal-persistence",
      token_id: `token_${suffix}`,
      authenticated_at: now,
      expires_at: "2026-07-26T03:01:00.000Z",
    }),
  },
  transaction: capture,
  now,
});
assert.ok(capture.record);
const record = capture.record!;
if (mode === "projection") {
  record.projection.operation_type = "invalid_operation" as never;
}
const beforeProjection = await pool.query("select count(*)::int as count from ai.proposal_execution_state");
const beforeAudit = await pool.query("select count(*)::int as count from audit.proposal_creation_events");
const beforeIdempotency = await pool.query("select count(*)::int as count from ai.proposal_creation_idempotency");
const result = await new ProductionProposalCreationTransaction(pool).persistAtomically(record);
assert.notEqual(result.kind, "created");
const afterProjection = await pool.query("select count(*)::int as count from ai.proposal_execution_state");
const afterAudit = await pool.query("select count(*)::int as count from audit.proposal_creation_events");
const afterIdempotency = await pool.query("select count(*)::int as count from ai.proposal_creation_idempotency");
assert.deepEqual(afterProjection.rows, beforeProjection.rows);
assert.deepEqual(afterAudit.rows, beforeAudit.rows);
assert.deepEqual(afterIdempotency.rows, beforeIdempotency.rows);
await pool.end();
console.log(JSON.stringify({
  mode,
  adapter_result: result.kind,
  partial_projection_count: 0,
  partial_audit_count: 0,
  partial_idempotency_count: 0,
  credential_logged: false,
}));
