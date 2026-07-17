import assert from "node:assert/strict";

import type { HermesDailyFarmBriefPersistenceCommand } from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV,
  HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV,
  createHermesDailyFarmBriefProductionRepositoryBundle,
  inspectHermesDailyFarmBriefRepositoryBundle,
  inspectHermesDailyFarmBriefRepositoryPair,
  type HermesDailyFarmBriefProductionRepositoryExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

const DATABASE_CREDENTIAL_VALUE = "test-value-c";
const VALID_ENV = {
  HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true",
  HERMES_DAILY_BRIEF_DATABASE_HOST: "db.internal",
  HERMES_DAILY_BRIEF_DATABASE_PORT: "5432",
  HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_production",
  HERMES_DAILY_BRIEF_DATABASE_USER: "hermes_reader",
  HERMES_DAILY_BRIEF_DATABASE_PASSWORD: DATABASE_CREDENTIAL_VALUE,
  HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "verify-full",
  HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000",
  HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "3000",
  HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;

function executor() {
  let reads = 0;
  let writes = 0;
  const value: HermesDailyFarmBriefProductionRepositoryExecutor = {
    async executeReadOnly() { reads += 1; return { database_matches: true, user_present: true, transaction_read_only: true, rows: [] }; },
    async executeCanonicalTransition(_command: HermesDailyFarmBriefPersistenceCommand) { writes += 1; throw new Error("fixture write not expected"); },
  };
  return { value, counts: () => ({ reads, writes }) };
}

const missing = createHermesDailyFarmBriefProductionRepositoryBundle({}, executor().value);
assert.equal(missing.state, "denied");
assert.equal(inspectHermesDailyFarmBriefRepositoryBundle(missing).matched, false);

const invalid = createHermesDailyFarmBriefProductionRepositoryBundle({ ...VALID_ENV, HERMES_DAILY_BRIEF_DATABASE_PORT: "invalid" }, executor().value);
assert.equal(invalid.state, "denied");
assert.equal(inspectHermesDailyFarmBriefRepositoryBundle(invalid).matched, false);

const readOnlyExecutor = executor();
const readOnly = createHermesDailyFarmBriefProductionRepositoryBundle(VALID_ENV, readOnlyExecutor.value);
const readOnlyIdentity = inspectHermesDailyFarmBriefRepositoryBundle(readOnly);
assert.equal(readOnly.state, "ready");
assert.equal(readOnly.write_state, "disabled");
assert.equal(readOnlyIdentity.matched, true);
assert.equal(readOnlyIdentity.write_capability, "disabled");
assert.deepEqual(readOnlyExecutor.counts(), { reads: 0, writes: 0 });

const enabledExecutor = executor();
const enabled = createHermesDailyFarmBriefProductionRepositoryBundle({ ...VALID_ENV, [HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV]: "true" }, enabledExecutor.value);
const enabledIdentity = inspectHermesDailyFarmBriefRepositoryBundle(enabled);
assert.equal(enabled.state, "ready");
assert.equal(enabled.write_state, "enabled");
assert.equal(enabledIdentity.matched, true);
assert.equal(enabledIdentity.shared_connection_source, true);
assert.equal(enabledIdentity.shared_repository_factory, true);
assert.equal(enabledIdentity.read_capability, true);
assert.equal(enabledIdentity.write_capability, "enabled");
assert.deepEqual(enabledExecutor.counts(), { reads: 0, writes: 0 });

const other = createHermesDailyFarmBriefProductionRepositoryBundle({ ...VALID_ENV, [HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV]: "true" }, executor().value);
assert.equal(inspectHermesDailyFarmBriefRepositoryPair(enabled.writeRepository as object, enabled.readRepository as object).matched, true);
assert.equal(inspectHermesDailyFarmBriefRepositoryPair(enabled.writeRepository as object, other.readRepository as object).matched, false);

for (const override of [HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.records, HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.commands]) {
  const rejected = createHermesDailyFarmBriefProductionRepositoryBundle({ ...VALID_ENV, [override]: "untrusted.relation" }, executor().value);
  assert.equal(rejected.state, "denied");
  assert.equal(inspectHermesDailyFarmBriefRepositoryBundle(rejected).matched, false);
}

const serialized = JSON.stringify({ missing: inspectHermesDailyFarmBriefRepositoryBundle(missing), readOnly: readOnlyIdentity, enabled: enabledIdentity });
assert.equal(serialized.includes(DATABASE_CREDENTIAL_VALUE), false);
assert.equal(serialized.includes(VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_NAME), false);
assert.equal(serialized.includes(VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_USER), false);
assert.equal(enabledExecutor.counts().writes, 0);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_production_repository_bundle", missing_configuration: "denied", invalid_configuration: "denied", read_only_bundle: "matched_write_disabled", enabled_bundle: "matched", different_factory_instance: "not_matched", relation_override: "denied", transaction_call_count: 0, retry_count: 0, app_database_write_performed: false, proposal_saved: false, secret_exposed: false }));
