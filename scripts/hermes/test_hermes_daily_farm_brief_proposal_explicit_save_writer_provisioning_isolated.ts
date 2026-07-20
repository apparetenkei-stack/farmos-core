import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

import { HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_privilege_administrator_executor";
import { HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_database_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE,
  applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning";
import {
  PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning_executor";

const container = `farmos-day130-writer-${randomBytes(5).toString("hex")}`;
const credential = `writer-${randomBytes(24).toString("hex")}`;
const database = "farmos_core_writer_provisioning_test";
const bootstrapRole = "writer_provisioning_bootstrap";
const adminRole = "writer_provisioning_admin";
const reviewRole = "writer_provisioning_review_runtime";
const membershipRole = "writer_provisioning_membership_fixture";
const adminActor = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "isolated-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true };

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectEventually(port: number): Promise<Pool> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pool = new Pool({ host: "127.0.0.1", port, database, user: bootstrapRole, password: credential, ssl: false, connectionTimeoutMillis: 500, max: 1 });
    try { await pool.query("select 1"); return pool; }
    catch { await pool.end().catch(() => undefined); await delay(250); }
  }
  throw new Error("isolated_postgres_unavailable");
}

function environment(port: number) {
  const review = HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS;
  const privilege = HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV;
  return {
    [review.enabled]: "true", [review.host]: "127.0.0.1", [review.port]: String(port), [review.database]: database,
    [review.user]: reviewRole, [review.credential]: credential, [review.ssl]: "disable", [review.connect]: "1000", [review.statement]: "5000", [review.lock]: "1000",
    [privilege.enabled]: "true", [privilege.host]: "127.0.0.1", [privilege.port]: String(port), [privilege.database]: database,
    [privilege.user]: bootstrapRole, [privilege.credential]: credential, [privilege.sslMode]: "disable", [privilege.connectTimeout]: "1000", [privilege.statementTimeout]: "5000", [privilege.lockTimeout]: "1000",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.enabled]: "true",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION,
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.credential]: credential,
  };
}

class NoEndPool implements HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool {
  constructor(private readonly pool: Pool) {}
  async connect(): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient> {
    return await this.pool.connect() as unknown as HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient;
  }
  async end(): Promise<void> {}
}

class FailAfterRolePool implements HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool {
  constructor(private readonly pool: Pool) {}
  async connect(): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient> {
    const client = await this.pool.connect();
    return {
      async query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]) {
        if (sql.startsWith("grant connect on database")) throw new Error("controlled_failure");
        return await client.query(sql, parameters ? [...parameters] : undefined) as { rows: Row[]; rowCount: number | null };
      },
      release: () => client.release(),
    };
  }
  async end(): Promise<void> {}
}

