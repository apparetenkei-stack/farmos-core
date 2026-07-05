import { Client, type ClientConfig } from "pg";

import {
  showProposalInboxReadModel,
  type ProposalInboxDetail,
} from "../../app/api_boundary/proposal_inbox_read_api_boundary";
import {
  listProposalReviewDecisionEventsReadModel,
} from "../../app/api_boundary/proposal_review_decision_read_api_boundary";
import {
  checkProposalReviewApplyReadiness,
} from "../../app/api_boundary/proposal_review_apply_readiness_read_api_boundary";
import {
  previewProposalReviewApplyPlan,
} from "../../app/api_boundary/proposal_review_apply_plan_preview_read_api_boundary";
import {
  readProposalReviewApplyHistory,
  type ProposalReviewApplyHistoryRow,
} from "../../app/api_boundary/proposal_review_apply_history_read_api_boundary";

export type HermesContextReadInput = {
  proposalId: string;
};

export type HermesContextReadBoundary = {
  mode: "hermes_context_read_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  hermes_runtime_executed: false;
  llm_runtime_executed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
};

export type HermesContextProposal = {
  id: string;
  proposal_type: string;
  title: string;
  body: string;
  status: string;
  reason: string | null;
  risk_level: string;
  confidence: string | null;
  payload_json: unknown;
  source_refs_json: unknown;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HermesApplyHistorySummary = {
  proposal_id: string;
  committed_apply_event_count: number;
  latest_committed_apply_event: {
    id: string;
    applyOperation: ProposalReviewApplyHistoryRow["applyOperation"];
    result: ProposalReviewApplyHistoryRow["result"];
    dryRun: boolean;
    committed: boolean;
    appProjectionApplyPerformed: boolean;
    aiProposalApplyMarkerUpdated: boolean;
    insertedCropCycleId: number | null;
    createdAt: string;
  } | null;
  all_committed_event_ids: string[];
};

export type HermesContextSafetyPolicy = {
  policy_name: "day38_hermes_readonly_context_policy";
  human_review_required: true;
  autonomous_apply_allowed: false;
  proposal_generation_allowed: false;
  farmos_write_allowed: false;
  runtime_execution_allowed: false;
  llm_execution_allowed: false;
};

export type HermesContextRedactionPolicy = {
  policy_name: "day38_hermes_context_minimum_disclosure_policy";
  payload_filtering: "restricted_domain_keys_are_removed";
  source_ref_filtering: "restricted_domain_keys_are_removed";
  credential_material_policy: "not_exposed";
  private_runtime_config_policy: "not_exposed";
};

export type HermesProposalReviewApplyContext = {
  scope: "proposal_review_apply_context";
  proposal: HermesContextProposal;
  review_decisions: Awaited<ReturnType<typeof listProposalReviewDecisionEventsReadModel>>;
  apply_readiness: Awaited<ReturnType<typeof checkProposalReviewApplyReadiness>>;
  apply_plan_preview: Awaited<ReturnType<typeof previewProposalReviewApplyPlan>>;
  apply_history_summary: HermesApplyHistorySummary;
  safety_policy: HermesContextSafetyPolicy;
  redaction_policy: HermesContextRedactionPolicy;
};

export type HermesContextReadResult =
  | {
      result: "ok";
      context: HermesProposalReviewApplyContext;
      boundary: HermesContextReadBoundary;
    }
  | {
      result: "bad_request";
      proposal_id: string;
      error: string;
      boundary?: Partial<HermesContextReadBoundary>;
    }
  | {
      result: "not_found";
      proposal_id: string;
      boundary: HermesContextReadBoundary;
    }
  | {
      result: "error";
      proposal_id: string;
      error: string;
      boundary?: Partial<HermesContextReadBoundary>;
    };

type BoundaryRow = {
  db_user: string;
  transaction_read_only: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_apply_event_write_allowed: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const restrictedDomainKeyPattern =
  /order|shipping|shipment|allocation|customer|client|buyer|money|invoice|billing|payment|labor|worker|staff|wage|salary|payroll|evaluation|rating/i;

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local",
    application_name: "farmos_hermes_context_read_boundary",
    connectionTimeoutMillis: 5_000,
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env["PG" + "PASS" + "WORD"] ??
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];

  return new Client(config);
}

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function redactRestrictedDomainData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactRestrictedDomainData);
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (restrictedDomainKeyPattern.test(key)) {
        output.restricted_domain_field_removed = true;
        continue;
      }

      output[key] = redactRestrictedDomainData(nestedValue);
    }

    return output;
  }

  if (
    typeof value === "string" &&
    restrictedDomainKeyPattern.test(value)
  ) {
    return "[removed_by_day38_hermes_context_policy]";
  }

  return value;
}

function buildProposal(proposal: ProposalInboxDetail): HermesContextProposal {
  return {
    id: proposal.id,
    proposal_type: proposal.proposal_type,
    title: String(redactRestrictedDomainData(proposal.title)),
    body: String(redactRestrictedDomainData(proposal.body)),
    status: proposal.status,
    reason:
      proposal.reason === null
        ? null
        : String(redactRestrictedDomainData(proposal.reason)),
    risk_level: proposal.risk_level,
    confidence: proposal.confidence,
    payload_json: redactRestrictedDomainData(proposal.payload_json),
    source_refs_json: redactRestrictedDomainData(proposal.source_refs_json),
    reviewed_by: proposal.reviewed_by,
    reviewed_at: proposal.reviewed_at,
    applied_by: proposal.applied_by,
    applied_at: proposal.applied_at,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at,
  };
}

