import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";
import { Pool } from "pg";
import { baseDraft } from "./farm_os_day145a_fixture";
import {
  FARM_OS_PROPOSAL_PERSISTENCE_CONTRACT_VERSION,
  type PersistCoreProposalCandidateRequest,
} from "../../src/lib/hermes/farm_os_eligible_proposal_persistence";
import {
  createProductionProposalPersistenceComposition,
  createProductionProposalVerificationComposition,
  ProductionProposalExecutionRepositoryAdapter,
  ProductionProposalProjectionTransition,
} from "../../src/lib/hermes/farm_os_eligible_proposal_postgres";
import {
  FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
  ProductionProposalPersistenceWorkloadAuthentication,
  ProductionProposalVerificationWorkloadAuthentication,
  ProductionWorkloadJwtVerifier,
  type WorkloadPublicJwk,
} from "../../src/lib/hermes/farm_os_production_workload_auth";
import {
  FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
  FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
  verifyProposalExecution,
} from "../../src/lib/hermes/farm_os_proposal_execution_verification_contract";
import { computeWorkPlanDraftSnapshotHash } from "../../src/lib/hermes/farm_os_work_plan_assignment_contract";
import { hashFarmOsContract } from "../../src/lib/hermes/farm_os_approved_proposal_contract";

const rawUrl = process.env.DAY145B_CORE_TEST_DATABASE_URL;
assert.ok(rawUrl, "DAY145B_CORE_TEST_DATABASE_URL is required");
const url = new URL(rawUrl);
assert.ok(url.hostname === "localhost" || url.hostname === "127.0.0.1");
assert.ok(url.pathname.slice(1).endsWith("_test"));
const pool = new Pool({ connectionString: rawUrl, max: 3 });
const NOW = "2026-07-26T03:00:00.000Z";
const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
const keyPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
const publicKey: WorkloadPublicJwk = {
  ...keyPair.publicKey.export({ format: "jwk" }),
  kid: "local-es256-fixture",
  alg: "ES256",
  use: "sig",
};
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (input: { audience: string; subject: string; tokenType?: string; key?: KeyObject }) => {
  const header = encode({ typ: "JWT", alg: "ES256", kid: "local-es256-fixture" });
  const now = Math.floor(Date.parse(NOW) / 1000);
  const claims = encode({
    iss: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
    aud: input.audience,
    sub: input.subject,
    token_type: input.tokenType ?? "workload",
    jti: `local-${suffix}`,
    iat: now - 5,
    nbf: now - 5,
    exp: now + 30,
  });
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: input.key ?? keyPair.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${claims}.${signature.toString("base64url")}`;
};
const auth = (audience: typeof FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE | typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE, subject: string, tokenValue: string) =>
  new ProductionWorkloadJwtVerifier(
    { getToken: async () => tokenValue },
    { getKeys: async () => ({ kind: "available" as const, keys: [publicKey] }) },
    { now: async () => NOW },
    { issuer: FARM_OS_PROPOSAL_VERIFICATION_ISSUER, audience, subject, workloadKind: "native_runtime" },
  );
const persistenceSubject = "core-proposal-persistence-workload";
const persistenceToken = jwt({ audience: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE, subject: persistenceSubject });
const persistenceAuth = new ProductionProposalPersistenceWorkloadAuthentication(
  auth(FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE, persistenceSubject, persistenceToken),
);
const draft = {
  ...structuredClone(baseDraft),
  work_plan_draft_id: `draft_${suffix}`,
  source_proposal_id: `source_proposal_${suffix}`,
  source_approval_id: `source_approval_${suffix}`,
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
  created_at: NOW,
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
  created_by_reference: persistenceSubject,
  correlation_id: `correlation_${suffix}`,
  causation_id: `causation_${suffix}`,
  idempotency_key: `idempotency_${suffix}`,
  requested_at: NOW,
};

const before = await pool.query("select count(*)::int as count from ai.proposal_execution_state");
const composition = createProductionProposalPersistenceComposition({
  pool,
  authentication: persistenceAuth,
  eligibleProposalPersistenceEnabled: true,
  proposalExecutionProjectionEnabled: true,
  clock: { now: async () => NOW },
});
const created = await composition.persist(request);
assert.equal(created.result, "created");
assert.equal(composition.fixture_fallback_used, false);
assert.equal(composition.workload_auth_production_adapter_complete, true);
assert.equal(created.result, "created");
if (created.result !== "created") throw new Error("creation_failed");
const proposalId = created.record.proposal_id;
const replay = await composition.persist(request);
assert.equal(replay.result, "already_processed");

const transition = new ProductionProposalProjectionTransition(pool, {
  authorize: async () => ({ kind: "authorized", authority_reference: "local-eligibility-fixture" }),
});
assert.equal((await transition.transition({
  proposalId,
  expectedExecutionStateVersion: 1,
  nextStatus: "review_ready",
  now: NOW,
  reason: "local_review_ready",
})).result, "updated");
assert.equal((await transition.transition({
  proposalId,
  expectedExecutionStateVersion: 2,
  nextStatus: "execution_eligible",
  now: NOW,
  reason: "local_execution_eligible",
})).result, "updated");

const repository = new ProductionProposalExecutionRepositoryAdapter(pool, true);
const repositoryResult = await repository.getCurrentProposalExecutionState(proposalId);
assert.equal(repositoryResult.kind, "found");
if (repositoryResult.kind !== "found") throw new Error("projection_not_found");
assert.equal(repositoryResult.state.proposal_status, "executable");

const verificationToken = jwt({
  audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  subject: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
});
const verificationAuth = new ProductionProposalVerificationWorkloadAuthentication(
  auth(
    FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
    verificationToken,
  ),
);
const verificationComposition = createProductionProposalVerificationComposition({
  projectionEnabled: true,
  database: pool,
  authentication: verificationAuth,
  clock: { now: async () => NOW },
});
const state = repositoryResult.state;
const verification = await verifyProposalExecution({
  request: {
    contract_version: "farmos.proposal-execution-verification.v1",
    verification_id: `verification_${suffix}`,
    operation_id: `operation_${suffix}`,
    proposal_id: proposalId,
    proposal_version: state.proposal_version,
    proposal_snapshot_hash: state.proposal_snapshot_hash,
    operation_type: state.operation_type,
    target_system: state.target_system,
    target_reference: state.target_reference,
    requested_capability: state.required_capability,
    requested_scope: state.scope_constraints,
    fingerprint: hashFarmOsContract({ proposal_id: proposalId, operation: state.operation_type }),
    audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    correlation_id: state.correlation_id,
    causation_id: state.causation_id,
    requested_at: NOW,
  },
  ports: verificationComposition,
});
assert.equal(verification.result.decision, "allowed");

const tampered = await verifyProposalExecution({
  request: {
    contract_version: "farmos.proposal-execution-verification.v1",
    verification_id: `verification_tampered_${suffix}`,
    operation_id: `operation_tampered_${suffix}`,
    proposal_id: proposalId,
    proposal_version: state.proposal_version,
    proposal_snapshot_hash: hashFarmOsContract({ tampered: true }),
    operation_type: state.operation_type,
    target_system: state.target_system,
    target_reference: state.target_reference,
    requested_capability: state.required_capability,
    requested_scope: state.scope_constraints,
    fingerprint: hashFarmOsContract({ proposal_id: proposalId, tampered: true }),
    audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    correlation_id: state.correlation_id,
    causation_id: state.causation_id,
    requested_at: NOW,
  },
  ports: verificationComposition,
});
assert.equal(tampered.result.rejection_code, "PROPOSAL_SNAPSHOT_MISMATCH");

const invalidAuth = new ProductionProposalPersistenceWorkloadAuthentication(
  auth(
    FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
    persistenceSubject,
    jwt({ audience: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE, subject: persistenceSubject, tokenType: "user_session" }),
  ),
);
const rejectedComposition = createProductionProposalPersistenceComposition({
  pool,
  authentication: invalidAuth,
  eligibleProposalPersistenceEnabled: true,
  proposalExecutionProjectionEnabled: true,
  clock: { now: async () => NOW },
});
assert.equal((await rejectedComposition.persist({ ...request, idempotency_key: `invalid_${suffix}` })).result, "rejected");
const disabledComposition = createProductionProposalPersistenceComposition({
  pool,
  authentication: persistenceAuth,
  eligibleProposalPersistenceEnabled: false,
  proposalExecutionProjectionEnabled: true,
  clock: { now: async () => NOW },
});
assert.equal((await disabledComposition.persist({ ...request, idempotency_key: `disabled_${suffix}` })).result, "rejected");
const after = await pool.query("select count(*)::int as count from ai.proposal_execution_state");
assert.equal(after.rows[0].count, before.rows[0].count + 1);

await pool.end();
console.log(JSON.stringify({
  isolated_db_gate: "pass",
  authenticated_creation: "pass",
  idempotent_replay: "pass",
  eligibility_transition: "pass",
  proposal_verification: "allowed",
  invalid_auth_no_write: true,
  flag_off_no_write: true,
  tampered_snapshot_rejected: true,
  credential_logged: false,
  production_write_count: 0,
  linked_db_operation_count: 0,
}));
