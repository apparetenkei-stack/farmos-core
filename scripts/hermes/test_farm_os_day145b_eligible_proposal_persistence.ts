import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  computeAssignmentCandidateSnapshotHash,
  computeWorkPlanDraftSnapshotHash,
} from "../../src/lib/hermes/farm_os_work_plan_assignment_contract";
import { hashFarmOsContract } from "../../src/lib/hermes/farm_os_approved_proposal_contract";
import {
  FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY,
  FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  InMemoryProposalCreationTransaction,
  computeProposalExecutionSnapshotHashV1,
  computeProposalPayloadHash,
  createCoreProposalId,
  parseEligibleProposalPayload,
  persistCoreProposalCandidate,
  transitionProposalExecutionState,
  type EligibleProposalPayload,
  type PersistCoreProposalCandidateRequest,
} from "../../src/lib/hermes/farm_os_eligible_proposal_persistence";
import {
  createProductionProposalPersistenceComposition,
  createProductionProposalVerificationComposition,
  ProductionProposalExecutionRepositoryAdapter,
  type FarmOsPgQueryPort,
} from "../../src/lib/hermes/farm_os_eligible_proposal_postgres";
import {
  parseFarmOsCoreMigrationManifest,
  planFarmOsCoreMigrations,
} from "../../src/lib/hermes/farm_os_core_db_migration_manifest";
import { baseCandidate, baseDraft } from "./farm_os_day145a_fixture";

const NOW = "2026-07-24T03:00:00.000Z";
const UUID = "11111111-2222-4333-8444-555555555555";
const scope = {
  scope_type: "exact_target" as const,
  scope_id: "field_alpha",
  target_reference: "field_alpha",
};
const workPlanPayload = {
  schema_version: "farmos.work-plan-draft-proposal.v1" as const,
  source_candidate_id: baseDraft.work_plan_draft_id,
  source_candidate_schema_version: "farmos.work-plan-draft.v1" as const,
  candidate_snapshot_hash: computeWorkPlanDraftSnapshotHash(baseDraft),
  candidate_payload: structuredClone(baseDraft),
  target_reference: structuredClone(baseDraft.target_reference),
  scope_constraints: scope,
  created_at: NOW,
  expires_at: "2026-07-25T03:00:00.000Z",
};
const assignmentPayload = {
  schema_version: "farmos.assignment-candidate-proposal.v1" as const,
  source_candidate_id: baseCandidate.assignment_candidate_id,
  source_candidate_schema_version: "farmos.assignment-candidate.v1" as const,
  candidate_snapshot_hash: computeAssignmentCandidateSnapshotHash(baseCandidate),
  candidate_payload: structuredClone(baseCandidate),
  target_reference: structuredClone(baseDraft.target_reference),
  scope_constraints: scope,
  created_at: NOW,
  expires_at: "2026-07-25T03:00:00.000Z",
  work_plan_draft_id: baseDraft.work_plan_draft_id,
  work_plan_draft_snapshot_hash: computeWorkPlanDraftSnapshotHash(baseDraft),
};
const confirmationCandidate = {
  payload_kind: "confirmation_task" as const,
  question: "予定日を確認してください",
  reason: "人間による確認が必要です",
  confirmation_type: "planned_date" as const,
  target_reference: {
    reference_type: "field" as const,
    reference_id: "field_alpha",
    reference_version: 1,
    source_system: "farm_os_core" as const,
    observed_at: NOW,
  },
  requested_by_date: "2026-07-25T00:00:00.000Z",
  blocking: false,
};
const confirmationPayload = {
  schema_version: "farmos.confirmation-task-proposal.v1" as const,
  source_candidate_id: "candidate_confirmation_alpha",
  source_candidate_schema_version: "farmos.low-risk-candidate.v1" as const,
  candidate_snapshot_hash: hashFarmOsContract(confirmationCandidate),
  candidate_payload: confirmationCandidate,
  target_reference: structuredClone(confirmationCandidate.target_reference),
  scope_constraints: scope,
  created_at: NOW,
  expires_at: "2026-07-25T03:00:00.000Z",
};
const auth = { authenticate: async () => ({
  kind: "authenticated" as const,
  workload_id: "core_workload",
  workload_kind: "native_runtime" as const,
  issuer: "fixture_issuer",
  audience: "farmos-core.proposal-persistence" as const,
  token_id: "fixture_token_id",
  authenticated_at: NOW,
  expires_at: "2026-07-24T03:01:00.000Z",
}) };
const request = (
  proposalType: PersistCoreProposalCandidateRequest["proposal_type"],
  payload: unknown,
  overrides: Partial<PersistCoreProposalCandidateRequest> = {},
): PersistCoreProposalCandidateRequest => ({
  contract_version: FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  proposal_type: proposalType,
  payload,
  source_system: "farmos_core",
  source_reference:
    typeof payload === "object" &&
    payload !== null &&
    "source_candidate_id" in payload &&
    typeof payload.source_candidate_id === "string"
      ? payload.source_candidate_id
      : "source_candidate_alpha",
  source_version: "source_version_one",
  parent_proposal_id: null,
  created_by_kind: "native_runtime",
  created_by_reference: "core_workload",
  correlation_id: "correlation_alpha",
  causation_id: "causation_alpha",
  idempotency_key: "idempotency_alpha",
  requested_at: NOW,
  ...overrides,
});

