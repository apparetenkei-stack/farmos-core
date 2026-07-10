import { randomUUID } from "node:crypto";

export type HermesDay81ProposalDraftCandidate = {
  id: string;
  status: "draft_preview_only";
  proposal_type: "hermes_chat_draft_preview";
  source: "mock";
  title: string;
  summary: string;
  persistence: "not_saved";
  requires_human_review: true;
  created_from_message: true;
};

export type HermesDay81ProposalDraftRecord = {
  id: string;
  proposal_type: string;
  title: string;
  body: string;
  payload_json: Record<string, unknown>;
  source_refs_json: Record<string, unknown>;
  model_name: string | null;
  agent_name: string;
  confidence: number | null;
  reason: string;
  risk_level: "low";
  status: "pending";
};

export type HermesDay81PersistedProposal = {
  id: string;
  proposal_type: string;
  title: string;
  status: string;
};

export type HermesDay81PersistenceExecutor = {
  findExistingByBoundaryTestId: (
    boundaryTestId: string
  ) => Promise<HermesDay81PersistedProposal | null>;
  insertProposal: (
    record: HermesDay81ProposalDraftRecord
  ) => Promise<HermesDay81PersistedProposal>;
};

export type HermesDay81PersistenceResult = {
  proposal_draft_persistence_boundary: "day81_core_internal_test_only";
  proposal_draft_candidate_source: "mock";
  proposal_draft_candidate_id: string;
  proposal_draft_persisted: boolean;
  proposal_draft_saved: boolean;
  proposal_apply_ready: false;
  proposal_draft_apply_ready: false;
  proposal_apply_performed: false;
  confirmation_token_created: false;
  audit_apply_event_created: false;
  app_db_write_performed: false;
  db_write_performed: boolean;
  insert_target_schema: "ai";
  insert_target_table: "proposal_inbox";
  ui_connected: false;
  api_route_added: false;
  server_action_used: false;
  form_action_used: false;
  persisted_proposal_id: string;
  persisted_proposal_status: string;
  deduplicated_existing_record: boolean;
};

export const DAY81_PROPOSAL_DRAFT_PERSISTENCE_BOUNDARY =
  "day81_core_internal_test_only" as const;

export const DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID =
  "day81_core_internal_test_only_v1" as const;

export function createDay81MockProposalDraftCandidate(
  message: string
): HermesDay81ProposalDraftCandidate {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    throw new Error("message_required");
  }

  return {
    id: "day81_persistence_boundary_test_candidate_v1",
    status: "draft_preview_only",
    proposal_type: "hermes_chat_draft_preview",
    source: "mock",
    title: "Day81 Hermes draft persistence boundary test",
    summary: `Mock draft candidate generated from validated message: ${normalizedMessage}`,
    persistence: "not_saved",
    requires_human_review: true,
    created_from_message: true
  };
}

export function createDay81ProposalDraftRecordFromCandidate(
  candidate: HermesDay81ProposalDraftCandidate
): HermesDay81ProposalDraftRecord {
  assertDay81Candidate(candidate);

  return {
    id: randomUUID(),
    proposal_type: candidate.proposal_type,
    title: candidate.title,
    body: candidate.summary,
    payload_json: {
      boundary: DAY81_PROPOSAL_DRAFT_PERSISTENCE_BOUNDARY,
      day81_persistence_boundary_test_id: DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID,
      proposal_draft_candidate: candidate,
      proposal_draft_candidate_source: candidate.source,
      proposal_draft_saved: true,
      proposal_draft_persisted: true,
      proposal_draft_apply_ready: false,
      proposal_apply_performed: false,
      confirmation_token_created: false,
      audit_apply_event_created: false,
      app_db_write_performed: false
    },
    source_refs_json: {
      source: "day81_persistence_boundary_test",
      boundary: DAY81_PROPOSAL_DRAFT_PERSISTENCE_BOUNDARY,
      day81_persistence_boundary_test_id: DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID,
      proposal_draft_candidate_id: candidate.id
    },
    model_name: "mock",
    agent_name: "hermes",
    confidence: null,
    reason:
      "Day81 internal test persisted a mock proposal draft candidate for human review. It is not apply-ready.",
    risk_level: "low",
    status: "pending"
  };
}

export async function persistHermesProposalDraftCandidateForDay81(input: {
  candidate: HermesDay81ProposalDraftCandidate;
  executor: HermesDay81PersistenceExecutor;
}): Promise<HermesDay81PersistenceResult> {
  const record = createDay81ProposalDraftRecordFromCandidate(input.candidate);
  const existing = await input.executor.findExistingByBoundaryTestId(
    DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID
  );

  const persisted =
    existing ?? (await input.executor.insertProposal(record));

  return {
    proposal_draft_persistence_boundary: DAY81_PROPOSAL_DRAFT_PERSISTENCE_BOUNDARY,
    proposal_draft_candidate_source: input.candidate.source,
    proposal_draft_candidate_id: input.candidate.id,
    proposal_draft_persisted: true,
    proposal_draft_saved: true,
    proposal_apply_ready: false,
    proposal_draft_apply_ready: false,
    proposal_apply_performed: false,
    confirmation_token_created: false,
    audit_apply_event_created: false,
    app_db_write_performed: false,
    db_write_performed: existing === null,
    insert_target_schema: "ai",
    insert_target_table: "proposal_inbox",
    ui_connected: false,
    api_route_added: false,
    server_action_used: false,
    form_action_used: false,
    persisted_proposal_id: persisted.id,
    persisted_proposal_status: persisted.status,
    deduplicated_existing_record: existing !== null
  };
}

function assertDay81Candidate(
  candidate: HermesDay81ProposalDraftCandidate
): void {
  if (candidate.status !== "draft_preview_only") {
    throw new Error("invalid_candidate_status");
  }

  if (candidate.proposal_type !== "hermes_chat_draft_preview") {
    throw new Error("invalid_candidate_proposal_type");
  }

  if (candidate.source !== "mock") {
    throw new Error("invalid_candidate_source");
  }

  if (candidate.persistence !== "not_saved") {
    throw new Error("invalid_candidate_persistence");
  }

  if (candidate.requires_human_review !== true) {
    throw new Error("candidate_requires_human_review");
  }

  if (candidate.created_from_message !== true) {
    throw new Error("candidate_must_be_message_derived");
  }
}