let bootstrap: Pool | null = null;
let adminPool: Pool | null = null;
let started = false;
try {
  docker(["run", "--rm", "--detach", "--name", container, "--publish", "127.0.0.1::5432", "--env", `POSTGRES_DB=${database}`, "--env", `POSTGRES_USER=${bootstrapRole}`, "--env", `POSTGRES_PASSWORD=${credential}`, "postgres:17"]);
  started = true;
  const mapped = docker(["port", container, "5432/tcp"]);
  const match = /:(\d+)$/u.exec(mapped);
  assert(match !== null);
  const port = Number(match[1]);
  bootstrap = await connectEventually(port);
  await bootstrap.query(`
    create schema ai;
    create schema audit;
    create schema app;
    create schema sales;
    revoke all on schema ai,audit,app,sales from public;
    create table ai.proposal_inbox (id uuid primary key default gen_random_uuid(), status text not null default 'pending');
    create table ai.other_relation (id bigint primary key);
    create table audit.writer_events (id bigint primary key);
    create table app.work_items (id bigint primary key);
    create table sales.orders (id bigint primary key);
    create role ${reviewRole} login noinherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication password '${credential}';
    create role ${adminRole} login noinherit nosuperuser nobypassrls createrole nocreatedb noreplication password '${credential}';
    grant connect on database ${database} to ${adminRole} with grant option;
    grant usage on schema ai to ${adminRole} with grant option;
    grant select,insert on table ai.proposal_inbox to ${adminRole} with grant option;
  `);
  adminPool = new Pool({ host: "127.0.0.1", port, database, user: bootstrapRole, password: credential, ssl: false, max: 1 });
  const env = environment(port);
  const executor = (pool: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool = new NoEndPool(adminPool as Pool)): HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor =>
    new PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor({
      admin: { config: { port, database_name: database, ssl_mode: "disable", connect_timeout_ms: 1000, statement_timeout_ms: 5000, lock_timeout_ms: 1000 }, host: "127.0.0.1", user: bootstrapRole, credential },
      target: { host: "127.0.0.1", port, databaseName: database },
    }, pool);

  const beforeRows = await bootstrap.query("select count(*)::int as count from ai.proposal_inbox");
  assert.equal(beforeRows.rows[0]?.count, 0);

  const ready = await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() });
  assert.deepEqual([ready.result, ready.state, ready.evidence.rollback_performed, ready.evidence.database_mutation_performed], ["ready", "ready_to_apply", true, false]);

  const controlled = await applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, applyRequested: true, executorFactory: () => executor(new FailAfterRolePool(adminPool as Pool)) });
  assert.deepEqual([controlled.result, controlled.state, controlled.evidence.rollback_performed, controlled.evidence.transaction_committed], ["error", "rollback", true, false]);
  const afterControlled = await bootstrap.query("select exists(select 1 from pg_roles where rolname=$1) as role_present", [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE]);
  assert.equal(afterControlled.rows[0]?.role_present, false);

  const applied = await applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, applyRequested: true, executorFactory: () => executor() });
  assert.deepEqual([applied.result, applied.state, applied.evidence.role_created, applied.evidence.transaction_committed, applied.evidence.postcondition_valid], ["applied", "applied", true, true, true]);

  const repeated = await applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, applyRequested: true, executorFactory: () => executor() });
  assert.deepEqual([repeated.result, repeated.state, repeated.evidence.database_mutation_performed, repeated.evidence.rollback_performed], ["already_applied", "already_applied", false, true]);

  const final = await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() });
  assert.equal(final.result, "already_applied");
  assert.equal(final.evidence.postcondition_valid, true);

  await bootstrap.query(`grant update on ai.proposal_inbox to ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`revoke update on ai.proposal_inbox from ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);

  await bootstrap.query(`grant delete,truncate on ai.proposal_inbox to ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`revoke delete,truncate on ai.proposal_inbox from ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);

  await bootstrap.query(`grant create on schema ai to ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`revoke create on schema ai from ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);

  await bootstrap.query(`grant insert on ai.other_relation to ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`revoke insert on ai.other_relation from ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);

  await bootstrap.query(`alter role ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE} superuser createdb createrole bypassrls replication`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`alter role ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE} nosuperuser nocreatedb nocreaterole nobypassrls noreplication`);

  await bootstrap.query(`create role ${membershipRole} nologin; grant ${membershipRole} to ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}`);
  assert.equal((await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() })).state, "writer_contract_mismatch");
  await bootstrap.query(`revoke ${membershipRole} from ${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}; drop role ${membershipRole}`);

  const restored = await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: env, actor: adminActor, executorFactory: () => executor() });
  assert.equal(restored.result, "already_applied");
  assert.deepEqual([restored.evidence.proposal_update, restored.evidence.proposal_delete, restored.evidence.proposal_truncate, restored.evidence.schema_create, restored.evidence.other_relation_write, restored.evidence.audit_write, restored.evidence.app_sales_write], [false, false, false, false, false, false, false]);
  assert.deepEqual([restored.evidence.superuser, restored.evidence.createdb, restored.evidence.createrole, restored.evidence.bypassrls, restored.evidence.replication], [false, false, false, false, false]);

  const afterRows = await bootstrap.query("select count(*)::int as count from ai.proposal_inbox");
  assert.equal(afterRows.rows[0]?.count, 0);

  console.log(JSON.stringify({ result: "pass", boundary: "proposal_explicit_save_writer_provisioning_isolated_postgres", postgres_major_version: 17, diagnose_read_only: true, rollback_failure_preserved: true, role_created: true, exact_privileges: true, duplicate_apply_idempotent: true, unsafe_privilege_cases: 6, proposal_row_count: 0, proposal_save_performed: false, review_post_performed: false, proposal_apply_performed: false, production_connection_performed: false, production_mutation_performed: false, retry_count: 0, credential_exposed: false, raw_identifier_exposed: false }));
} finally {
  await adminPool?.end().catch(() => undefined);
  await bootstrap?.end().catch(() => undefined);
  if (started) {
    try { docker(["rm", "--force", container]); } catch { /* isolated cleanup best effort */ }
  }
}
