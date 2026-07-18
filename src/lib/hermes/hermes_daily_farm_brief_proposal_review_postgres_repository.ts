import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  createHermesDailyFarmBriefProposalSafeReference,
  parseHermesDailyFarmBriefProposalReviewRawRow,
  parseHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalReviewRawRow,
} from "./hermes_daily_farm_brief_proposal_review_read_boundary";

export const HERMES_DAY127_POSTGRES_RUNTIME_ROLE =
  "farmos_ai_proposal_local" as const;

export type HermesDailyFarmBriefProposalReviewRepositoryErrorCode =
  | "day127_repository_input_invalid"
  | "day127_repository_unavailable"
  | "day127_repository_contract_invalid";

/**
 * Internal repository boundary. Returned rows contain database identifiers and
 * must pass through the Day127 safe projection before any public response.
 */
export type HermesDailyFarmBriefProposalReviewReadRepository = {
  listDailyBriefProposalRows: (
    limit: number,
  ) => Promise<HermesDailyFarmBriefProposalReviewRawRow[]>;
  findDailyBriefProposalRowBySafeReference: (
    proposalRef: string,
  ) => Promise<HermesDailyFarmBriefProposalReviewRawRow | null>;
};

function lastJson(output: string): unknown | null {
  const line = output
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .at(-1);
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function targetGuard(): string {
  return `do $day127$ begin
  if current_database() <> '${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if current_user <> '${HERMES_DAY127_POSTGRES_RUNTIME_ROLE}' then raise exception 'identity_invalid'; end if;
  if current_setting('transaction_read_only') <> 'on' then raise exception 'transaction_not_read_only'; end if;
  if to_regclass('ai.proposal_inbox') is null then raise exception 'relation_missing'; end if;
  if not has_table_privilege(current_user,'ai.proposal_inbox','SELECT') then raise exception 'select_privilege_missing'; end if;
  if has_table_privilege(current_user,'ai.proposal_inbox','UPDATE') then raise exception 'update_privilege_present'; end if;
  if has_table_privilege(current_user,'ai.proposal_inbox','DELETE') then raise exception 'delete_privilege_present'; end if;
  if has_table_privilege(current_user,'ai.proposal_inbox','TRUNCATE') then raise exception 'truncate_privilege_present'; end if;
  if coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relname='crop_cycles' and c.relkind in ('r','p')),'INSERT'),false) then raise exception 'app_write_privilege_present'; end if;
  if coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='audit' and c.relname='proposal_review_apply_events' and c.relkind in ('r','p')),'INSERT'),false) then raise exception 'audit_write_privilege_present'; end if;
end $day127$;`;
}

function listSql(limit: number): string {
  return `begin transaction read only;
set local timezone = 'UTC';
set local role ${HERMES_DAY127_POSTGRES_RUNTIME_ROLE};
${targetGuard()}
select coalesce(jsonb_agg(row_value order by created_at desc,id asc),'[]'::jsonb)::text
from (
  select id,created_at,jsonb_build_object(
    'id',id::text,
    'proposal_type',proposal_type,
    'title',title,
    'body',body,
    'payload_json',payload_json,
    'source_refs_json',source_refs_json,
    'model_name',model_name,
    'agent_name',agent_name,
    'confidence',confidence,
    'reason',reason,
    'risk_level',risk_level,
    'status',status,
    'reviewed_by',reviewed_by,
    'reviewed_at',case when reviewed_at is null then null else to_char(reviewed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'review_note',review_note,
    'applied_at',case when applied_at is null then null else to_char(applied_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'applied_by',applied_by,
    'created_at',to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updated_at',to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) as row_value
  from ai.proposal_inbox
  where proposal_type='work_log_follow_up'
    and payload_json->>'schema_version'='hermes.daily_farm_brief.proposal_inbox_record.v1'
    and payload_json->>'boundary'='day126_daily_farm_brief_explicit_save'
    and source_refs_json->>'source'='daily_farm_brief_attention'
    and source_refs_json->>'boundary'='day126_daily_farm_brief_explicit_save'
  order by created_at desc,id asc
  limit ${limit}
) candidates;
commit;`;
}

function parseRows(value: unknown): HermesDailyFarmBriefProposalReviewRawRow[] {
  if (!Array.isArray(value)) {
    throw new Error("day127_repository_contract_invalid");
  }
  const rows: HermesDailyFarmBriefProposalReviewRawRow[] = [];
  for (const valueRow of value) {
    if (parseHermesDailyFarmBriefProposalReviewRawRow(valueRow) === null) {
      throw new Error("day127_repository_contract_invalid");
    }
    rows.push(valueRow as HermesDailyFarmBriefProposalReviewRawRow);
  }
  return rows;
}

export class HermesDailyFarmBriefProposalReviewPostgresRepository
  implements HermesDailyFarmBriefProposalReviewReadRepository
{
  constructor(
    private readonly executor: HermesDailyFarmBriefIsolatedPostgresExecutor,
  ) {}

  async listDailyBriefProposalRows(
    limit: number,
  ): Promise<HermesDailyFarmBriefProposalReviewRawRow[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("day127_repository_input_invalid");
    }
    const result = await this.executor.executeSingleConnection(listSql(limit));
    if (!result.ok) {
      throw new Error("day127_repository_unavailable");
    }
    const value = lastJson(result.output);
    if (value === null) {
      throw new Error("day127_repository_contract_invalid");
    }
    return parseRows(value);
  }

  async findDailyBriefProposalRowBySafeReference(
    proposalRef: string,
  ): Promise<HermesDailyFarmBriefProposalReviewRawRow | null> {
    if (parseHermesDailyFarmBriefProposalSafeReference(proposalRef) === null) {
      throw new Error("day127_repository_input_invalid");
    }
    const rows = await this.listDailyBriefProposalRows(100);
    const matching = rows.filter((row) => {
      const parsed = parseHermesDailyFarmBriefProposalReviewRawRow(row);
      return (
        parsed !== null &&
        createHermesDailyFarmBriefProposalSafeReference(
          parsed.payload.idempotency_key,
        ) === proposalRef
      );
    });
    if (matching.length > 1) {
      throw new Error("day127_repository_contract_invalid");
    }
    return matching[0] ?? null;
  }
}

export function createHermesDailyFarmBriefProposalReviewPostgresRepository(
  input: {
    databaseTarget: unknown;
    executorFactory: (
      databaseTarget: string,
    ) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
  },
): HermesDailyFarmBriefProposalReviewPostgresRepository {
  if (
    typeof input.databaseTarget !== "string" ||
    !classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget)
      .allowed
  ) {
    throw new Error("day127_repository_input_invalid");
  }
  const executor = input.executorFactory(input.databaseTarget);
  if (executor === null) {
    throw new Error("day127_repository_unavailable");
  }
  return new HermesDailyFarmBriefProposalReviewPostgresRepository(executor);
}
