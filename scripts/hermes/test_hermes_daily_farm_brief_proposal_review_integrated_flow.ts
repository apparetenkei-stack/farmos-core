import assert from "node:assert/strict";

import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest,
  parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse,
  parseHermesDailyFarmBriefProposalReviewDetailApiResponse,
  parseHermesDailyFarmBriefProposalReviewListApiResponse,
  type HermesDailyFarmBriefProposalReviewDecisionHttpResponse,
} from "./brief_runtime/hermes_daily_farm_brief_proposal_review_api_contract";
import {
  serveHermesDailyFarmBriefProposalReviewDecision,
  serveHermesDailyFarmBriefProposalReviewDetail,
  serveHermesDailyFarmBriefProposalReviewList,
  type HermesDailyFarmBriefProposalReviewDecisionServiceDependencies,
} from "./brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import { createDay127ApiTestRow } from "./test_hermes_daily_farm_brief_proposal_review_service";
import { DailyFarmBriefProposalDetail } from "../../src/components/hermes/DailyFarmBriefProposalDetail";
import { DailyFarmBriefProposalList } from "../../src/components/hermes/DailyFarmBriefProposalList";
import { DailyFarmBriefProposalReviewControls } from "../../src/components/hermes/DailyFarmBriefProposalReviewControls";
import {
  type DailyFarmBriefProposalReviewDecisionRepository,
  type HermesDailyFarmBriefProposalReviewAuditCandidate,
  type HermesDailyFarmBriefProposalReviewDecision,
  type HermesDailyFarmBriefProposalReviewNextStatus,
  type ProposalReviewDecisionRepositoryCommand,
  type ProposalReviewDecisionRepositoryResult,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";
import {
  createHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalReviewRawRow,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import type { HermesDailyFarmBriefProposalReviewReadRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_repository";
import {
  createDailyBriefProposalDetailUiState,
  createDailyBriefProposalListUiState,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_ui_client";

const SERVER_NOW = "2026-07-18T04:00:00.000Z";
const SERVER_REVIEWER = "day129_server_owned_administrator";
const AUTHENTICATION = {
  schema_version: "hermes.daily_farm_brief.authentication_result.v1",
  status: "authenticated",
  principal_ref: SERVER_REVIEWER,
} as const;
const ADMINISTRATOR = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
  principal_ref: SERVER_REVIEWER,
  role: "administrator",
  allowed_scope_keys: [],
  authorization_verified: true,
} as const;

class MutableIntegratedRepository
  implements
    HermesDailyFarmBriefProposalReviewReadRepository,
    DailyFarmBriefProposalReviewDecisionRepository
{
  readonly audits: HermesDailyFarmBriefProposalReviewAuditCandidate[] = [];
  readonly proposalRef: string;
  readonly rawId: string;
  reviewTransportCallCount = 0;
  private row: HermesDailyFarmBriefProposalReviewRawRow;

  constructor() {
    const fixture = createDay127ApiTestRow();
    this.row = structuredClone(fixture) as HermesDailyFarmBriefProposalReviewRawRow;
    this.rawId = fixture.id;
    this.proposalRef = createHermesDailyFarmBriefProposalSafeReference(
      fixture.payload_json.idempotency_key,
    );
  }

  async listDailyBriefProposalRows(
    limit: number,
  ): Promise<HermesDailyFarmBriefProposalReviewRawRow[]> {
    assert.equal(limit, 100);
    return [structuredClone(this.row)];
  }

  async findDailyBriefProposalRowBySafeReference(
    proposalRef: string,
  ): Promise<HermesDailyFarmBriefProposalReviewRawRow | null> {
    return proposalRef === this.proposalRef ? structuredClone(this.row) : null;
  }

  async recordProposalReviewDecision(
    command: ProposalReviewDecisionRepositoryCommand,
  ): Promise<ProposalReviewDecisionRepositoryResult> {
    this.reviewTransportCallCount += 1;
    if (
      command.proposalRef !== this.proposalRef ||
      this.row.status !== command.expectedStatus ||
      this.row.updated_at !== command.expectedUpdatedAt
    ) {
      return { result: "stale" };
    }

    this.row.status = command.nextStatus;
    this.row.review_note = command.reviewNote;
    this.row.reviewed_at = command.reviewedAt;
    this.row.reviewed_by = command.reviewerPrincipalRef;
    this.row.updated_at = command.newUpdatedAt;
    this.audits.push(structuredClone(command.auditCandidate));

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

function dependencies(
  repository: MutableIntegratedRepository,
): HermesDailyFarmBriefProposalReviewDecisionServiceDependencies {
  return {
    authenticate: async () => AUTHENTICATION,
    resolveActorContext: async () => ADMINISTRATOR,
    readRepository: async () => repository,
    reviewRepository: async () => repository,
    clock: () => SERVER_NOW,
  };
}

async function responseBody(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}

function containsComponent(value: ReactNode, component: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsComponent(item, component));
  }
  if (!isValidElement(value)) return false;
  if (value.type === component) return true;
  return containsComponent(
    (value.props as { children?: ReactNode }).children,
    component,
  );
}

async function readDetail(
  repository: MutableIntegratedRepository,
): Promise<{
  response: Response;
  body: NonNullable<ReturnType<typeof parseHermesDailyFarmBriefProposalReviewDetailApiResponse>>;
}> {
  const response = await serveHermesDailyFarmBriefProposalReviewDetail({
    request: new Request(
      `http://local/api/hermes/daily-farm-brief/proposals/${repository.proposalRef}`,
    ),
    dependencies: dependencies(repository),
  });
  const body = parseHermesDailyFarmBriefProposalReviewDetailApiResponse(
    await responseBody(response),
  );
  assert(body !== null && body.result === "ok");
  return { response, body };
}

async function submitDecision(input: {
  repository: MutableIntegratedRepository;
  decision: HermesDailyFarmBriefProposalReviewDecision;
  expectedStatus: HermesDailyFarmBriefProposalReviewNextStatus;
}): Promise<Extract<HermesDailyFarmBriefProposalReviewDecisionHttpResponse, { ok: true }>> {
  const before = await readDetail(input.repository);
  assert.equal(before.body.proposal.status, "pending");
  const requestBody = {
    decision: input.decision,
    review_note: `Day129 ${input.decision} integration review note.`,
    expected_status: "pending",
    expected_updated_at: before.body.proposal.updated_at,
  };
  assert.deepEqual(
    parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest(requestBody),
    requestBody,
  );
  assert(!Object.hasOwn(requestBody, "reviewed_by"));
  assert(!Object.hasOwn(requestBody, "reviewed_at"));

  const response = await serveHermesDailyFarmBriefProposalReviewDecision({
    request: new Request(
      `http://local/api/hermes/daily-farm-brief/proposals/${input.repository.proposalRef}/review`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    ),
    dependencies: dependencies(input.repository),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const parsed = parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse(
    await responseBody(response),
  );
  assert(parsed !== null && parsed.ok);
  assert.equal(parsed.status, input.expectedStatus);
  assert.equal(input.repository.reviewTransportCallCount, 1);
  assert.equal(input.repository.audits.length, 1);
  assert.equal(input.repository.audits[0].decidedByPrincipalRef, SERVER_REVIEWER);
  assert.equal(
    input.repository.audits[0].metadata.proposal_apply_performed,
    false,
  );
  assert.equal(
    input.repository.audits[0].metadata.app_database_write_performed,
    false,
  );
  assert.equal(input.repository.audits[0].metadata.retry_count, 0);
  return parsed;
}

const approveRepository = new MutableIntegratedRepository();
const listResponse = await serveHermesDailyFarmBriefProposalReviewList({
  request: new Request("http://local/api/hermes/daily-farm-brief/proposals"),
  dependencies: dependencies(approveRepository),
});
assert.equal(listResponse.status, 200);
assert.equal(listResponse.headers.get("cache-control"), "no-store");
const listRaw = await responseBody(listResponse);
const list = parseHermesDailyFarmBriefProposalReviewListApiResponse(listRaw);
assert(list !== null && list.result === "ok");
assert.equal(list.proposals.length, 1);
assert.equal(list.proposals[0].proposal_ref, approveRepository.proposalRef);
assert(!JSON.stringify(list).includes(approveRepository.rawId));
const listUiState = createDailyBriefProposalListUiState(200, listRaw);
assert.equal(listUiState.state, "ok");
const listHtml = renderToStaticMarkup(
  createElement(DailyFarmBriefProposalList, { state: listUiState }),
);

const beforeApprove = await readDetail(approveRepository);
assert.equal(beforeApprove.response.headers.get("cache-control"), "no-store");
assert.equal(beforeApprove.body.proposal.status, "pending");
assert.equal(beforeApprove.body.proposal.expiry_state, "active");
const beforeUiState = createDailyBriefProposalDetailUiState(
  200,
  beforeApprove.body,
);
assert.equal(beforeUiState.state, "ok");
const beforeElement = DailyFarmBriefProposalDetail({ state: beforeUiState });
assert(
  containsComponent(beforeElement, DailyFarmBriefProposalReviewControls),
  "pending active detail must expose the existing review controls",
);

const initialUpdatedAt = beforeApprove.body.proposal.updated_at;
const approve = await submitDecision({
  repository: approveRepository,
  decision: "approve",
  expectedStatus: "approved",
});
assert.equal(approve.previous_status, "pending");
assert.equal(approve.updated_at, SERVER_NOW);
assert.notEqual(approve.updated_at, initialUpdatedAt);

const afterApprove = await readDetail(approveRepository);
assert.equal(afterApprove.body.proposal.status, approve.status);
assert.equal(afterApprove.body.proposal.updated_at, approve.updated_at);
const afterUiState = createDailyBriefProposalDetailUiState(200, afterApprove.body);
assert.equal(afterUiState.state, "ok");
const afterElement = DailyFarmBriefProposalDetail({ state: afterUiState });
assert(
  !containsComponent(afterElement, DailyFarmBriefProposalReviewControls),
  "terminal detail must hide review controls",
);
const terminalHtml = renderToStaticMarkup(
  createElement(DailyFarmBriefProposalDetail, { state: afterUiState }),
);

for (const [decision, status] of [
  ["reject", "rejected"],
  ["request_revision", "needs_revision"],
] as const) {
  const repository = new MutableIntegratedRepository();
  const result = await submitDecision({
    repository,
    decision,
    expectedStatus: status,
  });
  const detail = await readDetail(repository);
  assert.equal(result.status, status);
  assert.equal(detail.body.proposal.status, status);
  const state = createDailyBriefProposalDetailUiState(200, detail.body);
  assert.equal(state.state, "ok");
  assert(
    !containsComponent(
      DailyFarmBriefProposalDetail({ state }),
      DailyFarmBriefProposalReviewControls,
    ),
  );
}

for (const reviewNote of ["", "   "]) {
  assert.equal(
    parseHermesDailyFarmBriefProposalReviewDecisionHttpRequest({
      decision: "approve",
      review_note: reviewNote,
      expected_status: "pending",
      expected_updated_at: initialUpdatedAt,
    }),
    null,
  );
}

const malformedList = structuredClone(listRaw) as Record<string, unknown>;
delete malformedList.safety;
assert.equal(
  parseHermesDailyFarmBriefProposalReviewListApiResponse(malformedList),
  null,
);
assert.equal(createDailyBriefProposalListUiState(200, malformedList).state, "unavailable");

const invalidStatusList = structuredClone(listRaw) as {
  proposals: Array<Record<string, unknown>>;
};
invalidStatusList.proposals[0].status = "unknown";
assert.equal(
  parseHermesDailyFarmBriefProposalReviewListApiResponse(invalidStatusList),
  null,
);
const rawReferenceList = structuredClone(listRaw) as {
  proposals: Array<Record<string, unknown>>;
};
rawReferenceList.proposals[0].proposal_ref = approveRepository.rawId;
assert.equal(
  parseHermesDailyFarmBriefProposalReviewListApiResponse(rawReferenceList),
  null,
);

const malformedDetail = structuredClone(afterApprove.body) as {
  proposal: Record<string, unknown>;
};
malformedDetail.proposal.updated_at = "not-a-timestamp";
assert.equal(
  parseHermesDailyFarmBriefProposalReviewDetailApiResponse(malformedDetail),
  null,
);
assert.equal(
  createDailyBriefProposalDetailUiState(200, malformedDetail).state,
  "unavailable",
);
const extraDetail = structuredClone(afterApprove.body) as Record<string, unknown>;
extraDetail.unexpected = true;
assert.equal(
  parseHermesDailyFarmBriefProposalReviewDetailApiResponse(extraDetail),
  null,
);

assert.equal(
  parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({
    ok: true,
    proposal_ref: approveRepository.proposalRef,
    previous_status: "pending",
    status: "approved",
  }),
  null,
);
assert.equal(
  parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse({
    ...approve,
    unexpected: true,
  }),
  null,
);

for (const publicValue of [list, beforeApprove.body, approve, afterApprove.body]) {
  const json = JSON.stringify(publicValue);
  assert(!json.includes(approveRepository.rawId));
  assert(!json.includes(SERVER_REVIEWER));
  assert(!json.includes("farmos_ai_proposal_review_local"));
  assert(!json.includes("payload_json"));
  assert(!json.includes("source_refs_json"));
  assert(!json.includes("farmos_core_day114_test"));
}
for (const html of [listHtml, terminalHtml]) {
  for (const forbidden of [
    "Apply操作",
    "営農データへ反映済み",
    "作業へ適用済み",
    "在庫へ反映済み",
  ]) {
    assert(!html.includes(forbidden));
  }
}

console.log(
  JSON.stringify({
    boundary: "day129_daily_farm_brief_proposal_review_integrated_flow",
    result: "passed",
    list_result: "ok",
    initial_detail_status: "pending",
    approve_status: approve.status,
    refetched_status: afterApprove.body.proposal.status,
    audit_append_count: approveRepository.audits.length,
    decision_mappings_verified: 3,
    terminal_controls_hidden: true,
    malformed_fail_closed: true,
    raw_identifier_exposed: false,
    reviewer_identity_exposed: false,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    production_connection_performed: false,
    retry_count: 0,
  }),
);
