import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { isCanonicalIso } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  type DailyFarmBriefProposalReviewDecisionRepository,
  type HermesDailyFarmBriefProposalReviewDecision,
  type HermesDailyFarmBriefProposalReviewNextStatus,
  type ProposalReviewDecisionRepositoryCommand,
  type ProposalReviewDecisionRepositoryResult,
} from "./hermes_daily_farm_brief_proposal_review_decision_boundary";
import {
  createHermesDailyFarmBriefProposalSafeReference,
  parseHermesDailyFarmBriefProposalReviewRawRow,
  parseHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalReviewRawRow,
} from "./hermes_daily_farm_brief_proposal_review_read_boundary";

export const HERMES_DAY128_REVIEW_RUNTIME_ROLE =
  "farmos_ai_proposal_review_local" as const;
export const HERMES_DAY128_PROTECTED_PROPOSAL_ID =
  "14711111-88db-41fd-a048-1c37266fd9e0" as const;

export type HermesDay128ReviewPostgresQueryResult = {
  rowCount: number;
  rows: unknown[];
};

export type HermesDay128ReviewPostgresTransaction = {
  query: (
    sql: string,
    parameters?: readonly unknown[],
  ) => Promise<HermesDay128ReviewPostgresQueryResult>;
};

export type HermesDay128ReviewPostgresTransactionDecision<T> = {
  commit: boolean;
  value: T;
};

export type HermesDay128ReviewPostgresTransactionExecution<T> = {
  ok: boolean;
  committed: boolean;
  value?: T;
};

/**
 * Server-owned single-connection transaction executor. A future adapter must
 * begin with beginSql, commit only when the callback returns commit=true,
 * rollback otherwise (including exceptions), and always release the connection.
 */
export type HermesDay128ReviewPostgresTransactionExecutor = {
  executeSingleConnectionTransaction: <T>(input: {
    databaseTarget: string;
    beginSql: string;
    operation: (
      transaction: HermesDay128ReviewPostgresTransaction,
    ) => Promise<HermesDay128ReviewPostgresTransactionDecision<T>>;
  }) => Promise<HermesDay128ReviewPostgresTransactionExecution<T>>;
};

const RAW_COLUMNS = `
  id::text as id,
  proposal_type,
  title,
  body,
  payload_json,
  source_refs_json,
  model_name,
  agent_name,
  confidence,
  reason,
  risk_level,
  status,
  reviewed_by,
  case when reviewed_at is null then null else to_char(reviewed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end as reviewed_at,
  review_note,
  case when applied_at is null then null else to_char(applied_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end as applied_at,
  applied_by,
  to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
  to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`;

export const HERMES_DAY128_REVIEW_POSTGRES_SQL = {
  begin: `begin isolation level read committed;
set local timezone = 'UTC';
set local role ${HERMES_DAY128_REVIEW_RUNTIME_ROLE};
do $day128$ begin
  if current_database() <> '${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if current_user <> '${HERMES_DAY128_REVIEW_RUNTIME_ROLE}' then raise exception 'identity_invalid'; end if;
end $day128$;`,
  candidates: `select ${RAW_COLUMNS}
from ai.proposal_inbox
where proposal_type='work_log_follow_up'
  and payload_json->>'schema_version'='hermes.daily_farm_brief.proposal_inbox_record.v1'
  and payload_json->>'boundary'='day126_daily_farm_brief_explicit_save'
  and source_refs_json->>'source'='daily_farm_brief_attention'
  and source_refs_json->>'boundary'='day126_daily_farm_brief_explicit_save'
order by created_at desc,id asc
limit 100`,
  lockTarget: `select ${RAW_COLUMNS}
from ai.proposal_inbox
where id=$1
for update`,
  update: `update ai.proposal_inbox
set status=$2,reviewed_by=$3,reviewed_at=$4,review_note=$5,updated_at=$4
where id=$1
  and status='pending'
  and status=$6
  and updated_at=$7
  and applied_at is null
  and applied_by is null
returning status,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`,
  auditInsert: `insert into audit.proposal_review_decision_events(
  proposal_id,decision_type,decision_note,decided_by,decided_by_role,
  decision_source,event_metadata,decided_at,created_at
) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)
returning 1 as inserted`,
} as const;

type TransactionValue = ProposalReviewDecisionRepositoryResult;
const PRINCIPAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;

