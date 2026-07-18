import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  createHermesDailyFarmBriefProposalCandidate,
  type HermesDailyFarmBriefProposalCandidate,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";
import {
  executeHermesDailyFarmBriefProposalExplicitSave,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV,
  diagnoseHermesDay126ProposalExplicitSavePostgresReadiness,
  type HermesDailyFarmBriefProposalExplicitSavePostgresRepository,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import {
  prepareHermesDailyFarmBriefProposalReviewDecision,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";
import {
  HERMES_DAY128_PROTECTED_PROPOSAL_ID,
  HERMES_DAY128_REVIEW_POSTGRES_SQL,
  createPostgresDailyFarmBriefProposalReviewDecisionRepository,
  type HermesDay128ReviewPostgresTransactionExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_repository";
import {
  createHermesDailyFarmBriefProposalSafeReference,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

const NORMAL_ID = "d1280000-0000-4000-8000-000000000001";
const ROLLBACK_ID = "d1280000-0000-4000-8000-000000000002";
const PRINCIPAL = "day128-isolated-e2e-administrator";
const CREATED_AT = "2026-07-18T03:00:00.000Z";
const REQUESTED_AT = "2026-07-18T04:00:00.000Z";
const REVIEWED_AT = "2026-07-18T05:00:00.000Z";
const REVIEW_NOTE = "Day128 isolated atomic review E2E approval.";

type ProposalState = {
  status: string;
  reviewed_by_set: boolean;
  reviewed_at: string | null;
  review_note: string | null;
  applied_at: string | null;
  applied_by: string | null;
  updated_at: string;
  expires_at: string;
  audit_count: number;
};

type Snapshot = {
  proposal_total: number;
  audit_total: number;
  protected_state: string | null;
  other_proposals_fingerprint: string;
  other_audit_events_fingerprint: string;
  app_schema_structure_fingerprint: string;
  normal: ProposalState | null;
  rollback: ProposalState | null;
  normal_audit: {
    decision_type: string;
    decision_source: string;
    decided_by_role: string;
    decision_note: string;
    previous_status: string;
    next_status: string;
    retry_count: number;
    proposal_apply_performed: boolean;
    app_database_write_performed: boolean;
  } | null;
};

type E2EStage =
  | "startup"
  | "target_validated"
  | "executor_created"
  | "baseline_snapshot_started"
  | "baseline_snapshot_completed"
  | "snapshot_core_counts"
  | "snapshot_protected_state"
  | "snapshot_other_proposals"
  | "snapshot_other_audit_events"
  | "snapshot_app_schema"
  | "snapshot_normal_fixture"
  | "snapshot_rollback_fixture"
  | "snapshot_normal_audit"
  | "snapshot_combined_contract"
  | "candidate_creation_completed"
  | "save_readiness_started"
  | "save_readiness_completed"
  | "proposal_save_started"
  | "proposal_save_completed"
  | "pre_snapshot_completed"
  | "normal_review_started"
  | "normal_review_completed"
  | "rollback_review_started"
  | "rollback_review_completed"
  | "post_snapshot_completed"
  | "postconditions_completed";

type E2EErrorClass =
  | "snapshot_unavailable"
  | "snapshot_contract_invalid"
  | "executor_unavailable"
  | "target_invalid"
  | "save_readiness_unavailable"
  | "proposal_save_failed"
  | "review_failed"
  | "postcondition_failed"
  | "unexpected_failure";

type PsqlFailureClass =
  | "process_spawn_failed"
  | "psql_exited"
  | "sql_execution_failed"
  | "output_contract_invalid";

class E2EFailure extends Error {
  constructor(readonly errorClass: E2EErrorClass) {
    super("day128_e2e_failed_closed");
  }
}

class InteractivePsqlFailure extends Error {
  constructor(readonly failureClass: PsqlFailureClass) {
    super("day128_psql_failed_closed");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseProposalState(value: unknown): ProposalState | null {
  const keys = ["status", "reviewed_by_set", "reviewed_at", "review_note", "applied_at", "applied_by", "updated_at", "expires_at", "audit_count"] as const;
  if (
    !isRecord(value) || !exact(value, keys) || typeof value.status !== "string" ||
    typeof value.reviewed_by_set !== "boolean" || !nullableString(value.reviewed_at) ||
    !nullableString(value.review_note) || !nullableString(value.applied_at) ||
    !nullableString(value.applied_by) || typeof value.updated_at !== "string" ||
    typeof value.expires_at !== "string" || !nonNegativeInteger(value.audit_count)
  ) return null;
  return value as ProposalState;
}

function parseAuditState(value: unknown): Snapshot["normal_audit"] | undefined {
  if (value === null) return null;
  const keys = ["decision_type", "decision_source", "decided_by_role", "decision_note", "previous_status", "next_status", "retry_count", "proposal_apply_performed", "app_database_write_performed"] as const;
  if (
    !isRecord(value) || !exact(value, keys) ||
    !keys.slice(0, 6).every((key) => typeof value[key] === "string") ||
    value.retry_count !== "0" || value.proposal_apply_performed !== "false" ||
    value.app_database_write_performed !== "false"
  ) return undefined;
  return {
    decision_type: value.decision_type as string,
    decision_source: value.decision_source as string,
    decided_by_role: value.decided_by_role as string,
    decision_note: value.decision_note as string,
    previous_status: value.previous_status as string,
    next_status: value.next_status as string,
    retry_count: 0,
    proposal_apply_performed: false,
    app_database_write_performed: false,
  };
}

function parseSnapshot(value: unknown): Snapshot | null {
  const keys = ["proposal_total", "audit_total", "protected_state", "other_proposals_fingerprint", "other_audit_events_fingerprint", "app_schema_structure_fingerprint", "normal", "rollback", "normal_audit"] as const;
  if (
    !isRecord(value) || !exact(value, keys) || !nonNegativeInteger(value.proposal_total) ||
    !nonNegativeInteger(value.audit_total) || !nullableString(value.protected_state) ||
    typeof value.other_proposals_fingerprint !== "string" ||
    typeof value.other_audit_events_fingerprint !== "string" ||
    typeof value.app_schema_structure_fingerprint !== "string"
  ) return null;
  const normal = value.normal === null ? null : parseProposalState(value.normal);
  const rollback = value.rollback === null ? null : parseProposalState(value.rollback);
  const normalAudit = parseAuditState(value.normal_audit);
  if ((value.normal !== null && normal === null) || (value.rollback !== null && rollback === null) || normalAudit === undefined) return null;
  return { ...value, normal, rollback, normal_audit: normalAudit } as Snapshot;
}

function candidate(label: string, reasonCode: "work_log_started_at_missing" | "work_log_started_at_invalid"): HermesDailyFarmBriefProposalCandidate {
  const value = createHermesDailyFarmBriefProposalCandidate({
    value: {
      schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
      proposal_type: "work_log_follow_up",
      suggestion_type: "work_log_attention",
      source: {
        business_date: "2026-07-18",
        generated_at: "2026-07-18T00:00:00.000Z",
        version: 2,
        display_state: "current",
      },
      attention: {
        reason_code: reasonCode,
        reason: reasonCode === "work_log_started_at_missing"
          ? "作業開始日時が入力されていません。"
          : "作業開始日時の形式を確認してください。",
        field_label: label,
        work_type_label: "Day128 isolated review E2E",
        work_date: null,
        evidence_type: "work_log",
      },
    },
    expectedSourceVersion: 2,
    clock: () => CREATED_AT,
  });
  assert(value !== null, "candidate must be valid");
  return value;
}

async function saveProposal(
  value: HermesDailyFarmBriefProposalCandidate,
  id: string,
  repository: HermesDailyFarmBriefProposalExplicitSavePostgresRepository,
): Promise<void> {
  const result = await executeHermesDailyFarmBriefProposalExplicitSave({
    request: {
      schema_version: "hermes.daily_farm_brief.proposal_explicit_save_request.v1",
      candidate_id: value.candidate_id,
      duplicate_signature: value.duplicate_signature,
      confirmation: "save_for_human_review",
      requested_at: REQUESTED_AT,
    },
    actor: {
      schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
      principal_ref: PRINCIPAL,
      role: "administrator",
      allowed_scope_keys: [],
      authorization_verified: true,
    },
    candidate: value,
    idFactory: () => id,
    repository,
  });
  assert.equal(result.status, "saved", "E2E proposal must be newly saved once");
}

function lastJson(output: string): unknown | null {
  const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1);
  if (!line) return null;
  try { return JSON.parse(line); } catch { return null; }
}

async function snapshot(executor: HermesDailyFarmBriefIsolatedPostgresExecutor): Promise<Snapshot> {
  const result = await executor.executeSingleConnection(`begin transaction read only;
set local timezone='UTC';
do $guard$ begin
  if current_database()<>'${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
end $guard$;
select jsonb_build_object(
  'proposal_total',(select count(*)::int from ai.proposal_inbox),
  'audit_total',(select count(*)::int from audit.proposal_review_decision_events),
  'protected_state',(select concat_ws('|',status,coalesce(reviewed_at::text,''),coalesce(applied_at::text,''),coalesce(applied_by,'')) from ai.proposal_inbox where id='${HERMES_DAY128_PROTECTED_PROPOSAL_ID}'::uuid),
  'other_proposals_fingerprint',(select md5(coalesce(string_agg(concat_ws('|',id::text,status,coalesce(reviewed_by,''),coalesce(reviewed_at::text,''),coalesce(review_note,''),coalesce(applied_at::text,''),coalesce(applied_by,'')),',' order by id::text),'none')) from ai.proposal_inbox where id not in ('${NORMAL_ID}'::uuid,'${ROLLBACK_ID}'::uuid)),
  'other_audit_events_fingerprint',(select md5(coalesce(string_agg(concat_ws('|',id::text,proposal_id::text,decision_type,coalesce(decision_note,''),decided_by,decided_by_role,decision_source,event_metadata::text,decided_at::text,created_at::text),',' order by id::text),'none')) from audit.proposal_review_decision_events where proposal_id not in ('${NORMAL_ID}'::uuid,'${ROLLBACK_ID}'::uuid)),
  'app_schema_structure_fingerprint',(select md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||c.relkind::text,',' order by c.oid),'none')) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app'),
  'normal',(select jsonb_build_object('status',p.status,'reviewed_by_set',p.reviewed_by is not null,'reviewed_at',case when p.reviewed_at is null then null else to_char(p.reviewed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,'review_note',p.review_note,'applied_at',p.applied_at,'applied_by',p.applied_by,'updated_at',to_char(p.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expires_at',p.payload_json->>'expires_at','audit_count',(select count(*)::int from audit.proposal_review_decision_events a where a.proposal_id=p.id)) from ai.proposal_inbox p where p.id='${NORMAL_ID}'::uuid),
  'rollback',(select jsonb_build_object('status',p.status,'reviewed_by_set',p.reviewed_by is not null,'reviewed_at',case when p.reviewed_at is null then null else to_char(p.reviewed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,'review_note',p.review_note,'applied_at',p.applied_at,'applied_by',p.applied_by,'updated_at',to_char(p.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expires_at',p.payload_json->>'expires_at','audit_count',(select count(*)::int from audit.proposal_review_decision_events a where a.proposal_id=p.id)) from ai.proposal_inbox p where p.id='${ROLLBACK_ID}'::uuid),
  'normal_audit',(select jsonb_build_object('decision_type',a.decision_type,'decision_source',a.decision_source,'decided_by_role',a.decided_by_role,'decision_note',a.decision_note,'previous_status',a.event_metadata->>'previous_status','next_status',a.event_metadata->>'next_status','retry_count',a.event_metadata->>'retry_count','proposal_apply_performed',a.event_metadata->>'proposal_apply_performed','app_database_write_performed',a.event_metadata->>'app_database_write_performed') from audit.proposal_review_decision_events a where a.proposal_id='${NORMAL_ID}'::uuid order by a.created_at,a.id limit 1)
)::text;
rollback;`);
  if (!result.ok) throw new E2EFailure("snapshot_unavailable");
  const parsed = parseSnapshot(lastJson(result.output));
  if (parsed === null) throw new E2EFailure("snapshot_contract_invalid");
  return parsed;
}

type DiagnosticCheck = {
  stage: Extract<E2EStage,
    | "snapshot_core_counts"
    | "snapshot_protected_state"
    | "snapshot_other_proposals"
    | "snapshot_other_audit_events"
    | "snapshot_app_schema"
    | "snapshot_normal_fixture"
    | "snapshot_rollback_fixture"
    | "snapshot_normal_audit"
    | "snapshot_combined_contract">;
  query_succeeded: true;
  output_json_valid: true;
  output_contract_valid: true;
};

async function diagnosticQuery(
  executor: HermesDailyFarmBriefIsolatedPostgresExecutor,
  selectSql: string,
): Promise<Record<string, unknown>> {
  const result = await executor.executeSingleConnection(`begin transaction read only;
set local timezone='UTC';
${selectSql.trim().replace(/;+$/u, "")};
rollback;`);
  if (!result.ok) throw new E2EFailure("snapshot_unavailable");
  const value = lastJson(result.output);
  if (!isRecord(value)) throw new E2EFailure("snapshot_contract_invalid");
  return value;
}

async function diagnosticSnapshot(
  executor: HermesDailyFarmBriefIsolatedPostgresExecutor,
  setStage: (stage: E2EStage) => void,
): Promise<{ snapshot: Snapshot; checks: DiagnosticCheck[] }> {
  const checks: DiagnosticCheck[] = [];
  const run = async <T extends Record<string, unknown>>(
    stage: DiagnosticCheck["stage"],
    sql: string,
    parse: (value: Record<string, unknown>) => T | null,
  ): Promise<T> => {
    setStage(stage);
    const value = await diagnosticQuery(executor, sql);
    const parsed = parse(value);
    if (parsed === null) throw new E2EFailure("snapshot_contract_invalid");
    checks.push({ stage, query_succeeded: true, output_json_valid: true, output_contract_valid: true });
    return parsed;
  };

  const core = await run("snapshot_core_counts", `select jsonb_build_object(
    'proposal_total',(select count(*)::int from ai.proposal_inbox),
    'audit_total',(select count(*)::int from audit.proposal_review_decision_events)
  )::text`, (value) => exact(value, ["proposal_total", "audit_total"]) && nonNegativeInteger(value.proposal_total) && nonNegativeInteger(value.audit_total) ? value : null);
  const protectedState = await run("snapshot_protected_state", `select jsonb_build_object(
    'protected_state',(select concat_ws('|',status,coalesce(reviewed_at::text,''),coalesce(applied_at::text,''),coalesce(applied_by,'')) from ai.proposal_inbox where id='${HERMES_DAY128_PROTECTED_PROPOSAL_ID}'::uuid)
  )::text`, (value) => exact(value, ["protected_state"]) && nullableString(value.protected_state) ? value : null);
  const otherProposals = await run("snapshot_other_proposals", `select jsonb_build_object(
    'other_proposals_fingerprint',(select md5(coalesce(string_agg(concat_ws('|',id::text,status,coalesce(reviewed_by,''),coalesce(reviewed_at::text,''),coalesce(review_note,''),coalesce(applied_at::text,''),coalesce(applied_by,'')),',' order by id::text),'none')) from ai.proposal_inbox where id not in ('${NORMAL_ID}'::uuid,'${ROLLBACK_ID}'::uuid))
  )::text`, (value) => exact(value, ["other_proposals_fingerprint"]) && typeof value.other_proposals_fingerprint === "string" ? value : null);
  const otherAudit = await run("snapshot_other_audit_events", `select jsonb_build_object(
    'other_audit_events_fingerprint',(select md5(coalesce(string_agg(concat_ws('|',id::text,proposal_id::text,decision_type,coalesce(decision_note,''),decided_by,decided_by_role,decision_source,event_metadata::text,decided_at::text,created_at::text),',' order by id::text),'none')) from audit.proposal_review_decision_events where proposal_id not in ('${NORMAL_ID}'::uuid,'${ROLLBACK_ID}'::uuid))
  )::text`, (value) => exact(value, ["other_audit_events_fingerprint"]) && typeof value.other_audit_events_fingerprint === "string" ? value : null);
  const appSchema = await run("snapshot_app_schema", `select jsonb_build_object(
    'app_schema_structure_fingerprint',(select md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||c.relkind::text,',' order by c.oid),'none')) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app')
  )::text`, (value) => exact(value, ["app_schema_structure_fingerprint"]) && typeof value.app_schema_structure_fingerprint === "string" ? value : null);
  const fixtureSql = (id: string, key: "normal" | "rollback") => `select jsonb_build_object('${key}',(select jsonb_build_object('status',p.status,'reviewed_by_set',p.reviewed_by is not null,'reviewed_at',case when p.reviewed_at is null then null else to_char(p.reviewed_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,'review_note',p.review_note,'applied_at',p.applied_at,'applied_by',p.applied_by,'updated_at',to_char(p.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expires_at',p.payload_json->>'expires_at','audit_count',(select count(*)::int from audit.proposal_review_decision_events a where a.proposal_id=p.id)) from ai.proposal_inbox p where p.id='${id}'::uuid))::text`;
  const normal = await run("snapshot_normal_fixture", fixtureSql(NORMAL_ID, "normal"), (value) => exact(value, ["normal"]) && (value.normal === null || parseProposalState(value.normal) !== null) ? value : null);
  const rollback = await run("snapshot_rollback_fixture", fixtureSql(ROLLBACK_ID, "rollback"), (value) => exact(value, ["rollback"]) && (value.rollback === null || parseProposalState(value.rollback) !== null) ? value : null);
  const normalAudit = await run("snapshot_normal_audit", `select jsonb_build_object(
    'normal_audit',(select jsonb_build_object('decision_type',a.decision_type,'decision_source',a.decision_source,'decided_by_role',a.decided_by_role,'decision_note',a.decision_note,'previous_status',a.event_metadata->>'previous_status','next_status',a.event_metadata->>'next_status','retry_count',a.event_metadata->>'retry_count','proposal_apply_performed',a.event_metadata->>'proposal_apply_performed','app_database_write_performed',a.event_metadata->>'app_database_write_performed') from audit.proposal_review_decision_events a where a.proposal_id='${NORMAL_ID}'::uuid order by a.created_at,a.id limit 1)
  )::text`, (value) => exact(value, ["normal_audit"]) && parseAuditState(value.normal_audit) !== undefined ? value : null);

  setStage("snapshot_combined_contract");
  const combined = parseSnapshot({ ...core, ...protectedState, ...otherProposals, ...otherAudit, ...appSchema, ...normal, ...rollback, ...normalAudit });
  if (combined === null) throw new E2EFailure("snapshot_contract_invalid");
  checks.push({ stage: "snapshot_combined_contract", query_succeeded: true, output_json_valid: true, output_contract_valid: true });
  return { snapshot: combined, checks };
}

function quoteLiteral(value: unknown): string {
  if (value === null) return "null";
  assert(["string", "number", "boolean"].includes(typeof value), "unsupported SQL parameter");
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bind(sql: string, parameters: readonly unknown[]): string {
  let bound = sql.trim().replace(/;+$/u, "");
  for (let index = parameters.length; index >= 1; index -= 1) {
    bound = bound.replace(new RegExp(`\\$${index}(?![0-9])`, "gu"), quoteLiteral(parameters[index - 1]));
  }
  assert(!/\$[0-9]+/u.test(bound), "unbound SQL parameter");
  return bound;
}

class InteractivePsql {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: string[] = [];
  private readonly waiters: Array<(line: string) => void> = [];
  private ended = false;
  private spawnFailed = false;
  private stderrObserved = false;
  private sequence = 0;

  constructor() {
    this.child = spawn("docker", [
      "exec", "-i", "farmos-postgres", "sh", "-lc",
      `psql -U "$POSTGRES_USER" -d ${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE} -X -A -t -q -v ON_ERROR_STOP=1`,
    ], { stdio: ["pipe", "pipe", "pipe"] });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.on("data", () => { this.stderrObserved = true; });
    let buffer = "";
    this.child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const parts = buffer.split(/\r?\n/u);
      buffer = parts.pop() ?? "";
      for (const line of parts) this.push(line.trim());
    });
    this.child.on("close", () => {
      this.ended = true;
      while (this.waiters.length > 0) this.waiters.shift()?.("");
    });
    this.child.on("error", () => {
      this.spawnFailed = true;
      this.ended = true;
      while (this.waiters.length > 0) this.waiters.shift()?.("");
    });
  }

  private push(line: string): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter(line);
    else this.lines.push(line);
  }

  private nextLine(): Promise<string> {
    const line = this.lines.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.ended) return Promise.resolve("");
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async execute(sql: string): Promise<string[]> {
    const marker = `__day128_e2e_${this.sequence += 1}__`;
    this.child.stdin.write(`${sql}\nselect '${marker}';\n`);
    const output: string[] = [];
    for (;;) {
      const line = await this.nextLine();
      if (line === marker) return output.filter(Boolean);
      if (line === "" && this.ended) {
        if (this.spawnFailed) throw new InteractivePsqlFailure("process_spawn_failed");
        throw new InteractivePsqlFailure(this.stderrObserved ? "sql_execution_failed" : "psql_exited");
      }
      if (line !== "") output.push(line);
    }
  }

  async close(): Promise<void> {
    if (!this.child.stdin.destroyed) this.child.stdin.end();
    if (!this.ended) await new Promise<void>((resolve) => this.child.once("close", () => resolve()));
  }
}

function transactionExecutor(failBeforeAuditInsert: boolean): HermesDay128ReviewPostgresTransactionExecutor {
  return {
    async executeSingleConnectionTransaction<T>(input) {
      assert.equal(input.databaseTarget, HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
      const session = new InteractivePsql();
      try {
        await session.execute(input.beginSql);
        const decision = await input.operation({
          query: async (sql, parameters = []) => {
            if (failBeforeAuditInsert && sql === HERMES_DAY128_REVIEW_POSTGRES_SQL.auditInsert) {
              throw new Error("day128_controlled_audit_failure");
            }
            const bound = bind(sql, parameters);
            const output = await session.execute(`with day128_result as (${bound}) select jsonb_build_object('rowCount',count(*)::int,'rows',coalesce(jsonb_agg(to_jsonb(day128_result)),'[]'::jsonb))::text from day128_result;`);
            let parsed: { rowCount: number; rows: unknown[] };
            try {
              parsed = JSON.parse(output.at(-1) ?? "null") as { rowCount: number; rows: unknown[] };
            } catch {
              throw new InteractivePsqlFailure("output_contract_invalid");
            }
            if (!isRecord(parsed) || !exact(parsed, ["rowCount", "rows"]) || !nonNegativeInteger(parsed.rowCount) || !Array.isArray(parsed.rows)) {
              throw new InteractivePsqlFailure("output_contract_invalid");
            }
            return parsed;
          },
        });
        await session.execute(decision.commit ? "commit;" : "rollback;");
        return { ok: true, committed: decision.commit, value: decision.value };
      } catch {
        try { await session.execute("rollback;"); } catch { /* fail closed */ }
        return { ok: false, committed: false };
      } finally {
        await session.close();
      }
    },
  };
}

function reviewPreparation(proposalRef: string, state: ProposalState) {
  const preparation = prepareHermesDailyFarmBriefProposalReviewDecision({
    request: {
      proposal_ref: proposalRef,
      decision: "approve",
      review_note: REVIEW_NOTE,
      expected_status: "pending",
      expected_updated_at: state.updated_at,
    },
    authentication: {
      schema_version: "hermes.daily_farm_brief.authentication_result.v1",
      status: "authenticated",
      principal_ref: PRINCIPAL,
    },
    actor: {
      schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
      principal_ref: PRINCIPAL,
      role: "administrator",
      allowed_scope_keys: [],
      authorization_verified: true,
    },
    currentState: {
      proposal_ref: proposalRef,
      current_status: state.status,
      current_updated_at: state.updated_at,
      expires_at: state.expires_at,
      applied_at: state.applied_at,
      applied_by: state.applied_by,
      protected_fixture: false,
    },
    clock: () => REVIEWED_AT,
  });
  assert.equal(preparation.status, "ready");
  if (preparation.status !== "ready") throw new Error("day128_review_preparation_rejected");
  return preparation.command;
}

function assertReusableFixture(state: ProposalState): void {
  assert.equal(state.status, "pending");
  assert.equal(state.reviewed_by_set, false);
  assert.equal(state.reviewed_at, null);
  assert.equal(state.review_note, null);
  assert.equal(state.applied_at, null);
  assert.equal(state.applied_by, null);
  assert.equal(state.audit_count, 0);
}

function errorClassFor(stage: E2EStage, error: unknown): E2EErrorClass {
  if (error instanceof E2EFailure) return error.errorClass;
  if (stage === "startup") return "target_invalid";
  if (stage === "target_validated") return "executor_unavailable";
  if (stage === "baseline_snapshot_started" || stage === "baseline_snapshot_completed" || stage === "pre_snapshot_completed" || stage === "post_snapshot_completed") return "snapshot_unavailable";
  if (stage === "save_readiness_started") return "save_readiness_unavailable";
  if (stage === "save_readiness_completed" || stage === "proposal_save_started") return "proposal_save_failed";
  if (["normal_review_started", "normal_review_completed", "rollback_review_started", "rollback_review_completed"].includes(stage)) return "review_failed";
  if (stage === "postconditions_completed") return "postcondition_failed";
  return "unexpected_failure";
}

async function main(): Promise<boolean> {
  let stage: E2EStage = "startup";
  try {
    const target = process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV];
    if (target !== HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE) throw new E2EFailure("target_invalid");
    stage = "target_validated";
    const baseExecutor = createHermesDailyFarmBriefDockerPostgresExecutor(target);
    if (baseExecutor === null) throw new E2EFailure("executor_unavailable");
    stage = "executor_created";

    if (process.env.HERMES_DAY128_REVIEW_E2E_DIAGNOSTIC_ONLY === "true") {
      const diagnostic = await diagnosticSnapshot(baseExecutor, (nextStage) => { stage = nextStage; });
      console.log(JSON.stringify({
        boundary: "day128_daily_farm_brief_proposal_review_decision_isolated_e2e",
        result: "diagnostic_passed",
        completed_stage: stage,
        stages: diagnostic.checks,
        normal_fixture_exists: diagnostic.snapshot.normal !== null,
        rollback_fixture_exists: diagnostic.snapshot.rollback !== null,
        database_write_performed: false,
        production_connection_performed: false,
        retry_count: 0,
        raw_error_exposed: false,
      }));
      return true;
    }

    stage = "baseline_snapshot_started";
    const baseline = await snapshot(baseExecutor);
    stage = "baseline_snapshot_completed";

  const normalCandidate = candidate("Day128 atomic approval fixture scope v1", "work_log_started_at_missing");
  const rollbackCandidate = candidate("Day128 atomic rollback fixture scope v1", "work_log_started_at_invalid");
  stage = "candidate_creation_completed";
  let createdCount = 0;
  let reusedCount = 0;
  if (baseline.normal !== null) {
    assertReusableFixture(baseline.normal);
    reusedCount += 1;
  }
  if (baseline.rollback !== null) {
    assertReusableFixture(baseline.rollback);
    reusedCount += 1;
  }
  if (baseline.normal === null || baseline.rollback === null) {
    stage = "save_readiness_started";
    const saveReadiness = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: target });
    if (saveReadiness.state !== "ready") throw new E2EFailure("save_readiness_unavailable");
    stage = "save_readiness_completed";
    stage = "proposal_save_started";
    if (baseline.normal === null) {
      await saveProposal(normalCandidate, NORMAL_ID, saveReadiness.repository);
      createdCount += 1;
    }
    if (baseline.rollback === null) {
      await saveProposal(rollbackCandidate, ROLLBACK_ID, saveReadiness.repository);
      createdCount += 1;
    }
    stage = "proposal_save_completed";
  }

  const pre = await snapshot(baseExecutor);
  stage = "pre_snapshot_completed";
  assert(pre.normal && pre.rollback, "E2E fixtures must exist");
  assertReusableFixture(pre.normal);
  assertReusableFixture(pre.rollback);

  const normalRef = createHermesDailyFarmBriefProposalSafeReference(normalCandidate.duplicate_signature.startsWith("sha256:")
    ? (await import("../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary")).createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(normalCandidate.duplicate_signature)
    : normalCandidate.duplicate_signature);
  const rollbackRef = createHermesDailyFarmBriefProposalSafeReference((await import("../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary")).createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(rollbackCandidate.duplicate_signature));

  const normalRepository = createPostgresDailyFarmBriefProposalReviewDecisionRepository({
    databaseTarget: target,
    executorFactory: () => transactionExecutor(false),
  });
  stage = "normal_review_started";
  const approve = await normalRepository.recordProposalReviewDecision(reviewPreparation(normalRef, pre.normal));
  assert.equal(approve.result, "recorded");
  stage = "normal_review_completed";

  const rollbackRepository = createPostgresDailyFarmBriefProposalReviewDecisionRepository({
    databaseTarget: target,
    executorFactory: () => transactionExecutor(true),
  });
  stage = "rollback_review_started";
  const rollback = await rollbackRepository.recordProposalReviewDecision(reviewPreparation(rollbackRef, pre.rollback));
  assert.equal(rollback.result, "atomic_write_failed");
  stage = "rollback_review_completed";

  const post = await snapshot(baseExecutor);
  stage = "post_snapshot_completed";
  assert(post.normal && post.rollback && post.normal_audit, "postcondition data missing");
  assert.equal(post.normal.status, "approved");
  assert.equal(post.normal.reviewed_by_set, true);
  assert.equal(post.normal.reviewed_at, REVIEWED_AT);
  assert.equal(post.normal.review_note, REVIEW_NOTE);
  assert.notEqual(post.normal.updated_at, pre.normal.updated_at);
  assert.equal(post.normal.applied_at, null);
  assert.equal(post.normal.applied_by, null);
  assert.equal(post.normal.audit_count, 1);
  assert.deepEqual(post.normal_audit, {
    decision_type: "approve_review",
    decision_source: "daily_brief_proposal_review_decision",
    decided_by_role: "administrator",
    decision_note: REVIEW_NOTE,
    previous_status: "pending",
    next_status: "approved",
    retry_count: 0,
    proposal_apply_performed: false,
    app_database_write_performed: false,
  });
  assert.deepEqual(post.rollback, pre.rollback, "audit failure must rollback Proposal update");
  assert.equal(post.protected_state, baseline.protected_state);
  assert.equal(post.other_proposals_fingerprint, baseline.other_proposals_fingerprint);
  assert.equal(post.other_audit_events_fingerprint, baseline.other_audit_events_fingerprint);
  assert.equal(post.app_schema_structure_fingerprint, baseline.app_schema_structure_fingerprint);
  assert.equal(post.proposal_total, baseline.proposal_total + createdCount);
  assert.equal(post.audit_total, baseline.audit_total + 1);
  assert.equal(createdCount + reusedCount, 2);
  stage = "postconditions_completed";

  console.log(JSON.stringify({
    boundary: "day128_daily_farm_brief_proposal_review_decision_isolated_e2e",
    result: "passed",
    e2e_proposals_created: createdCount,
    e2e_proposals_reused: reusedCount,
    pre_state_pending: true,
    approve_result: approve.result,
    proposal_update_count: approve.result === "recorded" ? approve.proposalUpdateCount : 0,
    audit_insert_count: approve.result === "recorded" ? approve.auditInsertCount : 0,
    transaction_committed: approve.result === "recorded" && approve.transactionCommitted,
    approve_post_state_verified: true,
    audit_event_verified: true,
    rollback_result: rollback.result,
    rollback_proposal_unchanged: true,
    protected_fixture_unchanged: true,
    other_proposals_unchanged: true,
    other_audit_events_unchanged: true,
    app_schema_unchanged: true,
    app_database_write_count: 0,
    proposal_apply_count: 0,
    production_connection_performed: false,
    retry_count: 0,
    raw_identifier_exposed: false,
    principal_ref_exposed: false,
  }, null, 2));
    return true;
  } catch (error) {
    console.error(JSON.stringify({
      boundary: "day128_daily_farm_brief_proposal_review_decision_isolated_e2e",
      result: "failed",
      failed_stage: stage,
      error_class: errorClassFor(stage, error),
      database_write_state: stage === "startup" || stage === "target_validated" || stage === "executor_created" || stage === "baseline_snapshot_started" || stage.startsWith("snapshot_") ? "not_started" : "unknown_fail_closed",
      production_connection_performed: false,
      retry_count: 0,
      raw_error_exposed: false,
    }));
    return false;
  }
}

if (!(await main())) process.exitCode = 1;
