import assert from "node:assert/strict";

import type { HermesDailyFarmBriefPersistenceCommand } from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HERMES_DAILY_FARM_BRIEF_CURRENT_VERSION_QUERY,
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV,
  HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV,
  createHermesDailyFarmBriefProductionRepositoryBundle,
  inspectHermesDailyFarmBriefRepositoryBundle,
  inspectHermesDailyFarmBriefRepositoryPair,
  resolveHermesDailyFarmBriefCanonicalCurrentVersionReadOnlyTransaction,
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
  let versionReads = 0;
  let writes = 0;
  const value: HermesDailyFarmBriefProductionRepositoryExecutor = {
    async executeReadOnly() { reads += 1; return { database_matches: true, user_present: true, transaction_read_only: true, rows: [] }; },
    async resolveCanonicalCurrentVersion() { versionReads += 1; return { schema_version: "hermes.daily_farm_brief.canonical_current_version_resolution.v1", status: "resolved", current_version: null, transaction_read_only: true, transaction_end: "commit", database_write_performed: false, write_executor_called: false, retry_count: 0, raw_record_exposed: false, raw_identifier_exposed: false, secret_exposed: false }; },
    async executeCanonicalTransition(_command: HermesDailyFarmBriefPersistenceCommand) { writes += 1; throw new Error("fixture write not expected"); },
  };
  return { value, counts: () => ({ reads, versionReads, writes }) };
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
assert.deepEqual(readOnlyExecutor.counts(), { reads: 0, versionReads: 0, writes: 0 });

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
assert.deepEqual(enabledExecutor.counts(), { reads: 0, versionReads: 0, writes: 0 });

class CurrentVersionClient {
  readonly calls: string[] = [];
  constructor(private readonly row: { canonical_count: unknown; current_version: unknown }, private readonly unavailable = false) {}
  async query<T extends Record<string, unknown> = Record<string, unknown>>(query: string): Promise<{ rows: T[] }> {
    this.calls.push(query);
    if (this.unavailable && query === HERMES_DAILY_FARM_BRIEF_CURRENT_VERSION_QUERY) throw new Error("repository unavailable detail");
    return { rows: (query === HERMES_DAILY_FARM_BRIEF_CURRENT_VERSION_QUERY ? [this.row] : []) as T[] };
  }
}

async function resolveRow(row: { canonical_count: unknown; current_version: unknown }) {
  const client = new CurrentVersionClient(row);
  const result = await resolveHermesDailyFarmBriefCanonicalCurrentVersionReadOnlyTransaction({ client, targetDate: "2026-07-17", initialize: async () => {} });
  return { result, calls: client.calls };
}

const emptyVersion = await resolveRow({ canonical_count: "0", current_version: null });
assert.equal(emptyVersion.result.current_version, null);
assert.deepEqual(emptyVersion.calls, ["begin transaction read only", HERMES_DAILY_FARM_BRIEF_CURRENT_VERSION_QUERY, "commit"]);
const versionOne = await resolveRow({ canonical_count: "1", current_version: 1 });
assert.equal(versionOne.result.current_version, 1);
assert.equal(versionOne.result.transaction_read_only, true);
assert.equal(versionOne.result.transaction_end, "commit");

for (const row of [
  { canonical_count: "2", current_version: null },
  { canonical_count: "1", current_version: 0 },
  { canonical_count: "1", current_version: -1 },
  { canonical_count: "1", current_version: 1.5 },
  { canonical_count: "1", current_version: "1" },
  { canonical_count: "1", current_version: null },
]) {
  const client = new CurrentVersionClient(row);
  const invalid = await resolveHermesDailyFarmBriefCanonicalCurrentVersionReadOnlyTransaction({ client, targetDate: "2026-07-17", initialize: async () => {} });
  assert.equal(invalid.status, "failed_closed");
  assert.equal(invalid.current_version, null);
  assert.equal(invalid.transaction_read_only, true);
  assert.equal(invalid.transaction_end, "rollback");
  assert.deepEqual(client.calls, ["begin transaction read only", HERMES_DAILY_FARM_BRIEF_CURRENT_VERSION_QUERY, "rollback"]);
}

let unavailableWrites = 0;
const unavailableExecutor: HermesDailyFarmBriefProductionRepositoryExecutor = {
  async executeReadOnly() { return { database_matches: true, user_present: true, transaction_read_only: true, rows: [] }; },
  async resolveCanonicalCurrentVersion() { throw new Error("repository unavailable detail"); },
  async executeCanonicalTransition() { unavailableWrites += 1; throw new Error("write not expected"); },
};
const unavailableBundle = createHermesDailyFarmBriefProductionRepositoryBundle({ ...VALID_ENV, [HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV]: "true" }, unavailableExecutor);
const unavailableResolution = await unavailableBundle.resolveCanonicalCurrentVersion("2026-07-17");
assert.equal(unavailableResolution.status, "failed_closed");
assert.equal(unavailableResolution.current_version, null);
assert.equal(unavailableResolution.database_write_performed, false);
assert.equal(unavailableResolution.write_executor_called, false);
assert.equal(unavailableResolution.retry_count, 0);
assert.equal(unavailableWrites, 0);

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
const serializedResolution = JSON.stringify([emptyVersion.result, versionOne.result, unavailableResolution]);
for (const forbidden of [DATABASE_CREDENTIAL_VALUE, VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_NAME, VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_USER, "record_id", "principal", "repository unavailable detail"]) assert.equal(serializedResolution.includes(forbidden), false);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_production_repository_bundle", current_version_zero: null, current_version_one: 1, invalid_current_versions: "failed_closed", resolver_transaction: "read_only_commit_or_rollback", missing_configuration: "denied", invalid_configuration: "denied", read_only_bundle: "matched_write_disabled", enabled_bundle: "matched", different_factory_instance: "not_matched", relation_override: "denied", transaction_call_count: 0, retry_count: 0, app_database_write_performed: false, proposal_saved: false, secret_exposed: false }));