function expectedNextStatus(
  decision: HermesDailyFarmBriefProposalReviewDecision,
): HermesDailyFarmBriefProposalReviewNextStatus {
  if (decision === "approve") return "approved";
  if (decision === "reject") return "rejected";
  return "needs_revision";
}

function validCommand(command: ProposalReviewDecisionRepositoryCommand): boolean {
  return (
    parseHermesDailyFarmBriefProposalSafeReference(command.proposalRef) !== null &&
    command.expectedStatus === "pending" &&
    expectedNextStatus(command.decision) === command.nextStatus &&
    typeof command.reviewNote === "string" &&
    command.reviewNote.length > 0 &&
    PRINCIPAL_PATTERN.test(command.reviewerPrincipalRef) &&
    isCanonicalIso(command.reviewedAt) &&
    command.newUpdatedAt === command.reviewedAt &&
    command.expectedUpdatedAt !== command.newUpdatedAt &&
    isCanonicalIso(command.expectedUpdatedAt) &&
    command.auditCandidate.proposalRef === command.proposalRef &&
    command.auditCandidate.decisionNote === command.reviewNote &&
    command.auditCandidate.decidedByPrincipalRef === command.reviewerPrincipalRef &&
    command.auditCandidate.decidedByRole === "administrator" &&
    command.auditCandidate.decisionSource ===
      "daily_brief_proposal_review_decision" &&
    command.auditCandidate.decidedAt === command.reviewedAt &&
    command.auditCandidate.createdAt === command.reviewedAt &&
    command.auditCandidate.metadata.previous_status === "pending" &&
    command.auditCandidate.metadata.next_status === command.nextStatus &&
    command.auditCandidate.metadata.expected_status === "pending" &&
    command.auditCandidate.metadata.expected_updated_at ===
      command.expectedUpdatedAt &&
    command.auditCandidate.metadata.proposal_apply_performed === false &&
    command.auditCandidate.metadata.app_database_write_performed === false &&
    command.auditCandidate.metadata.retry_count === 0
  );
}

function parseCandidateRows(value: unknown[]): HermesDailyFarmBriefProposalReviewRawRow[] | null {
  const rows: HermesDailyFarmBriefProposalReviewRawRow[] = [];
  for (const row of value) {
    if (parseHermesDailyFarmBriefProposalReviewRawRow(row) === null) return null;
    rows.push(row as HermesDailyFarmBriefProposalReviewRawRow);
  }
  return rows;
}

function internalDecisionType(
  decision: HermesDailyFarmBriefProposalReviewDecision,
): "approve_review" | "reject_review" | "request_revision" {
  if (decision === "approve") return "approve_review";
  if (decision === "reject") return "reject_review";
  return "request_revision";
}

