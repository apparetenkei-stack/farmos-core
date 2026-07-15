import { spawn } from "node:child_process";

import {
  parseHermesDailyFarmBriefPersistenceCommand,
  type HermesDailyFarmBriefPersistenceCommand,
} from "./hermes_daily_farm_brief_persistence_command_contract";
import { fingerprintHermesDailyFarmBriefPersistenceCommandPayload } from "./hermes_daily_farm_brief_persistence_fingerprint";
import type { HermesDailyFarmBriefPersistenceWriteRepository } from "./hermes_daily_farm_brief_persistence_write_boundary";
import type { HermesDailyFarmBriefPersistedReadRepository } from "./hermes_daily_farm_brief_persisted_latest_source_boundary";

export const HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE = "farmos_core_day114_test" as const;

export const HERMES_DAILY_FARM_BRIEF_DAY114_SAFETY = {
  isolated_test_database_write_performed: true,
  production_database_write_performed: false,
  app_db_write_performed: false,
  business_db_write_performed: false,
  migration_applied_to_production: false,
  rls_change_applied_to_production: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  audit_write_performed: false,
  notification_performed: false,
  queue_operation_performed: false,
  worker_claim_performed: false,
  model_execution_performed: false,
  scheduler_registration_performed: false,
  retry_performed: false,
  production_secret_exposed: false,
  day114_implementation_secret_exposed: false,
  preimplementation_local_development_credential_exposure_observed: true,
} as const;

export type HermesDailyFarmBriefDay114TargetClassification = {
  classification: "isolated_day114_test" | "rejected";
  allowed: boolean;
};

export function classifyHermesDailyFarmBriefDay114DatabaseTarget(databaseName: unknown): HermesDailyFarmBriefDay114TargetClassification {
  return databaseName === HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE
    ? { classification: "isolated_day114_test", allowed: true }
    : { classification: "rejected", allowed: false };
}

export type HermesDailyFarmBriefIsolatedPostgresExecutor = {
  executeSingleConnection: (sql: string) => Promise<{ ok: boolean; output: string }>;
};

export function createHermesDailyFarmBriefDockerPostgresExecutor(databaseName: string): HermesDailyFarmBriefIsolatedPostgresExecutor | null {
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(databaseName).allowed) return null;
  return {
    executeSingleConnection: async (sql) => new Promise((resolve) => {
      const child = spawn("docker", ["exec", "-i", "farmos-postgres", "sh", "-lc", `psql -U "$POSTGRES_USER" -d ${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE} -X -A -t -q -v ON_ERROR_STOP=1`], { stdio: ["pipe", "pipe", "ignore"] });
      let output = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => { output += chunk; });
      child.on("error", () => resolve({ ok: false, output: "" }));
      child.on("close", (code) => resolve({ ok: code === 0, output: output.trim() }));
      child.stdin.end(sql);
    }),
  };
}

function targetGuard(): string {
  return `do $day114$ begin if current_database() <> '${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'day114_database_target_rejected'; end if; end $day114$;`;
}

function encodedJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function commandFingerprints(command: HermesDailyFarmBriefPersistenceCommand): { command: string; semantic: string } {
  const { command_id: _commandId, ...payload } = command;
  const { idempotency_key: _key, ...semantic } = payload;
  return {
    command: fingerprintHermesDailyFarmBriefPersistenceCommandPayload(payload),
    semantic: fingerprintHermesDailyFarmBriefPersistenceCommandPayload(semantic),
  };
}

function lastJson(output: string): unknown | null {
  const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1);
  if (!line) return null;
  try { return JSON.parse(line); } catch { return null; }
}

export class HermesDailyFarmBriefIsolatedPostgresWriteRepository implements HermesDailyFarmBriefPersistenceWriteRepository {
  transactionCallCount = 0;
  constructor(private readonly executor: HermesDailyFarmBriefIsolatedPostgresExecutor, private readonly failAfterSupersede = false) {}
  async executeCanonicalTransition(value: HermesDailyFarmBriefPersistenceCommand): Promise<unknown> {
    this.transactionCallCount += 1;
    const command = parseHermesDailyFarmBriefPersistenceCommand(value);
    if (command === null) return null;
    const fingerprints = commandFingerprints(command);
    const sql = `begin isolation level read committed;
set local lock_timeout = '3s';
set local timezone = 'UTC';
${targetGuard()}
select ai.persist_daily_farm_brief_command(
  convert_from(decode('${encodedJson(command)}','base64'),'utf8')::jsonb,
  '${fingerprints.command}', '${fingerprints.semantic}', ${this.failAfterSupersede ? "true" : "false"}
)::text;
commit;`;
    const executed = await this.executor.executeSingleConnection(sql);
    if (!executed.ok) return { schema_version: "hermes.daily_farm_brief.persistence_repository_transaction_result.v1", status: "failed_closed", error_code: "transaction_failed", transaction_committed: false, fixture_repository_write_performed: false, brief_persistence_simulated: false };
    const result = lastJson(executed.output) as { status?: string; error_code?: string | null } | null;
    if (result === null || !["committed", "reused", "rejected"].includes(String(result.status))) return null;
    const committed = result.status === "committed";
    return { schema_version: "hermes.daily_farm_brief.persistence_repository_transaction_result.v1", status: result.status, error_code: result.error_code ?? null, transaction_committed: result.status !== "rejected", fixture_repository_write_performed: committed, brief_persistence_simulated: committed };
  }
}

export class HermesDailyFarmBriefIsolatedPostgresReadRepository implements HermesDailyFarmBriefPersistedReadRepository {
  readCount = 0;
  constructor(private readonly executor: HermesDailyFarmBriefIsolatedPostgresExecutor) {}
  async readRecordCandidates(): Promise<unknown> {
    this.readCount += 1;
    const sql = `begin transaction read only;
set local timezone = 'UTC';
${targetGuard()}
select jsonb_build_object(
  'schema_version','hermes.daily_farm_brief.persisted_repository_result.v1',
  'status','ok',
  'transaction_read_only', current_setting('transaction_read_only') = 'on',
  'records', coalesce(jsonb_agg(dto order by business_date, record_kind, version), '[]'::jsonb)
)::text from (
  select business_date, record_kind, version,
    case when record_kind = 'projectable_brief' then jsonb_build_object(
      'record_schema_version',record_schema_version,'record_id',record_id,'record_kind',record_kind,'business_date',business_date::text,
      'record_status',record_status,'version',version,'created_at',to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'updated_at',to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'safety',safety,'generated_at',to_char(generated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'snapshot',snapshot,'scope_index',scope_index,'generation_status',generation_status
    ) else jsonb_build_object(
      'record_schema_version',record_schema_version,'record_id',record_id,'record_kind',record_kind,'business_date',business_date::text,
      'record_status',record_status,'version',version,'created_at',to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'updated_at',to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'safety',safety,'generation_state',generation_state,'retry_count',retry_count
    ) end as dto
  from ai.daily_farm_brief_records
  where generated_at is null or generated_at <= clock_timestamp()
  order by business_date, record_kind, version limit 500
) records;
commit;`;
    const executed = await this.executor.executeSingleConnection(sql);
    return executed.ok ? lastJson(executed.output) : null;
  }
}
