import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DAY130_PRODUCTION_REVIEW_AUDIT_OWNER,
  DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL,
  DAY130_PRODUCTION_REVIEW_INDEX_SQL,
  DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION,
  DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL,
  applyDay130ProductionReviewProvisioning,
  diagnoseDay130ProductionReviewProvisioning,
  type Day130ProductionReviewProvisioningClient,
  type Day130ProductionReviewProvisioningPool,
} from "./provisioning/hermes_daily_farm_brief_production_review_provisioning";

const ENV = {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_ENABLED: "true",
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION:
    DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION,
  HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true",
  HERMES_DAILY_BRIEF_DATABASE_HOST: "runtime.fixture.invalid",
  HERMES_DAILY_BRIEF_DATABASE_PORT: "5432",
  HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_production_candidate",
  HERMES_DAILY_BRIEF_DATABASE_USER: "proposal_review_runtime_fixture",
  HERMES_DAILY_BRIEF_DATABASE_PASSWORD: "runtime-credential-fixture",
  HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "verify-full",
  HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000",
  HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "3000",
  HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "500",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_ENABLED: "true",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST: "admin.fixture.invalid",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT: "5432",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME: "farmos_core_production_candidate",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER: "proposal_review_admin_fixture",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD: "admin-credential-fixture",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_SSL_MODE: "verify-full",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_CONNECT_TIMEOUT_MS: "1000",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_STATEMENT_TIMEOUT_MS: "3000",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;

type Evidence = {
  target_matches: boolean;
  administrator_safe: boolean;
  administrator_can_provision: boolean;
  owner_present: boolean;
  owner_contract_valid: boolean;
  proposal_contract_valid: boolean;
  audit_schema_present: boolean;
  audit_schema_contract_valid: boolean;
  audit_table_present: boolean;
  audit_table_contract_valid: boolean;
  audit_indexes_present: number;
  audit_indexes_contract_valid: boolean;
  runtime_safe: boolean;
  forbidden_privileges_absent: boolean;
  runtime_privileges_exact: boolean;
};

const READY: Evidence = {
  target_matches: true,
  administrator_safe: true,
  administrator_can_provision: true,
  owner_present: false,
  owner_contract_valid: false,
  proposal_contract_valid: true,
  audit_schema_present: false,
  audit_schema_contract_valid: false,
  audit_table_present: false,
  audit_table_contract_valid: false,
  audit_indexes_present: 0,
  audit_indexes_contract_valid: false,
  runtime_safe: true,
  forbidden_privileges_absent: true,
  runtime_privileges_exact: false,
};

const APPLIED: Evidence = {
  ...READY,
  owner_present: true,
  owner_contract_valid: true,
  audit_schema_present: true,
  audit_schema_contract_valid: true,
  audit_table_present: true,
  audit_table_contract_valid: true,
  audit_indexes_present: 3,
  audit_indexes_contract_valid: true,
  runtime_privileges_exact: true,
};

class FixturePool implements Day130ProductionReviewProvisioningPool {
  begins = 0;
  commits = 0;
  rollbacks = 0;
  mutationStatements = 0;
  inspections = 0;
  queries: string[] = [];
  constructor(
    private readonly initial: Evidence,
    private readonly options: {
      after?: Evidence;
      connectionFailure?: boolean;
      failOn?: RegExp;
      commitFailure?: boolean;
    } = {},
  ) {}
  async connect(): Promise<Day130ProductionReviewProvisioningClient> {
    if (this.options.connectionFailure) throw new Error("fixture connection unavailable");
    const self = this;
    return {
      async query<Row = Record<string, unknown>>(sql: string) {
        self.queries.push(sql);
        if (sql.startsWith("begin")) self.begins += 1;
        if (sql === "commit") {
          if (self.options.commitFailure) throw new Error("fixture commit failure");
          self.commits += 1;
        }
        if (sql === "rollback") self.rollbacks += 1;
        if (/^(?:create|grant|do |set local role)/u.test(sql)) self.mutationStatements += 1;
        if (self.options.failOn?.test(sql)) throw new Error("fixture atomic failure");
        if (sql.includes("jsonb_build_object") && sql.includes("administrator_can_provision")) {
          const evidence = self.inspections === 0 ? self.initial : self.options.after ?? self.initial;
          self.inspections += 1;
          return { rows: [{ evidence }] as unknown as Row[] };
        }
        return { rows: [] as Row[] };
      },
      release() {},
    };
  }
  async end() {}
}

assert.equal((await diagnoseDay130ProductionReviewProvisioning({})).state, "disabled");
assert.equal((await diagnoseDay130ProductionReviewProvisioning({
  ...ENV,
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION: "wrong",
})).state, "disabled");
assert.equal((await diagnoseDay130ProductionReviewProvisioning({
  ...ENV,
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD: undefined,
})).state, "environment_missing");
assert.equal((await diagnoseDay130ProductionReviewProvisioning({
  ...ENV,
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME: "other_production_candidate",
})).state, "target_mismatch");

for (const [change, expected] of [
  [{ administrator_safe: false }, "administrator_principal_unsafe"],
  [{ administrator_can_provision: false }, "administrator_principal_unsafe"],
  [{ owner_present: true, owner_contract_valid: false }, "owner_contract_mismatch"],
  [{ proposal_contract_valid: false }, "proposal_contract_mismatch"],
  [{ audit_schema_present: true, audit_schema_contract_valid: false }, "audit_contract_mismatch"],
  [{ audit_table_present: true, audit_table_contract_valid: false }, "audit_contract_mismatch"],
  [{ runtime_safe: false }, "runtime_principal_unsafe"],
  [{ forbidden_privileges_absent: false }, "forbidden_privilege_present"],
] as const) {
  const pool = new FixturePool({ ...READY, ...change });
  assert.equal((await diagnoseDay130ProductionReviewProvisioning(ENV, { pool })).state, expected);
  assert.equal(pool.begins, 1);
  assert.equal(pool.rollbacks, 1);
  assert.equal(pool.mutationStatements, 0);
}

const unavailable = new FixturePool(READY, { connectionFailure: true });
assert.equal((await diagnoseDay130ProductionReviewProvisioning(ENV, { pool: unavailable })).state, "administrator_connection_unavailable");

const createPool = new FixturePool(READY, { after: APPLIED });
const created = await applyDay130ProductionReviewProvisioning(ENV, { pool: createPool });
assert.equal(created.result, "applied");
assert.equal(created.owner_created, true);
assert.equal(created.audit_schema_created, true);
assert.equal(created.audit_table_created, true);
assert.equal(created.indexes_created, 3);
assert.equal(created.runtime_privileges_applied, true);
assert.equal(created.transaction_committed, true);
assert.equal(created.database_mutation_performed, true);
assert.equal(createPool.begins, 1);
assert.equal(createPool.commits, 1);
assert.equal(createPool.rollbacks, 0);

const existingObjects = new FixturePool({
  ...READY,
  owner_present: true,
  owner_contract_valid: true,
  audit_schema_present: true,
  audit_schema_contract_valid: true,
  audit_table_present: true,
  audit_table_contract_valid: true,
  audit_indexes_present: 3,
  audit_indexes_contract_valid: true,
}, { after: APPLIED });
const grantsOnly = await applyDay130ProductionReviewProvisioning(ENV, { pool: existingObjects });
assert.equal(grantsOnly.owner_created, false);
assert.equal(grantsOnly.audit_schema_created, false);
assert.equal(grantsOnly.audit_table_created, false);
assert.equal(grantsOnly.runtime_privileges_applied, true);

const repeatedPool = new FixturePool(APPLIED);
const repeated = await applyDay130ProductionReviewProvisioning(ENV, { pool: repeatedPool });
assert.equal(repeated.result, "already_applied");
assert.equal(repeated.database_mutation_performed, false);
assert.equal(repeated.transaction_committed, false);
assert.equal(repeated.rollback_performed, true);
assert.equal(repeatedPool.mutationStatements, 0);

const rollbackPool = new FixturePool(READY, { after: APPLIED, failOn: /^create table/u });
const rolledBack = await applyDay130ProductionReviewProvisioning(ENV, { pool: rollbackPool });
assert.equal(rolledBack.result, "failed");
assert.equal(rolledBack.state, "atomic_write_failed");
assert.equal(rolledBack.rollback_performed, true);
assert.equal(rolledBack.database_mutation_performed, false);
assert.equal(rollbackPool.commits, 0);
assert.equal(rollbackPool.rollbacks, 1);

const verificationPool = new FixturePool(READY, { after: { ...APPLIED, runtime_privileges_exact: false } });
const verification = await applyDay130ProductionReviewProvisioning(ENV, { pool: verificationPool });
assert.equal(verification.state, "verification_failed");
assert.equal(verification.rollback_performed, true);
assert.equal(verification.database_mutation_performed, false);

const commitPool = new FixturePool(READY, { after: APPLIED, commitFailure: true });
const commitFailure = await applyDay130ProductionReviewProvisioning(ENV, { pool: commitPool });
assert.equal(commitFailure.state, "atomic_write_failed");
assert.equal(commitFailure.database_mutation_performed, false);
assert.equal(commitFailure.retry_count, 0);
assert.equal(commitPool.begins, 1);

const compact = (value: string) => value.toLowerCase().replace(/\s+/gu, "");
const ddlPlan = readFileSync(new URL("../sql/day130_daily_farm_brief_production_review_audit_contract.sql", import.meta.url), "utf8")
  .replaceAll(':"audit_owner_role"', `"${DAY130_PRODUCTION_REVIEW_AUDIT_OWNER}"`);
const privilegePlan = readFileSync(new URL("../sql/day130_daily_farm_brief_production_review_privileges.sql", import.meta.url), "utf8")
  .replaceAll(':"production_review_role"', '"proposal_review_runtime_fixture"');
assert.ok(compact(ddlPlan).includes(compact(DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL)));
for (const sql of DAY130_PRODUCTION_REVIEW_INDEX_SQL) assert.ok(compact(ddlPlan).includes(compact(sql)));
for (const sql of Object.values(DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL).map((factory) => factory('"proposal_review_runtime_fixture"'))) {
  assert.ok(compact(privilegePlan).includes(compact(sql)));
}

const moduleSource = readFileSync(new URL("./provisioning/hermes_daily_farm_brief_production_review_provisioning.ts", import.meta.url), "utf8");
const runnerSource = readFileSync(new URL("./run_hermes_daily_farm_brief_production_review_provisioning.ts", import.meta.url), "utf8");
assert.doesNotMatch(moduleSource, /sqlFile|sqlPath|schemaName|tableName|ownerRole|runtimeRole:\s*string[^;]*apply/u);
assert.doesNotMatch(moduleSource, /retry\s*\(/u);
assert.match(moduleSource, /pg_advisory_xact_lock/u);
assert.match(moduleSource, /begin isolation level serializable/u);
assert.match(moduleSource, /grant references \(id\)/u);
assert.match(moduleSource, /grant update \(status,reviewed_by,reviewed_at,review_note,updated_at\)/u);
assert.doesNotMatch(moduleSource, /grant update on table ai\.proposal_inbox/iu);
assert.doesNotMatch(moduleSource, /delete from|truncate table|drop table|drop schema|drop role/iu);
assert.match(runnerSource, /process\.argv\.length === 3/u);
assert.match(runnerSource, /process\.argv\[2\] === "--apply"/u);

const routeFiles = [
  "../../src/app/api/hermes/daily-farm-brief/proposals/route.ts",
  "../../src/app/api/hermes/daily-farm-brief/proposals/[proposalRef]/route.ts",
  "../../src/app/api/hermes/daily-farm-brief/proposals/[proposalRef]/review/route.ts",
];
for (const relative of routeFiles) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  assert.doesNotMatch(source, /ProductionReviewProvisioning|production_review_provisioning|PROVISIONING_ENABLED/u);
}

const safeOutput = JSON.stringify(created);
for (const forbidden of [
  ENV.HERMES_DAILY_BRIEF_DATABASE_NAME,
  ENV.HERMES_DAILY_BRIEF_DATABASE_HOST,
  ENV.HERMES_DAILY_BRIEF_DATABASE_USER,
  ENV.HERMES_DAILY_BRIEF_DATABASE_PASSWORD,
  ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST,
  ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER,
  ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD,
  DAY130_PRODUCTION_REVIEW_AUDIT_OWNER,
]) assert.equal(safeOutput.includes(forbidden), false);

console.log(JSON.stringify({
  result: "pass",
  boundary: "day130_production_review_fixed_provisioning",
  arbitrary_sql_execution: false,
  caller_role_input: false,
  caller_object_input: false,
  http_apply_exposed: false,
  second_run_idempotent: true,
  rollback_verified: true,
  retry_count: 0,
  production_connection_performed: false,
  production_provisioning_performed: false,
  raw_identifier_exposed: false,
  credential_exposed: false,
}));
