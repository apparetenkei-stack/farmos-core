import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import {
  DAY130_PRODUCTION_REVIEW_AUDIT_OWNER,
  DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL,
  DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION,
  applyDay130ProductionReviewProvisioning,
  diagnoseDay130ProductionReviewProvisioning,
  type Day130ProductionReviewProvisioningClient,
  type Day130ProductionReviewProvisioningPool,
} from "./provisioning/hermes_daily_farm_brief_production_review_provisioning";
import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV,
  createHermesDailyFarmBriefProposalProductionReviewAdapter,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_production_adapter";

const container = `farmos-day130-provisioning-${randomBytes(5).toString("hex")}`;
const credential = `day130-${randomBytes(12).toString("hex")}`;
const dailyBriefDatabase = "farmos_core_day130_daily_brief_test";
const proposalReviewDatabase = "farmos_core_day130_proposal_review_test";
const bootstrapRole = "day130_bootstrap";
const adminRole = "day130_provisioning_admin";
const runtimeRole = "day130_production_review_runtime";
const dailyBriefRuntimeRole = "day130_daily_brief_runtime";

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectEventually(port: number, database: string): Promise<Pool> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pool = new Pool({
      host: "127.0.0.1",
      port,
      database,
      user: bootstrapRole,
      password: credential,
      ssl: false,
      connectionTimeoutMillis: 500,
      max: 1,
    });
    try {
      await pool.query("select 1");
      return pool;
    } catch {
      await pool.end().catch(() => undefined);
      await delay(250);
    }
  }
  throw new Error("isolated_postgres_unavailable");
}

function environment(port: number) {
  const shared = {
    HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_ENABLED: "true",
    HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION:
      DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION,
    HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true",
    HERMES_DAILY_BRIEF_DATABASE_HOST: "127.0.0.1",
    HERMES_DAILY_BRIEF_DATABASE_PORT: String(port),
    HERMES_DAILY_BRIEF_DATABASE_NAME: dailyBriefDatabase,
    HERMES_DAILY_BRIEF_DATABASE_USER: dailyBriefRuntimeRole,
    HERMES_DAILY_BRIEF_DATABASE_PASSWORD: credential,
    HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "disable",
    HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000",
    HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "5000",
    HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENABLED: "true",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_HOST: "127.0.0.1",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PORT: String(port),
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_NAME: proposalReviewDatabase,
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_USER: runtimeRole,
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PASSWORD: credential,
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_SSL_MODE: "disable",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_CONNECT_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_STATEMENT_TIMEOUT_MS: "5000",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_LOCK_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_ENABLED: "true",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST: "127.0.0.1",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT: String(port),
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME: proposalReviewDatabase,
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER: adminRole,
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD: credential,
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_SSL_MODE: "disable",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_CONNECT_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_STATEMENT_TIMEOUT_MS: "5000",
    HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_LOCK_TIMEOUT_MS: "1000",
  } as const;
  return shared;
}

class FailAfterAuditTablePool implements Day130ProductionReviewProvisioningPool {
  constructor(private readonly pool: Pool) {}
  async connect(): Promise<Day130ProductionReviewProvisioningClient> {
    const client = await this.pool.connect();
    return {
      async query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]) {
        const result = await client.query(sql, parameters ? [...parameters] : undefined);
        if (sql === DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL) throw new Error("controlled_isolated_failure");
        return result as { rows: Row[]; rowCount: number | null };
      },
      release: () => client.release(),
    };
  }
  async end(): Promise<void> {}
}

