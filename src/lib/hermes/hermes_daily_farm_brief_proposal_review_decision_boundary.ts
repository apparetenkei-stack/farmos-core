import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { isCanonicalIso } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalStatus,
} from "./hermes_daily_farm_brief_proposal_review_read_boundary";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION =
  "hermes.daily-farm-brief.proposal-review-decision.v1" as const;
export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_BOUNDARY =
  "daily_brief_proposal_review_decision" as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISIONS = [
  "approve",
  "reject",
  "request_revision",
] as const;

export type HermesDailyFarmBriefProposalReviewDecision =
  (typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISIONS)[number];
export type HermesDailyFarmBriefProposalReviewNextStatus =
  | "approved"
  | "rejected"
  | "needs_revision";

export type HermesDailyFarmBriefProposalReviewDecisionRequest = {
  proposal_ref: string;
  decision: HermesDailyFarmBriefProposalReviewDecision;
  review_note: string;
  expected_status: "pending";
  expected_updated_at: string;
};

export type HermesDailyFarmBriefProposalReviewCurrentState = {
  proposal_ref: string;
  current_status: HermesDailyFarmBriefProposalStatus;
  current_updated_at: string;
  expires_at: string;
  applied_at: string | null;
  applied_by: string | null;
  protected_fixture: boolean;
};

export type HermesDailyFarmBriefProposalReviewAuditCandidate = {
  proposalRef: string;
  internalDecisionType:
    | "approve_review"
    | "reject_review"
    | "request_revision";
  decisionNote: string;
  decidedByPrincipalRef: string;
  decidedByRole: "administrator";
  decisionSource: "daily_brief_proposal_review_decision";
  decidedAt: string;
  createdAt: string;
  metadata: {
    schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION;
    boundary: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_BOUNDARY;
    previous_status: "pending";
    next_status: HermesDailyFarmBriefProposalReviewNextStatus;
    expected_status: "pending";
    expected_updated_at: string;
    proposal_apply_performed: false;
    app_database_write_performed: false;
    retry_count: 0;
  };
};

export type ProposalReviewDecisionRepositoryCommand = {
  proposalRef: string;
  expectedStatus: "pending";
  expectedUpdatedAt: string;
  decision: HermesDailyFarmBriefProposalReviewDecision;
  nextStatus: HermesDailyFarmBriefProposalReviewNextStatus;
  reviewNote: string;
  reviewerPrincipalRef: string;
  reviewedAt: string;
  newUpdatedAt: string;
  auditCandidate: HermesDailyFarmBriefProposalReviewAuditCandidate;
};

export type ProposalReviewDecisionRepositoryResult =
  | {
      result: "recorded";
      previousStatus: "pending";
      nextStatus: HermesDailyFarmBriefProposalReviewNextStatus;
      updatedAt: string;
      proposalUpdateCount: 1;
      auditInsertCount: 1;
      transactionCommitted: true;
      retryCount: 0;
    }
  | { result: "stale" }
  | { result: "not_found" }
  | { result: "protected" }
  | { result: "invalid_transition" }
  | { result: "expired" }
  | { result: "atomic_write_failed" };

export interface DailyFarmBriefProposalReviewDecisionRepository {
  recordProposalReviewDecision(
    command: ProposalReviewDecisionRepositoryCommand,
  ): Promise<ProposalReviewDecisionRepositoryResult>;
}

export type HermesDailyFarmBriefProposalReviewDecisionError =
  | "invalid_request"
  | "authentication_required"
  | "access_forbidden"
  | "proposal_not_found"
  | "proposal_protected"
  | "proposal_expired"
  | "invalid_transition"
  | "stale_proposal"
  | "review_decision_unavailable";

export type HermesDailyFarmBriefProposalReviewDecisionSafety = {
  authentication_enforced: true;
  administrator_required: true;
  role_resolution_server_owned: true;
  server_clock_enforced: true;
  optimistic_concurrency_enforced: true;
  fixture_repository_only: true;
  database_write_performed: false;
  proposal_update_performed: false;
  audit_database_write_performed: false;
  proposal_insert_performed: false;
  proposal_delete_performed: false;
  proposal_apply_performed: false;
  app_database_write_performed: false;
  model_execution_performed: false;
  retry_performed: false;
  raw_identifier_exposed: false;
  principal_ref_exposed: false;
  raw_error_exposed: false;
  fail_closed: true;
};

