import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Pool } from "pg";

import { HermesDailyFarmBriefPrivilegeAdministratorExecutor, parseHermesDailyFarmBriefPrivilegeAdminEnvironment } from "../../src/lib/hermes/hermes_daily_farm_brief_privilege_administrator_executor";

const DATABASE_CREDENTIAL_VALUE = "test-value-c";
const ADMIN_ENV = {
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_ENABLED: "true",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST: "admin.db.internal",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT: "5432",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME: "farmos_core_production",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER: "daily_brief_privilege_admin",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD: DATABASE_CREDENTIAL_VALUE,
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_SSL_MODE: "verify-full",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_CONNECT_TIMEOUT_MS: "1000",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_STATEMENT_TIMEOUT_MS: "3000",
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;

assert.equal(parseHermesDailyFarmBriefPrivilegeAdminEnvironment({}, "farmos_core_production").admin, null);
assert.equal(parseHermesDailyFarmBriefPrivilegeAdminEnvironment({ ...ADMIN_ENV, HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT: "invalid" }, "farmos_core_production").admin, null);
const mismatch = parseHermesDailyFarmBriefPrivilegeAdminEnvironment(ADMIN_ENV, "other_production_candidate");
assert.equal(mismatch.targetMatches, false);
assert.equal(mismatch.admin, null);
const valid = parseHermesDailyFarmBriefPrivilegeAdminEnvironment(ADMIN_ENV, "farmos_core_production");
assert.equal(valid.targetMatches, true);
assert.ok(valid.admin);

const OWNER_VALUE = "fixture_owner_value";
const RUNTIME_VALUE = "fixture_runtime_value";
const catalog = {
  owner_role: OWNER_VALUE,
  runtime_role: RUNTIME_VALUE,
  records_owner_role: OWNER_VALUE,
  commands_owner_role: OWNER_VALUE,
  owner_eligible: true,
  runtime_eligible: true,
  signature_matches: true,
  security_definer: false,
  search_path_fixed: false,
  public_execute: false,
  runtime_execute: false,
  runtime_direct_dml: false,
};
const fingerprint = createHash("sha256").update(JSON.stringify(catalog)).digest("hex");

class FixturePool {
  transactionCount = 0;
  commits = 0;
  rollbacks = 0;
  constructor(private readonly options: { fingerprintMismatch?: boolean; postStateInvalid?: boolean; transactionFailure?: boolean } = {}) {}
  async connect() {
    const self = this;
    return {
      async query(text: string) {
        if (text.startsWith("begin")) self.transactionCount += 1;
        if (text === "commit") self.commits += 1;
        if (text === "rollback") self.rollbacks += 1;
        if (self.options.transactionFailure && text.startsWith("alter function")) throw new Error("fixture transaction failure");
        if (text.startsWith("select current_database()")) return { rows: [{ target: true, eligible: true }] };
        if (text.startsWith("with target as")) return { rows: [self.options.fingerprintMismatch ? { ...catalog, runtime_execute: true } : catalog] };
        if (text.startsWith("select\n        coalesce")) return { rows: [{ valid: !self.options.postStateInvalid }] };
        return { rows: [] };
      },
      release() {},
    };
  }
  async end() {}
}

function executor(pool: FixturePool) {
  assert.ok(valid.admin);
  return new HermesDailyFarmBriefPrivilegeAdministratorExecutor(valid.admin, pool as unknown as Pool);
}

const readinessPool = new FixturePool();
const readiness = await executor(readinessPool).inspectReviewedHardeningReadiness({ ownerRole: OWNER_VALUE, runtimeRole: RUNTIME_VALUE, expectedCatalogFingerprint: fingerprint }) as Record<string, unknown>;
assert.equal(readiness.catalog_fingerprint_matched, true);
assert.equal(readiness.transaction_rolled_back, true);
assert.equal(readinessPool.transactionCount, 1);
assert.equal(readinessPool.rollbacks, 1);

const successPool = new FixturePool();
const successExecutor = executor(successPool);
const success = await successExecutor.executeReviewedHardening({ ownerRole: OWNER_VALUE, runtimeRole: RUNTIME_VALUE, expectedCatalogFingerprint: fingerprint, priorState: { securityDefiner: false, searchPathFixed: false, publicExecute: false, runtimeExecute: false, runtimeDirectDml: false } }) as Record<string, unknown>;
const repeated = await successExecutor.executeReviewedHardening({ ownerRole: OWNER_VALUE, runtimeRole: RUNTIME_VALUE, expectedCatalogFingerprint: fingerprint, priorState: { securityDefiner: false, searchPathFixed: false, publicExecute: false, runtimeExecute: false, runtimeDirectDml: false } }) as Record<string, unknown>;
assert.equal(success.transaction_committed, true);
assert.equal(repeated.transaction_committed, true);
assert.equal(successPool.transactionCount, 2);
assert.equal(successPool.commits, 2);

for (const pool of [new FixturePool({ fingerprintMismatch: true }), new FixturePool({ postStateInvalid: true }), new FixturePool({ transactionFailure: true })]) {
  const result = await executor(pool).executeReviewedHardening({ ownerRole: OWNER_VALUE, runtimeRole: RUNTIME_VALUE, expectedCatalogFingerprint: fingerprint, priorState: { securityDefiner: false, searchPathFixed: false, publicExecute: false, runtimeExecute: false, runtimeDirectDml: false } }) as Record<string, unknown>;
  assert.equal(result.transaction_committed, false);
  assert.equal(result.transaction_rolled_back, true);
  assert.equal(pool.transactionCount, 1);
  assert.equal(pool.rollbacks, 1);
}

const safe = JSON.stringify({ available: valid.admin !== null, targetMatches: valid.targetMatches });
for (const forbidden of [DATABASE_CREDENTIAL_VALUE, ADMIN_ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST, ADMIN_ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME, ADMIN_ENV.HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER, OWNER_VALUE, RUNTIME_VALUE]) assert.equal(safe.includes(forbidden), false);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_privilege_administrator_executor", missing_admin_config: "denied", invalid_admin_config: "denied", target_mismatch: "denied", exact_config: "ready", caller_sql_accepted: false, caller_role_accepted: false, retry_count: 0, production_change_performed: false, raw_admin_credential_exposed: false, raw_role_exposed: false }));