let bootstrap: Pool | null = null;
let dailyBriefBootstrap: Pool | null = null;
let adminPool: Pool | null = null;
let started = false;
try {
  docker([
    "run", "--rm", "--detach", "--name", container,
    "--publish", "127.0.0.1::5432",
    "--env", `POSTGRES_DB=${proposalReviewDatabase}`,
    "--env", `POSTGRES_USER=${bootstrapRole}`,
    "--env", `POSTGRES_PASSWORD=${credential}`,
    "postgres:17",
  ]);
  started = true;
  const mapped = docker(["port", container, "5432/tcp"]);
  const match = /:(\d+)$/u.exec(mapped);
  assert(match !== null, "isolated port contract invalid");
  const port = Number(match[1]);
  bootstrap = await connectEventually(port, proposalReviewDatabase);
  await bootstrap.query(`create database ${dailyBriefDatabase}`);
  dailyBriefBootstrap = new Pool({ host: "127.0.0.1", port, database: dailyBriefDatabase, user: bootstrapRole, password: credential, ssl: false, max: 1 });
  await bootstrap.query(`
    create schema ai;
    revoke all on schema ai from public;
    create table ai.proposal_inbox (
      id uuid primary key default gen_random_uuid(),
      proposal_type text not null,
      title text not null,
      body text not null,
      payload_json jsonb not null default '{}'::jsonb,
      source_refs_json jsonb not null default '[]'::jsonb,
      model_name text,
      agent_name text,
      confidence numeric(4,3),
      reason text,
      risk_level text not null default 'low',
      status text not null default 'pending',
      reviewed_by text,
      reviewed_at timestamptz,
      review_note text,
      applied_at timestamptz,
      applied_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create role ${runtimeRole} login password '${credential}' noinherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication;
    create role ${dailyBriefRuntimeRole} login password '${credential}' noinherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication;
    create role ${adminRole} login password '${credential}' noinherit nosuperuser nobypassrls createrole nocreatedb noreplication;
    grant usage on schema ai to ${runtimeRole};
    grant create on database ${proposalReviewDatabase} to ${adminRole} with grant option;
    grant usage on schema ai to ${adminRole} with grant option;
    grant references (id) on table ai.proposal_inbox to ${adminRole} with grant option;
    grant select on table ai.proposal_inbox to ${adminRole} with grant option;
    grant update (status,reviewed_by,reviewed_at,review_note,updated_at) on table ai.proposal_inbox to ${adminRole} with grant option;
  `);
  await dailyBriefBootstrap.query(`
    create schema ai;
    revoke all on schema ai from public;
    create table ai.daily_farm_brief_records (id uuid primary key default gen_random_uuid());
    grant usage on schema ai to ${dailyBriefRuntimeRole};
    grant select on table ai.daily_farm_brief_records to ${dailyBriefRuntimeRole};
  `);
  const splitFactsA = await dailyBriefBootstrap.query("select to_regclass('ai.daily_farm_brief_records') is not null as daily_present,to_regclass('ai.proposal_inbox') is not null as proposal_present");
  const splitFactsB = await bootstrap.query("select to_regclass('ai.daily_farm_brief_records') is not null as daily_present,to_regclass('ai.proposal_inbox') is not null as proposal_present");
  assert.deepEqual(splitFactsA.rows[0], { daily_present: true, proposal_present: false });
  assert.deepEqual(splitFactsB.rows[0], { daily_present: false, proposal_present: true });
  const env = environment(port);
  adminPool = new Pool({ host: "127.0.0.1", port, database: proposalReviewDatabase, user: adminRole, password: credential, ssl: false, max: 1 });

  const readiness = await diagnoseDay130ProductionReviewProvisioning(env, { pool: adminPool as unknown as Day130ProductionReviewProvisioningPool });
  assert.equal(readiness.state, "ready_to_apply");
  assert.equal(readiness.database_mutation_performed, false);
  assert.equal(readiness.rollback_performed, true);

  const controlled = await applyDay130ProductionReviewProvisioning(env, { pool: new FailAfterAuditTablePool(adminPool) });
  assert.equal(controlled.state, "atomic_write_failed");
  assert.equal(controlled.rollback_performed, true);
  assert.equal(controlled.database_mutation_performed, false);
  const afterRollback = await bootstrap.query(`select jsonb_build_object(
    'owner_absent',not exists(select 1 from pg_roles where rolname=$1),
    'audit_absent',to_regnamespace('audit') is null,
    'runtime_select',has_table_privilege($2,'ai.proposal_inbox','SELECT')
  ) evidence`, [DAY130_PRODUCTION_REVIEW_AUDIT_OWNER, runtimeRole]);
  assert.deepEqual(afterRollback.rows[0]?.evidence, { owner_absent: true, audit_absent: true, runtime_select: false });

  const applied = await applyDay130ProductionReviewProvisioning(env, { pool: adminPool as unknown as Day130ProductionReviewProvisioningPool });
  assert.equal(applied.result, "applied");
  assert.equal(applied.owner_created, true);
  assert.equal(applied.audit_schema_created, true);
  assert.equal(applied.audit_table_created, true);
  assert.equal(applied.indexes_created, 3);
  assert.equal(applied.transaction_committed, true);
  assert.equal(applied.postcondition_valid, true);

  const repeated = await applyDay130ProductionReviewProvisioning(env, { pool: adminPool as unknown as Day130ProductionReviewProvisioningPool });
  assert.equal(repeated.result, "already_applied");
  assert.equal(repeated.database_mutation_performed, false);
  assert.equal(repeated.transaction_committed, false);
  assert.equal(repeated.rollback_performed, true);
  assert.equal(repeated.retry_count, 0);

  const final = await diagnoseDay130ProductionReviewProvisioning(env, { pool: adminPool as unknown as Day130ProductionReviewProvisioningPool });
  assert.equal(final.result, "already_applied");
  assert.equal(final.postcondition_valid, true);

  const adapter = await createHermesDailyFarmBriefProposalProductionReviewAdapter({
    environment: { ...env, [HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV]: "true" },
    authentication: {
      schema_version: "hermes.daily_farm_brief.authentication_result.v1",
      status: "authenticated",
      principal_ref: "isolated-administrator",
    },
    actor: {
      schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
      principal_ref: "isolated-administrator",
      role: "administrator",
      allowed_scope_keys: [],
      authorization_verified: true,
    },
  });
  assert.equal(adapter.readiness.state, "ready");
  assert(adapter.readRepository);
  assert.deepEqual(await adapter.readRepository.listDailyBriefProposalRows(100), []);
  await adapter.close();

  console.log(JSON.stringify({
    result: "pass",
    boundary: "day130_production_review_provisioning_isolated_postgres",
    isolated_apply_test: "PASS",
    second_run_idempotent: "PASS",
    rollback_test: "PASS",
    split_database_test: "PASS",
    review_repository_isolated: "PASS",
    retry_count: 0,
    production_connection_performed: false,
    production_provisioning_performed: false,
    production_review_post_attempt: 0,
    credential_exposed: false,
    raw_identifier_exposed: false,
  }));
} finally {
  await adminPool?.end().catch(() => undefined);
  await dailyBriefBootstrap?.end().catch(() => undefined);
  await bootstrap?.end().catch(() => undefined);
  if (started) {
    try { docker(["stop", "--time", "1", container]); } catch { /* disposable fixture cleanup */ }
  }
}
