import assert from "node:assert/strict";

import {
  executeHermesDailyFarmBriefProposalReviewDecision,
  normalizeHermesDailyFarmBriefProposalReviewNote,
  parseHermesDailyFarmBriefProposalReviewDecisionRequest,
  prepareHermesDailyFarmBriefProposalReviewDecision,
  resolveHermesDailyFarmBriefProposalReviewTransition,
  type DailyFarmBriefProposalReviewDecisionRepository,
  type ProposalReviewDecisionRepositoryCommand,
  type ProposalReviewDecisionRepositoryResult,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

const SAFE_REF = "daily_brief_proposal_0123456789abcdef01234567";
const RAW_UUID = "14711111-88db-41fd-a048-1c37266fd9e1";
const RAW_PRINCIPAL = "day128-administrator-fixture";
const UPDATED_AT = "2026-07-18T01:00:00.000Z";
const NOW = "2026-07-18T02:00:00.000Z";

const AUTHENTICATION = {
  schema_version: "hermes.daily_farm_brief.authentication_result.v1",
  status: "authenticated",
  principal_ref: RAW_PRINCIPAL,
};
const ADMINISTRATOR = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
  principal_ref: RAW_PRINCIPAL,
  role: "administrator",
  allowed_scope_keys: [],
  authorization_verified: true,
};

function request(
  decision: "approve" | "reject" | "request_revision" = "approve",
) {
  return {
    proposal_ref: SAFE_REF,
    decision,
    review_note: "確認内容と根拠を確認しました。\n管理者判断として記録します。",
    expected_status: "pending",
    expected_updated_at: UPDATED_AT,
  };
}

function currentState(overrides: Record<string, unknown> = {}) {
  return {
    proposal_ref: SAFE_REF,
    current_status: "pending",
    current_updated_at: UPDATED_AT,
    expires_at: "2026-07-19T00:00:00.000Z",
    applied_at: null,
    applied_by: null,
    protected_fixture: false,
    ...overrides,
  };
}

type FakeMode =
  | "success"
  | "stale"
  | "not_found"
  | "protected"
  | "invalid_transition"
  | "expired"
  | "update_zero"
  | "update_multiple"
  | "audit_zero"
  | "audit_multiple"
  | "audit_exception";

class AtomicFakeRepository
  implements DailyFarmBriefProposalReviewDecisionRepository
{
  calls = 0;
  proposalUpdateCount = 0;
  auditInsertCount = 0;
  transactionCommitted = false;
  rollbackCount = 0;
  retryCount = 0;
  persistedStatus = "pending";
  persistedAuditCount = 0;
  lastCommand: ProposalReviewDecisionRepositoryCommand | null = null;

  constructor(private readonly mode: FakeMode = "success") {}

  async recordProposalReviewDecision(
    command: ProposalReviewDecisionRepositoryCommand,
  ): Promise<ProposalReviewDecisionRepositoryResult> {
    this.calls += 1;
    this.lastCommand = structuredClone(command);
    if (this.mode === "stale") {
      this.rollbackCount += 1;
      return { result: "stale" };
    }
    if (this.mode === "not_found") return { result: "not_found" };
    if (this.mode === "protected") return { result: "protected" };
    if (this.mode === "invalid_transition") {
      return { result: "invalid_transition" };
    }
    if (this.mode === "expired") return { result: "expired" };

    const updateCount =
      this.mode === "update_zero"
        ? 0
        : this.mode === "update_multiple"
          ? 2
          : 1;
    this.proposalUpdateCount = updateCount;
    if (updateCount !== 1) {
      this.rollbackCount += 1;
      return { result: "atomic_write_failed" };
    }

    if (this.mode === "audit_exception") {
      this.rollbackCount += 1;
      throw new Error("fixture-sensitive-database-error");
    }
    const auditCount =
      this.mode === "audit_zero" ? 0 : this.mode === "audit_multiple" ? 2 : 1;
    this.auditInsertCount = auditCount;
    if (auditCount !== 1) {
      this.rollbackCount += 1;
      return { result: "atomic_write_failed" };
    }

    this.persistedStatus = command.nextStatus;
    this.persistedAuditCount = 1;
    this.transactionCommitted = true;
    return {
      result: "recorded",
      previousStatus: "pending",
      nextStatus: command.nextStatus,
      updatedAt: command.newUpdatedAt,
      proposalUpdateCount: 1,
      auditInsertCount: 1,
      transactionCommitted: true,
      retryCount: 0,
    };
  }
}