export type HermesDailyFarmBriefProposalReviewDecisionResult =
  | {
      schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION;
      result: "ok";
      error: null;
      proposal_ref: string;
      decision: HermesDailyFarmBriefProposalReviewDecision;
      status: HermesDailyFarmBriefProposalReviewNextStatus;
      reviewed_at: string;
      review_decision_recorded: true;
      proposal_apply_performed: false;
      app_database_write_performed: false;
      safety: HermesDailyFarmBriefProposalReviewDecisionSafety;
    }
  | {
      schema_version: typeof HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION;
      result: "error";
      error: HermesDailyFarmBriefProposalReviewDecisionError;
      proposal_ref: null;
      decision: null;
      status: null;
      reviewed_at: null;
      review_decision_recorded: false;
      proposal_apply_performed: false;
      app_database_write_performed: false;
      safety: HermesDailyFarmBriefProposalReviewDecisionSafety;
    };

export type HermesDailyFarmBriefProposalReviewDecisionPreparation =
  | {
      status: "ready";
      error: null;
      command: ProposalReviewDecisionRepositoryCommand;
    }
  | {
      status: "rejected";
      error: HermesDailyFarmBriefProposalReviewDecisionError;
      command: null;
    };

type JsonRecord = Record<string, unknown>;
const REQUEST_KEYS = [
  "proposal_ref",
  "decision",
  "review_note",
  "expected_status",
  "expected_updated_at",
] as const;
const CURRENT_STATE_KEYS = [
  "proposal_ref",
  "current_status",
  "current_updated_at",
  "expires_at",
  "applied_at",
  "applied_by",
  "protected_fixture",
] as const;
const PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_revision",
  "applied",
  "expired",
] as const;
const FORBIDDEN_NOTE_CHARACTERS =
  /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufffd]/u;