let assertions = 0;
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  assertions += 1;
};

const manifestRaw = JSON.parse(readFileSync("db/provisioning/manifest.json", "utf8"));
const manifest = parseFarmOsCoreMigrationManifest(manifestRaw);
check(manifest !== null && manifest.startup_auto_apply === false, "manifest is strict and never auto-applies");
const sql = readFileSync(manifest!.migrations[0]!.apply_script, "utf8");
const postgresSource = readFileSync("src/lib/hermes/farm_os_eligible_proposal_postgres.ts", "utf8");
const checksum = `sha256:${createHash("sha256").update(sql).digest("hex")}`;
check(checksum === manifest!.migrations[0]!.checksum, "manifest checksum matches immutable SQL");
check(sql.includes("create table if not exists core_schema.migration_history"), "migration history schema is created");
check(sql.includes("add column if not exists core_proposal_id"), "inbox change is additive");
check(!/\bupdate\s+ai\.proposal_inbox\b/iu.test(sql), "legacy inbox rows are not backfilled");
check(sql.includes("references ai.proposal_inbox(id) on update restrict on delete restrict"), "projection FK cannot cascade delete");
check(sql.includes("proposal_audit_is_append_only"), "audit mutation is rejected");
check(sql.includes("revoke all on ai.proposal_creation_idempotency"), "PUBLIC access is revoked");
check(sql.includes("create role farmos_core_proposal_writer nologin"), "server roles are NOLOGIN");
check(sql.includes("projected_proposal_review_or_binding_invalid"), "projected inbox binding and review status are guarded");
check(sql.includes("proposal_execution_state_transition_invalid"), "projection transition is database guarded");
check(sql.includes("proposal_type='confirmation_task' and operation_type='confirmation_task_persist'"), "registry binding is constrained in DB");
check(postgresSource.includes("0.500,$9,'low','pending'"), "production INSERT respects existing confidence and risk constraints");
check(postgresSource.includes("returning idempotency_key_hash"), "idempotency completion is checked");
check(postgresSource.includes("where proposal_id=$1 for update"), "supersede state is database authoritative");
check(planFarmOsCoreMigrations({ manifest: manifestRaw, stored: [] }).result === "ready", "new migration is pending");
check(planFarmOsCoreMigrations({ manifest: manifestRaw, stored: [{ migration_id: manifest!.migrations[0]!.migration_id, sequence: manifest!.migrations[0]!.sequence, checksum }] }).result === "already_applied", "duplicate apply is deterministic");
check(planFarmOsCoreMigrations({ manifest: manifestRaw, stored: [{ migration_id: manifest!.migrations[0]!.migration_id, sequence: manifest!.migrations[0]!.sequence, checksum: "sha256:" + "0".repeat(64) }] }).result === "rejected", "checksum mismatch rejects");
check(planFarmOsCoreMigrations({ manifest: manifestRaw, stored: [{ migration_id: "future", sequence: 999999999999, checksum }] }).result === "rejected", "out-of-order migration rejects");

check(createCoreProposalId(UUID) === "proposal_11111111222243338444555555555555", "proposal id canonicalizes UUID");
check(Object.keys(FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY).length === 3, "only three types registered");
check(parseEligibleProposalPayload("confirmation_task", confirmationPayload, NOW) !== null, "confirmation payload accepted");
check(parseEligibleProposalPayload("work_plan_draft", workPlanPayload, NOW) !== null, "work plan payload accepted");
check(parseEligibleProposalPayload("assignment_candidate", assignmentPayload, NOW) !== null, "assignment payload accepted");
check(parseEligibleProposalPayload("work_plan_draft", { ...workPlanPayload, unknown: true }, NOW) === null, "unknown payload field rejected");
check(parseEligibleProposalPayload("work_plan_draft", { ...workPlanPayload, schema_version: "wrong" }, NOW) === null, "schema mismatch rejected");
check(parseEligibleProposalPayload("work_plan_draft", { ...workPlanPayload, expires_at: NOW }, NOW) === null, "expired payload rejected");