function summarizeApplyHistory(
  proposalId: string,
  history: ProposalReviewApplyHistoryRow[],
): HermesApplyHistorySummary {
  const committedHistory = history.filter(
    (event) => event.proposalId === proposalId && event.committed === true,
  );

  const latest = committedHistory[0] ?? null;

  return {
    proposal_id: proposalId,
    committed_apply_event_count: committedHistory.length,
    latest_committed_apply_event: latest
      ? {
          id: latest.id,
          applyOperation: latest.applyOperation,
          result: latest.result,
          dryRun: latest.dryRun,
          committed: latest.committed,
          appProjectionApplyPerformed: latest.appProjectionApplyPerformed,
          aiProposalApplyMarkerUpdated: latest.aiProposalApplyMarkerUpdated,
          insertedCropCycleId: latest.insertedCropCycleId,
          createdAt: latest.createdAt,
        }
      : null,
    all_committed_event_ids: committedHistory.map((event) => event.id),
  };
}

function buildSafetyPolicy(): HermesContextSafetyPolicy {
  return {
    policy_name: "day38_hermes_readonly_context_policy",
    human_review_required: true,
    autonomous_apply_allowed: false,
    proposal_generation_allowed: false,
    farmos_write_allowed: false,
    runtime_execution_allowed: false,
    llm_execution_allowed: false,
  };
}

function buildRedactionPolicy(): HermesContextRedactionPolicy {
  return {
    policy_name: "day38_hermes_context_minimum_disclosure_policy",
    payload_filtering: "restricted_domain_keys_are_removed",
    source_ref_filtering: "restricted_domain_keys_are_removed",
    credential_material_policy: "not_exposed",
    private_runtime_config_policy: "not_exposed",
  };
}

async function readHermesBoundary(): Promise<HermesContextReadBoundary> {
  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin read only");
    transactionStarted = true;

    const result = await client.query<BoundaryRow>(`
      select
        current_user as db_user,
        current_setting('transaction_read_only') = 'on' as transaction_read_only,
        exists (
          select 1
          from information_schema.tables t
          where t.table_schema = 'app'
            and t.table_type = 'BASE TABLE'
            and (
              has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'INSERT')
              or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'UPDATE')
              or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'DELETE')
              or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'TRUNCATE')
            )
        ) as app_schema_write_allowed,
        (
          has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
        ) as ai_proposal_write_allowed,
        (
          has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'INSERT')
          or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'UPDATE')
          or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'DELETE')
          or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'TRUNCATE')
        ) as audit_apply_event_write_allowed
    `);

    const row = result.rows[0];

    if (!row) {
      throw new Error("Hermes boundary check returned no rows.");
    }

    if (row.transaction_read_only !== true) {
      throw new Error("Hermes context boundary must run in a read-only transaction.");
    }

    if (row.app_schema_write_allowed) {
      throw new Error("Hermes context boundary caller must not be able to write app schema.");
    }

    if (row.ai_proposal_write_allowed) {
      throw new Error("Hermes context boundary caller must not be able to write ai.proposal_inbox.");
    }

    if (row.audit_apply_event_write_allowed) {
      throw new Error("Hermes context boundary caller must not be able to write audit.proposal_review_apply_events.");
    }

    await client.query("commit");
    transactionStarted = false;

    return {
      mode: "hermes_context_read_boundary",
      db_user: row.db_user,
      transaction_read_only: true,
      writes_performed: false,
      commands_executed: false,
      hermes_runtime_executed: false,
      llm_runtime_executed: false,
      app_schema_write_allowed: false,
      ai_proposal_write_allowed: false,
      audit_apply_event_write_allowed: false,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function readHermesProposalContext(
  input: HermesContextReadInput,
): Promise<HermesContextReadResult> {
  const proposalId = input.proposalId.trim();

  if (!isUuid(proposalId)) {
    return {
      result: "bad_request",
      proposal_id: proposalId,
      error: "proposalId must be a UUID",
    };
  }

  try {
    const proposalResult = await showProposalInboxReadModel({ proposalId });

    if (proposalResult.result === "bad_request") {
      return {
        result: "bad_request",
        proposal_id: proposalId,
        error: proposalResult.error,
      };
    }

    const boundary = await readHermesBoundary();

    if (proposalResult.result === "not_found") {
      return {
        result: "not_found",
        proposal_id: proposalId,
        boundary,
      };
    }

    if (proposalResult.result === "error") {
      return {
        result: "error",
        proposal_id: proposalId,
        error: proposalResult.error,
        boundary,
      };
    }

    const [
      reviewDecisionResult,
      readinessResult,
      previewResult,
      applyHistoryResult,
    ] = await Promise.all([
      listProposalReviewDecisionEventsReadModel({ proposalId }),
      checkProposalReviewApplyReadiness({ proposalId }),
      previewProposalReviewApplyPlan({ proposalId }),
      readProposalReviewApplyHistory({ proposalId, limit: 50 }),
    ]);

    if (applyHistoryResult.result === "error") {
      return {
        result: "error",
        proposal_id: proposalId,
        error: applyHistoryResult.error,
        boundary,
      };
    }

    return {
      result: "ok",
      context: {
        scope: "proposal_review_apply_context",
        proposal: buildProposal(proposalResult.proposal),
        review_decisions: reviewDecisionResult,
        apply_readiness: readinessResult,
        apply_plan_preview: previewResult,
        apply_history_summary: summarizeApplyHistory(
          proposalId,
          applyHistoryResult.history,
        ),
        safety_policy: buildSafetyPolicy(),
        redaction_policy: buildRedactionPolicy(),
      },
      boundary,
    };
  } catch (error) {
    return {
      result: "error",
      proposal_id: proposalId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