const HTML_TAG = /<(?:\/?[A-Za-z][^>]*|!--[\s\S]*?--|![A-Z][^>]*)>/u;
const INTERNAL_PRINCIPAL = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function normalizeHermesDailyFarmBriefProposalReviewNote(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFC").trim();
  if (
    normalized.length === 0 ||
    Array.from(normalized).length > 1000 ||
    FORBIDDEN_NOTE_CHARACTERS.test(normalized) ||
    HTML_TAG.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function parseHermesDailyFarmBriefProposalReviewDecisionRequest(
  value: unknown,
): HermesDailyFarmBriefProposalReviewDecisionRequest | null {
  if (!isRecord(value) || !exact(value, REQUEST_KEYS)) return null;
  const proposalRef = parseHermesDailyFarmBriefProposalSafeReference(
    value.proposal_ref,
  );
  const reviewNote = normalizeHermesDailyFarmBriefProposalReviewNote(
    value.review_note,
  );
  if (
    proposalRef === null ||
    !(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISIONS as readonly unknown[]).includes(
      value.decision,
    ) ||
    reviewNote === null ||
    value.expected_status !== "pending" ||
    !isCanonicalIso(value.expected_updated_at)
  ) {
    return null;
  }
  return {
    proposal_ref: proposalRef,
    decision: value.decision as HermesDailyFarmBriefProposalReviewDecision,
    review_note: reviewNote,
    expected_status: "pending",
    expected_updated_at: value.expected_updated_at,
  };
}

export function parseHermesDailyFarmBriefProposalReviewCurrentState(
  value: unknown,
): HermesDailyFarmBriefProposalReviewCurrentState | null {
  if (!isRecord(value) || !exact(value, CURRENT_STATE_KEYS)) return null;
  const proposalRef = parseHermesDailyFarmBriefProposalSafeReference(
    value.proposal_ref,
  );
  if (
    proposalRef === null ||
    !(PROPOSAL_STATUSES as readonly unknown[]).includes(value.current_status) ||
    !isCanonicalIso(value.current_updated_at) ||
    !isCanonicalIso(value.expires_at) ||
    (value.applied_at !== null && !isCanonicalIso(value.applied_at)) ||
    (value.applied_by !== null &&
      (typeof value.applied_by !== "string" ||
        !INTERNAL_PRINCIPAL.test(value.applied_by))) ||
    (value.applied_at === null) !== (value.applied_by === null) ||
    typeof value.protected_fixture !== "boolean"
  ) {
    return null;
  }
  return value as HermesDailyFarmBriefProposalReviewCurrentState;
}

export function resolveHermesDailyFarmBriefProposalReviewTransition(input: {
  currentStatus: unknown;
  decision: unknown;
}): HermesDailyFarmBriefProposalReviewNextStatus | null {
  if (input.currentStatus !== "pending") return null;
  if (input.decision === "approve") return "approved";
  if (input.decision === "reject") return "rejected";
  if (input.decision === "request_revision") return "needs_revision";
  return null;
}

function internalDecisionType(
  decision: HermesDailyFarmBriefProposalReviewDecision,
): HermesDailyFarmBriefProposalReviewAuditCandidate["internalDecisionType"] {
  if (decision === "approve") return "approve_review";
  if (decision === "reject") return "reject_review";
  return "request_revision";
}

function rejected(
  error: HermesDailyFarmBriefProposalReviewDecisionError,
): HermesDailyFarmBriefProposalReviewDecisionPreparation {
  return { status: "rejected", error, command: null };
}

export function prepareHermesDailyFarmBriefProposalReviewDecision(input: {
  request: unknown;
  authentication: unknown;
  actor: unknown;
  currentState: unknown | null;
  clock: () => string;
}): HermesDailyFarmBriefProposalReviewDecisionPreparation {
  const request = parseHermesDailyFarmBriefProposalReviewDecisionRequest(
    input.request,
  );
  if (request === null) return rejected("invalid_request");

  const authentication = parseHermesDailyFarmBriefAuthenticationResult(
    input.authentication,
  );
  if (authentication === null || authentication.status !== "authenticated") {
    return rejected("authentication_required");
  }

  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(input.actor);
  if (
    actor === null ||
    actor.principal_ref !== authentication.principal_ref ||
    actor.role !== "administrator" ||
    actor.authorization_verified !== true ||
    actor.allowed_scope_keys.length !== 0
  ) {
    return rejected("access_forbidden");
  }

  let now: string;
  try {
    now = input.clock();
  } catch {
    return rejected("review_decision_unavailable");
  }
  if (!isCanonicalIso(now)) return rejected("review_decision_unavailable");

  if (input.currentState === null) return rejected("proposal_not_found");
  const current = parseHermesDailyFarmBriefProposalReviewCurrentState(
    input.currentState,
  );
  if (current === null) return rejected("review_decision_unavailable");
  if (current.proposal_ref !== request.proposal_ref) {
    return rejected("proposal_not_found");
  }
  if (current.protected_fixture) return rejected("proposal_protected");
  if (
    current.current_status === "expired" ||
    Date.parse(now) >= Date.parse(current.expires_at)
  ) {
    return rejected("proposal_expired");
  }
  if (
    current.current_status === "applied" ||
    current.applied_at !== null ||
    current.applied_by !== null
  ) {
    return rejected("invalid_transition");
  }
  const nextStatus = resolveHermesDailyFarmBriefProposalReviewTransition({
    currentStatus: current.current_status,
    decision: request.decision,
  });
  if (nextStatus === null) return rejected("invalid_transition");
  if (
    current.current_status !== request.expected_status ||
    current.current_updated_at !== request.expected_updated_at
  ) {
    return rejected("stale_proposal");
  }

  const auditCandidate: HermesDailyFarmBriefProposalReviewAuditCandidate = {
    proposalRef: request.proposal_ref,
    internalDecisionType: internalDecisionType(request.decision),
    decisionNote: request.review_note,
    decidedByPrincipalRef: actor.principal_ref,
    decidedByRole: "administrator",
    decisionSource: "daily_brief_proposal_review_decision",
    decidedAt: now,
    createdAt: now,
    metadata: {
      schema_version:
        HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION,
      boundary: HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_BOUNDARY,
      previous_status: "pending",
      next_status: nextStatus,
      expected_status: "pending",
      expected_updated_at: request.expected_updated_at,
      proposal_apply_performed: false,
      app_database_write_performed: false,
      retry_count: 0,
    },
  };

  return {
    status: "ready",
    error: null,
    command: {
      proposalRef: request.proposal_ref,
      expectedStatus: "pending",
      expectedUpdatedAt: request.expected_updated_at,
      decision: request.decision,
      nextStatus,
      reviewNote: request.review_note,
      reviewerPrincipalRef: actor.principal_ref,
      reviewedAt: now,
      newUpdatedAt: now,
      auditCandidate,
    },
  };
}

function safety(): HermesDailyFarmBriefProposalReviewDecisionSafety {
  return {
    authentication_enforced: true,
    administrator_required: true,
    role_resolution_server_owned: true,
    server_clock_enforced: true,
    optimistic_concurrency_enforced: true,
    fixture_repository_only: true,
    database_write_performed: false,
    proposal_update_performed: false,
    audit_database_write_performed: false,
    proposal_insert_performed: false,
    proposal_delete_performed: false,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    model_execution_performed: false,
    retry_performed: false,
    raw_identifier_exposed: false,
    principal_ref_exposed: false,
    raw_error_exposed: false,
    fail_closed: true,
  };
}

function errorResult(
  error: HermesDailyFarmBriefProposalReviewDecisionError,
): HermesDailyFarmBriefProposalReviewDecisionResult {
  return {
    schema_version:
      HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION,
    result: "error",
    error,
    proposal_ref: null,
    decision: null,
    status: null,
    reviewed_at: null,
    review_decision_recorded: false,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    safety: safety(),
  };
}

function parseRepositoryResult(
  value: unknown,
  command: ProposalReviewDecisionRepositoryCommand,
): ProposalReviewDecisionRepositoryResult | null {
  if (!isRecord(value) || typeof value.result !== "string") return null;
  if (value.result !== "recorded") {
    if (
      ![
        "stale",
        "not_found",
        "protected",
        "invalid_transition",
        "expired",
        "atomic_write_failed",
      ].includes(value.result) ||
      !exact(value, ["result"])
    ) {
      return null;
    }
    return value as ProposalReviewDecisionRepositoryResult;
  }
  if (
    !exact(value, [
      "result",
      "previousStatus",
      "nextStatus",
      "updatedAt",
      "proposalUpdateCount",
      "auditInsertCount",
      "transactionCommitted",
      "retryCount",
    ]) ||
    value.previousStatus !== "pending" ||
    value.nextStatus !== command.nextStatus ||
    value.updatedAt !== command.newUpdatedAt ||
    !isCanonicalIso(value.updatedAt) ||
    value.proposalUpdateCount !== 1 ||
    value.auditInsertCount !== 1 ||
    value.transactionCommitted !== true ||
    value.retryCount !== 0
  ) {
    return null;
  }
  return value as ProposalReviewDecisionRepositoryResult;
}

export async function executeHermesDailyFarmBriefProposalReviewDecision(input: {
  request: unknown;
  authentication: unknown;
  actor: unknown;
  currentState: unknown | null;
  clock: () => string;
  repository: DailyFarmBriefProposalReviewDecisionRepository;
}): Promise<HermesDailyFarmBriefProposalReviewDecisionResult> {
  const preparation = prepareHermesDailyFarmBriefProposalReviewDecision(input);
  if (preparation.status !== "ready") return errorResult(preparation.error);

  let rawResult: unknown;
  try {
    rawResult = await input.repository.recordProposalReviewDecision(
      preparation.command,
    );
  } catch {
    return errorResult("review_decision_unavailable");
  }
  const repositoryResult = parseRepositoryResult(rawResult, preparation.command);
  if (repositoryResult === null) {
    return errorResult("review_decision_unavailable");
  }
  if (repositoryResult.result === "stale") {
    return errorResult("stale_proposal");
  }
  if (repositoryResult.result === "not_found") {
    return errorResult("proposal_not_found");
  }
  if (repositoryResult.result === "protected") {
    return errorResult("proposal_protected");
  }
  if (repositoryResult.result === "expired") {
    return errorResult("proposal_expired");
  }
  if (repositoryResult.result === "invalid_transition") {
    return errorResult("invalid_transition");
  }
  if (repositoryResult.result === "atomic_write_failed") {
    return errorResult("review_decision_unavailable");
  }

  return {
    schema_version:
      HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION,
    result: "ok",
    error: null,
    proposal_ref: preparation.command.proposalRef,
    decision: preparation.command.decision,
    status: preparation.command.nextStatus,
    reviewed_at: preparation.command.reviewedAt,
    review_decision_recorded: true,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    safety: safety(),
  };
}