function execute(overrides: {
  request?: unknown;
  authentication?: unknown;
  actor?: unknown;
  state?: unknown | null;
  clock?: () => string;
  repository?: DailyFarmBriefProposalReviewDecisionRepository;
} = {}) {
  return executeHermesDailyFarmBriefProposalReviewDecision({
    request: overrides.request ?? request(),
    authentication: overrides.authentication ?? AUTHENTICATION,
    actor: overrides.actor ?? ADMINISTRATOR,
    currentState: overrides.state === undefined ? currentState() : overrides.state,
    clock: overrides.clock ?? (() => NOW),
    repository: overrides.repository ?? new AtomicFakeRepository(),
  });
}

async function main() {
  for (const [decision, nextStatus, internal] of [
    ["approve", "approved", "approve_review"],
    ["reject", "rejected", "reject_review"],
    ["request_revision", "needs_revision", "request_revision"],
  ] as const) {
    const repository = new AtomicFakeRepository();
    const result = await execute({
      request: request(decision),
      repository,
    });
    assert.equal(result.result, "ok");
    if (result.result !== "ok") throw new Error("valid decision rejected");
    assert.equal(result.status, nextStatus);
    assert.equal(result.decision, decision);
    assert.equal(result.reviewed_at, NOW);
    assert.equal(repository.persistedStatus, nextStatus);
    assert.equal(repository.persistedAuditCount, 1);
    assert.equal(repository.proposalUpdateCount, 1);
    assert.equal(repository.auditInsertCount, 1);
    assert.equal(repository.transactionCommitted, true);
    assert.equal(repository.retryCount, 0);
    assert.equal(repository.lastCommand?.auditCandidate.internalDecisionType, internal);
    assert.equal(repository.lastCommand?.auditCandidate.decidedAt, NOW);
    assert.equal(repository.lastCommand?.auditCandidate.createdAt, NOW);
    assert.equal(repository.lastCommand?.newUpdatedAt, NOW);
  }

  for (const decision of [
    "approved",
    "rejected",
    "needs_revision",
    "approve_review",
    "reject_review",
    "defer_review",
    "apply",
    "cancel",
    "",
    "APPROVE",
  ]) {
    assert.equal(
      parseHermesDailyFarmBriefProposalReviewDecisionRequest({
        ...request(),
        decision,
      }),
      null,
    );
  }
  assert.equal(
    parseHermesDailyFarmBriefProposalReviewDecisionRequest({
      ...request(),
      unexpected: true,
    }),
    null,
  );
  assert.equal(
    parseHermesDailyFarmBriefProposalReviewDecisionRequest({
      ...request(),
      proposal_ref: RAW_UUID,
    }),
    null,
  );
  for (const proposal_ref of [
    "",
    ` ${SAFE_REF}`,
    `${SAFE_REF} `,
    "daily_brief_proposal_ABCDEF0123456789ABCDEF01",
    "daily_brief_proposal_0123",
    "proposal_0123456789abcdef01234567",
  ]) {
    assert.equal(
      parseHermesDailyFarmBriefProposalReviewDecisionRequest({
        ...request(),
        proposal_ref,
      }),
      null,
    );
  }

  for (const review_note of [
    "",
    "   \n  ",
    "a".repeat(1001),
    "NUL\u0000value",
    "tab\tvalue",
    "<script>alert(1)</script>",
    "<div>HTML</div>",
    "bidi\u202evalue",
    "replacement\ufffdvalue",
  ]) {
    assert.equal(
      parseHermesDailyFarmBriefProposalReviewDecisionRequest({
        ...request(),
        review_note,
      }),
      null,
    );
  }
  const multiline = normalizeHermesDailyFarmBriefProposalReviewNote(
    "  日本語の確認理由です。\n二行目も有効です。  ",
  );
  assert.equal(multiline, "日本語の確認理由です。\n二行目も有効です。");
  assert.equal(
    normalizeHermesDailyFarmBriefProposalReviewNote("  e\u0301  "),
    "é",
  );
  assert.equal(
    normalizeHermesDailyFarmBriefProposalReviewNote("値は < 5 > です。"),
    "値は < 5 > です。",
  );

  for (const malformed of [
    (({ expected_status: _removed, ...rest }) => rest)(request()),
    { ...request(), expected_status: "approved" },
    (({ expected_updated_at: _removed, ...rest }) => rest)(request()),
    { ...request(), expected_updated_at: "2026-07-18T01:00:00" },
    { ...request(), expected_updated_at: "not-a-date" },
    { ...request(), expected_updated_at: ` ${UPDATED_AT}` },
    { ...request(), requested_at: NOW },
    { ...request(), reviewed_by: RAW_PRINCIPAL },
    { ...request(), role: "administrator" },
  ]) {
    assert.equal(
      parseHermesDailyFarmBriefProposalReviewDecisionRequest(malformed),
      null,
    );
  }

  const unauthenticated = await execute({
    authentication: {
      schema_version: "hermes.daily_farm_brief.authentication_result.v1",
      status: "unauthenticated",
      principal_ref: null,
    },
  });
  assert.equal(unauthenticated.error, "authentication_required");
  const staff = await execute({
    actor: {
      ...ADMINISTRATOR,
      role: "general_staff",
      allowed_scope_keys: ["scope_field_aaaaaaaaaaaaaaaaaaaaaaaa"],
    },
  });
  assert.equal(staff.error, "access_forbidden");
  assert.equal(
    (await execute({ actor: { ...ADMINISTRATOR, principal_ref: "other" } })).error,
    "access_forbidden",
  );
  assert.equal(
    (
      await execute({
        actor: {
          ...ADMINISTRATOR,
          allowed_scope_keys: ["scope_field_aaaaaaaaaaaaaaaaaaaaaaaa"],
        },
      })
    ).error,
    "access_forbidden",
  );

  assert.equal(
    (await execute({ state: currentState({ current_status: "expired" }) })).error,
    "proposal_expired",
  );
  assert.equal(
    (await execute({ state: currentState({ expires_at: NOW }) })).error,
    "proposal_expired",
  );
  assert.equal(
    (
      await execute({
        state: currentState({
          current_status: "applied",
          applied_at: "2026-07-18T01:30:00.000Z",
          applied_by: "internal-reviewer",
        }),
      })
    ).error,
    "invalid_transition",
  );
  assert.equal(
    (await execute({ state: currentState({ protected_fixture: true }) })).error,
    "proposal_protected",
  );
  for (const current_status of ["needs_revision", "approved", "rejected"]) {
    assert.equal(
      (await execute({ state: currentState({ current_status }) })).error,
      "invalid_transition",
    );
  }
  assert.equal(
    (
      await execute({
        state: currentState({
          current_updated_at: "2026-07-18T01:00:00.001Z",
        }),
      })
    ).error,
    "stale_proposal",
  );
  const staleBeforeRepository = new AtomicFakeRepository();
  assert.equal(
    (
      await execute({
        state: currentState({
          current_updated_at: "2026-07-18T01:00:00.001Z",
        }),
        repository: staleBeforeRepository,
      })
    ).error,
    "stale_proposal",
  );
  assert.equal(staleBeforeRepository.calls, 0);
  assert.equal(
    (await execute({ state: null })).error,
    "proposal_not_found",
  );
  assert.equal(
    (await execute({ clock: () => "not-a-date" })).error,
    "review_decision_unavailable",
  );
  assert.equal(
    resolveHermesDailyFarmBriefProposalReviewTransition({
      currentStatus: "needs_revision",
      decision: "approve",
    }),
    null,
  );

  const raceStale = new AtomicFakeRepository("stale");
  assert.equal(
    (await execute({ repository: raceStale })).error,
    "stale_proposal",
  );
  assert.equal(raceStale.proposalUpdateCount, 0);
  assert.equal(raceStale.auditInsertCount, 0);
  assert.equal(raceStale.transactionCommitted, false);
  assert.equal(raceStale.rollbackCount, 1);
  for (const mode of ["update_zero", "update_multiple"] as const) {
    const repository = new AtomicFakeRepository(mode);
    const result = await execute({ repository });
    assert.equal(result.error, "review_decision_unavailable");
    assert.equal(repository.auditInsertCount, 0);
    assert.equal(repository.transactionCommitted, false);
    assert.equal(repository.persistedStatus, "pending");
    assert.equal(repository.rollbackCount, 1);
  }
  for (const mode of ["audit_zero", "audit_multiple"] as const) {
    const repository = new AtomicFakeRepository(mode);
    const result = await execute({ repository });
    assert.equal(result.error, "review_decision_unavailable");
    assert.equal(repository.proposalUpdateCount, 1);
    assert.equal(repository.transactionCommitted, false);
    assert.equal(repository.persistedStatus, "pending");
    assert.equal(repository.persistedAuditCount, 0);
    assert.equal(repository.rollbackCount, 1);
  }
  const auditFailure = new AtomicFakeRepository("audit_exception");
  const safeFailure = await execute({ repository: auditFailure });
  assert.equal(safeFailure.error, "review_decision_unavailable");
  assert.equal(auditFailure.transactionCommitted, false);
  assert.equal(auditFailure.rollbackCount, 1);
  assert(!JSON.stringify(safeFailure).includes("fixture-sensitive"));

  const neverCalled = new AtomicFakeRepository();
  await execute({
    request: { ...request(), proposal_ref: RAW_UUID },
    repository: neverCalled,
  });
  assert.equal(neverCalled.calls, 0);

  let clockCalls = 0;
  const preparation = prepareHermesDailyFarmBriefProposalReviewDecision({
    request: request("request_revision"),
    authentication: AUTHENTICATION,
    actor: ADMINISTRATOR,
    currentState: currentState(),
    clock: () => {
      clockCalls += 1;
      return NOW;
    },
  });
  assert.equal(preparation.status, "ready");
  assert.equal(clockCalls, 1);
  if (preparation.status !== "ready") throw new Error("preparation rejected");
  assert.equal(preparation.command.reviewedAt, NOW);
  assert.equal(preparation.command.newUpdatedAt, NOW);
  assert.equal(preparation.command.auditCandidate.decidedAt, NOW);
  assert.equal(preparation.command.auditCandidate.createdAt, NOW);
  assert.equal(
    preparation.command.auditCandidate.metadata.proposal_apply_performed,
    false,
  );
  assert.equal(
    preparation.command.auditCandidate.metadata.app_database_write_performed,
    false,
  );
  assert.equal(preparation.command.auditCandidate.metadata.retry_count, 0);

  const success = await execute();
  const serialized = JSON.stringify(success);
  assert.equal(success.result, "ok");
  assert(!serialized.includes(RAW_UUID));
  assert(!serialized.includes(RAW_PRINCIPAL));
  assert(!serialized.includes("reviewerPrincipalRef"));
  assert.equal(success.proposal_apply_performed, false);
  assert.equal(success.app_database_write_performed, false);
  assert.equal(success.safety.database_write_performed, false);
  assert.equal(success.safety.proposal_update_performed, false);
  assert.equal(success.safety.audit_database_write_performed, false);
  assert.equal(success.safety.proposal_insert_performed, false);
  assert.equal(success.safety.proposal_delete_performed, false);
  assert.equal(success.safety.retry_performed, false);
  assert.equal(success.safety.raw_identifier_exposed, false);
  assert.equal(success.safety.principal_ref_exposed, false);

  console.log(
    JSON.stringify({
      result: "pass",
      boundary: "daily_brief_proposal_review_decision",
      valid_decisions: 3,
      pending_only: true,
      optimistic_concurrency: true,
      atomic_fake_repository: true,
      transaction_committed_on_success: true,
      rollback_cases_verified: 5,
      proposal_apply_performed: false,
      app_database_write_performed: false,
      database_write_performed: false,
      proposal_insert_performed: false,
      proposal_delete_performed: false,
      raw_identifier_exposed: false,
      principal_ref_exposed: false,
      retry_count: 0,
    }),
  );
}

await main();