export class PostgresDailyFarmBriefProposalReviewDecisionRepository
  implements DailyFarmBriefProposalReviewDecisionRepository
{
  constructor(
    private readonly executor: HermesDay128ReviewPostgresTransactionExecutor,
    private readonly transactionContract: {
      databaseTarget: string;
      beginSql: string;
    } = {
      databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
      beginSql: HERMES_DAY128_REVIEW_POSTGRES_SQL.begin,
    },
  ) {}

  async recordProposalReviewDecision(
    command: ProposalReviewDecisionRepositoryCommand,
  ): Promise<ProposalReviewDecisionRepositoryResult> {
    if (!validCommand(command)) return { result: "atomic_write_failed" };

    let execution: HermesDay128ReviewPostgresTransactionExecution<TransactionValue>;
    try {
      execution = await this.executor.executeSingleConnectionTransaction<TransactionValue>({
        databaseTarget: this.transactionContract.databaseTarget,
        beginSql: this.transactionContract.beginSql,
        operation: async (transaction) => {
          const candidatesResult = await transaction.query(
            HERMES_DAY128_REVIEW_POSTGRES_SQL.candidates,
          );
          if (candidatesResult.rowCount < 0 || candidatesResult.rowCount > 100) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          const candidates = parseCandidateRows(candidatesResult.rows);
          if (candidates === null) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          const matching = candidates.filter((row) => {
            const parsed = parseHermesDailyFarmBriefProposalReviewRawRow(row);
            return (
              parsed !== null &&
              createHermesDailyFarmBriefProposalSafeReference(
                parsed.payload.idempotency_key,
              ) === command.proposalRef
            );
          });
          if (matching.length === 0) {
            return { commit: false, value: { result: "not_found" } };
          }
          if (matching.length !== 1) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          if (matching[0].id === HERMES_DAY128_PROTECTED_PROPOSAL_ID) {
            return { commit: false, value: { result: "protected" } };
          }

          const lockedResult = await transaction.query(
            HERMES_DAY128_REVIEW_POSTGRES_SQL.lockTarget,
            [matching[0].id],
          );
          if (lockedResult.rowCount === 0) {
            return { commit: false, value: { result: "not_found" } };
          }
          if (lockedResult.rowCount !== 1 || lockedResult.rows.length !== 1) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          const lockedRaw = lockedResult.rows[0];
          const locked = parseHermesDailyFarmBriefProposalReviewRawRow(lockedRaw);
          if (locked === null || !lockedRaw || typeof lockedRaw !== "object") {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          if (
            createHermesDailyFarmBriefProposalSafeReference(
              locked.payload.idempotency_key,
            ) !== command.proposalRef
          ) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          const lockedRawRow = lockedRaw as HermesDailyFarmBriefProposalReviewRawRow;
          if (lockedRawRow.id === HERMES_DAY128_PROTECTED_PROPOSAL_ID) {
            return { commit: false, value: { result: "protected" } };
          }
          if (locked.status !== "pending") {
            return { commit: false, value: { result: "invalid_transition" } };
          }
          if (locked.updated_at !== command.expectedUpdatedAt) {
            return { commit: false, value: { result: "stale" } };
          }
          if (locked.applied_at !== null || lockedRawRow.applied_by !== null) {
            return { commit: false, value: { result: "invalid_transition" } };
          }
          if (Date.parse(command.reviewedAt) >= Date.parse(locked.payload.expires_at)) {
            return { commit: false, value: { result: "expired" } };
          }

          const updateResult = await transaction.query(
            HERMES_DAY128_REVIEW_POSTGRES_SQL.update,
            [
              lockedRawRow.id,
              command.nextStatus,
              command.reviewerPrincipalRef,
              command.reviewedAt,
              command.reviewNote,
              command.expectedStatus,
              command.expectedUpdatedAt,
            ],
          );
          if (updateResult.rowCount === 0) {
            return { commit: false, value: { result: "stale" } };
          }
          if (updateResult.rowCount !== 1) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }

          const auditResult = await transaction.query(
            HERMES_DAY128_REVIEW_POSTGRES_SQL.auditInsert,
            [
              lockedRawRow.id,
              internalDecisionType(command.decision),
              command.reviewNote,
              command.reviewerPrincipalRef,
              "administrator",
              "daily_brief_proposal_review_decision",
              JSON.stringify(command.auditCandidate.metadata),
              command.reviewedAt,
            ],
          );
          if (auditResult.rowCount !== 1) {
            return { commit: false, value: { result: "atomic_write_failed" } };
          }
          return {
            commit: true,
            value: {
              result: "recorded",
              previousStatus: "pending",
              nextStatus: command.nextStatus,
              updatedAt: command.newUpdatedAt,
              proposalUpdateCount: 1,
              auditInsertCount: 1,
              transactionCommitted: true,
              retryCount: 0,
            },
          };
        },
      });
    } catch {
      return { result: "atomic_write_failed" };
    }

    if (!execution.ok || execution.value === undefined) {
      return { result: "atomic_write_failed" };
    }
    if (execution.value.result === "recorded") {
      return execution.committed ? execution.value : { result: "atomic_write_failed" };
    }
    return execution.committed ? { result: "atomic_write_failed" } : execution.value;
  }
}

export function createPostgresDailyFarmBriefProposalReviewDecisionRepository(
  input: {
    databaseTarget: unknown;
    executorFactory: (
      databaseTarget: typeof HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    ) => HermesDay128ReviewPostgresTransactionExecutor | null;
  },
): PostgresDailyFarmBriefProposalReviewDecisionRepository {
  if (
    typeof input.databaseTarget !== "string" ||
    !classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed
  ) {
    throw new Error("day128_repository_input_invalid");
  }
  const executor = input.executorFactory(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  if (executor === null) throw new Error("day128_repository_unavailable");
  return new PostgresDailyFarmBriefProposalReviewDecisionRepository(executor);
}