const firstStore = new InMemoryProposalCreationTransaction();
const first = await persistCoreProposalCandidate({
  request: request("work_plan_draft", workPlanPayload),
  flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: firstStore,
  now: NOW,
  uuid: UUID,
});
check(first.result === "created", "valid proposal is created");
assert.equal(first.result, "created");
check(first.record.projection.execution_status === "draft", "caller cannot create eligible status");
check(firstStore.rows.inbox.size === 1 && firstStore.rows.projection.size === 1 && firstStore.rows.proposalAudit.length === 1 && firstStore.rows.projectionAudit.length === 1, "atomic creation writes every reference row");

const replay = await persistCoreProposalCandidate({
  request: request("work_plan_draft", workPlanPayload),
  flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: firstStore,
  now: NOW,
  uuid: UUID,
});
check(replay.result === "already_processed", "same key and fingerprint replays");
const conflict = await persistCoreProposalCandidate({
  request: request("work_plan_draft", { ...workPlanPayload, expires_at: "2026-07-26T03:00:00.000Z" }),
  flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: firstStore,
  now: NOW,
  uuid: UUID,
});
check(conflict.result === "rejected" && conflict.rejection_code === "IDEMPOTENCY_CONFLICT", "same key different fingerprint conflicts");
const disabled = await persistCoreProposalCandidate({
  request: request("work_plan_draft", workPlanPayload),
  flags: { eligibleProposalPersistenceEnabled: false, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: new InMemoryProposalCreationTransaction(),
  now: NOW,
});
check(disabled.result === "rejected" && disabled.rejection_code === "FEATURE_DISABLED", "either flag off fails closed");

for (const failure of ["inbox", "projection", "proposal_audit", "projection_audit"] as const) {
  const store = new InMemoryProposalCreationTransaction();
  store.failAt = failure;
  const result = await persistCoreProposalCandidate({
    request: request("work_plan_draft", workPlanPayload),
    flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
    authentication: auth,
    transaction: store,
    now: NOW,
    uuid: UUID,
  });
  check(result.result === "outcome_unknown" && store.rows.inbox.size === 0 && store.rows.projection.size === 0, `${failure} failure rolls back reference transaction`);
}
const outcomeStore = new InMemoryProposalCreationTransaction();
outcomeStore.failAt = "completion";
const unknown = await persistCoreProposalCandidate({
  request: request("work_plan_draft", workPlanPayload),
  flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: outcomeStore,
  now: NOW,
  uuid: UUID,
});
check(unknown.result === "outcome_unknown", "unknown completion is preserved");
outcomeStore.failAt = null;
const unknownRetry = await persistCoreProposalCandidate({
  request: request("work_plan_draft", workPlanPayload),
  flags: { eligibleProposalPersistenceEnabled: true, proposalExecutionProjectionEnabled: true },
  authentication: auth,
  transaction: outcomeStore,
  now: NOW,
  uuid: UUID,
});
check(unknownRetry.result === "outcome_unknown" && unknownRetry.replay, "unknown retry does not duplicate");

const reviewReady = transitionProposalExecutionState({
  current: first.record.projection,
  expectedExecutionStateVersion: 1,
  nextStatus: "review_ready",
  now: NOW,
  reason: "deterministic_review_complete",
});
check(reviewReady.result === "updated", "valid CAS transition succeeds");
assert.equal(reviewReady.result, "updated");
check(transitionProposalExecutionState({ current: reviewReady.state, expectedExecutionStateVersion: 1, nextStatus: "execution_eligible", now: NOW, reason: "stale" }).result === "rejected", "stale CAS rejected");
const eligible = transitionProposalExecutionState({ current: reviewReady.state, expectedExecutionStateVersion: 2, nextStatus: "execution_eligible", now: NOW, reason: "policy_eligible" });
assert.equal(eligible.result, "updated");
check(eligible.state.proposal_snapshot_hash !== reviewReady.state.proposal_snapshot_hash, "status changes execution snapshot");
check(transitionProposalExecutionState({ current: eligible.state, expectedExecutionStateVersion: 3, nextStatus: "review_ready", now: NOW, reason: "reactivate" }).result === "rejected", "terminal-direction reactivation rejected");
check(transitionProposalExecutionState({ current: eligible.state, expectedExecutionStateVersion: 3, nextStatus: "superseded", now: NOW, reason: "self", supersededByProposalId: eligible.state.proposal_id, successorProposalType: eligible.state.proposal_type }).result === "rejected", "self supersede rejected");
check(transitionProposalExecutionState({ current: eligible.state, expectedExecutionStateVersion: 3, nextStatus: "superseded", now: NOW, reason: "cross", supersededByProposalId: "proposal_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", successorProposalType: "confirmation_task" }).result === "rejected", "cross-type supersede rejected");
check(transitionProposalExecutionState({ current: eligible.state, expectedExecutionStateVersion: 3, nextStatus: "superseded", now: NOW, reason: "cycle", supersededByProposalId: "proposal_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", successorProposalType: "work_plan_draft", successorChain: [eligible.state.proposal_id] }).result === "rejected", "supersede cycle rejected");

const payloadHash1 = computeProposalPayloadHash("work_plan_draft", workPlanPayload as EligibleProposalPayload);
const payloadHash2 = computeProposalPayloadHash("work_plan_draft", structuredClone(workPlanPayload) as EligibleProposalPayload);
check(payloadHash1 === payloadHash2, "same normalized payload has same hash");
const orderedScope = { scope_type: "exact_target" as const, target_reference: "field_alpha", scope_id: "field_alpha" };
check(hashFarmOsContract(scope) === hashFarmOsContract(orderedScope), "scope key order is invariant");
const snapshot = {
  snapshot_schema_version: "farmos.proposal-execution-snapshot.v1" as const,
  contract_version: "farmos.proposal-execution-verification.v1" as const,
  proposal_id: first.record.proposal_id,
  proposal_type: "work_plan_draft" as const,
  proposal_version: 1,
  operation_type: "create_work_plan_draft" as const,
  target_system: "farming_app_server_boundary" as const,
  target_reference: "field_alpha",
  required_capability: "edit_work_plan" as const,
  scope_constraints: scope,
  correlation_id: "correlation_alpha",
  causation_id: "causation_alpha",
  expires_at: "2026-07-25T03:00:00.000Z",
  execution_status: "draft" as const,
};
check(computeProposalExecutionSnapshotHashV1(snapshot) !== computeProposalExecutionSnapshotHashV1({ ...snapshot, target_reference: "field_beta" }), "semantic field changes hash");

const row = {
  proposal_id: first.record.proposal_id,
  proposal_type: "work_plan_draft",
  schema_version: "farmos.proposal-execution-state.v1",
  proposal_version: 1,
  execution_state_version: 3,
  execution_status: "execution_eligible",
  proposal_snapshot_hash: eligible.state.proposal_snapshot_hash,
  snapshot_schema_version: "farmos.proposal-execution-snapshot.v1",
  operation_type: "create_work_plan_draft",
  target_system: "farming_app_server_boundary",
  target_reference: "field_alpha",
  required_capability: "edit_work_plan",
  scope_constraints: scope,
  correlation_id: "correlation_alpha",
  causation_id: "causation_alpha",
  expires_at: "2026-07-25T03:00:00.000Z",
  policy_version: "proposal-execution-policy.v1",
  contract_version: "farmos.proposal-execution-verification.v1",
};
const foundDb: FarmOsPgQueryPort = { query: async () => ({ rows: [row] }) };
const found = await new ProductionProposalExecutionRepositoryAdapter(foundDb, true).getCurrentProposalExecutionState(first.record.proposal_id);
check(found.kind === "found" && found.state.repository_state_version === 3, "production adapter maps projection state version");
const missingDb: FarmOsPgQueryPort = { query: async (text) => ({ rows: text.includes("proposal_inbox") ? [{ core_proposal_id: first.record.proposal_id }] : [] }) };
check((await new ProductionProposalExecutionRepositoryAdapter(missingDb, true).getCurrentProposalExecutionState(first.record.proposal_id)).kind === "unknown", "legacy missing projection is unknown");
const unavailableDb: FarmOsPgQueryPort = { query: async () => { throw new Error("database timeout"); } };
check((await new ProductionProposalExecutionRepositoryAdapter(unavailableDb, true).getCurrentProposalExecutionState(first.record.proposal_id)).kind === "unavailable", "database failure is unavailable");
check((await new ProductionProposalExecutionRepositoryAdapter(foundDb, false).getCurrentProposalExecutionState(first.record.proposal_id)).kind === "unavailable", "projection flag off is unavailable");
const composition = createProductionProposalVerificationComposition({
  projectionEnabled: true,
  database: foundDb,
  authentication: null,
  clock: { now: async () => NOW },
});
check(composition.fixture_fallback_used === false && composition.workload_auth_production_adapter_complete === false, "composition has no fixture or credential fallback");
check((await composition.authentication.authenticate()).kind === "unavailable", "missing workload auth fails closed");
const persistenceComposition = createProductionProposalPersistenceComposition({
  pool: null,
  authentication: null,
  eligibleProposalPersistenceEnabled: true,
  proposalExecutionProjectionEnabled: true,
  clock: { now: async () => NOW },
});
const unavailablePersistence = await persistenceComposition.persist(request("work_plan_draft", workPlanPayload));
check(unavailablePersistence.result !== "created" && persistenceComposition.fixture_fallback_used === false, "production creation composition fails closed without auth/database");

console.log(JSON.stringify({
  contract: FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  assertions,
  proposal_types: Object.keys(FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY),
  daily_brief_projection_created: false,
  human_approval_sot: "farming_app",
  production_write_count: 0,
  external_side_effect_count: 0,
}));
