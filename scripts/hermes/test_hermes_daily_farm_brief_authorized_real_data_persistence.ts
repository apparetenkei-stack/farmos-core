import assert from "node:assert/strict";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_CONFIRMATION_VALUE,
  HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV,
  prepareHermesDailyFarmBriefRealDataPersistence,
  runHermesDailyFarmBriefAuthorizedRealDataPersistence,
} from "./brief_runtime/hermes_daily_farm_brief_authorized_real_data_persistence";
import {
  HermesDailyFarmBriefFixturePersistenceRepository,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import type { HermesDailyFarmBriefAuthenticatedActorContext } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  createHermesDailyFarmBriefFixtureRepositoryBundle,
  type HermesDailyFarmBriefRepositoryBundle,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

const TARGET_DATE = "2026-07-17" as const;
const GENERATED_AT = "2026-07-17T01:00:00.000Z";

function source<T>(type: "inventory" | "work_log" | "field" | "crop_cycle", records: T[]) {
  const endpoint = type === "inventory" ? "/api/farmos-core/inventory-summary" : type === "work_log" ? "/api/farmos-core/recent-work-logs" : type === "field" ? "/api/farmos-core/fields" : "/api/farmos-core/crop-cycles";
  const responseSource = type === "inventory" ? "apparetenkei_inventory_readonly" : type === "work_log" ? "apparetenkei_work_logs_readonly" : type === "field" ? "apparetenkei_fields_readonly" : "apparetenkei_crop_cycles_readonly";
  return { result: "ok" as const, source_type: type, endpoint_path: endpoint, http_method: "GET" as const, fetch_performed: true, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: responseSource, generated_at: GENERATED_AT, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function operational(input: { changed?: boolean } = {}): HermesOperationalReadonlyClientResult {
  const inventory = Array.from({ length: 7 }, (_, index) => ({ id: `inventory-${index}`, name: `material ${index}`, baseType: "material", currentQuantity: index + 1, unit: "kg" }));
  const fields = Array.from({ length: 71 }, (_, index) => ({ reference: `field-${index}`, display_name: `field ${index}`, active_state: "unknown" as const, source_updated_at: null }));
  const cropCycles = Array.from({ length: 40 }, (_, index) => ({ reference: `cycle-${index}`, field_references: [`field-${index}`], crop_display_name: `crop ${index}`, cycle_state: "unknown" as const, operational_start_date: "2026-07-01", source_updated_at: null }));
  const workLogs = Array.from({ length: 100 }, (_, index) => ({ id: `work-${index}`, startedAt: index < 6 ? null : GENERATED_AT, fieldId: `field-${index % 40}`, workTypeId: null, workTypeName: input.changed && index === 0 ? "changed work" : `work ${index}`, durationMinutes: 30, targetCrop: `crop ${index % 40}`, cropCycleId: `cycle-${index % 40}`, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null }));
  return {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client",
    inventory: source("inventory", inventory), work_log: source("work_log", workLogs), field: source("field", fields), crop_cycle: source("crop_cycle", cropCycles),
    inventory_source_connected: true, work_log_source_connected: true, field_source_connected: true, crop_cycle_source_connected: true, external_fetch_performed: true,
    hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false,
    app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  } as HermesOperationalReadonlyClientResult;
}

function actor(role: "administrator" | "general_staff"): HermesDailyFarmBriefAuthenticatedActorContext {
  return { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: `day123-${role}`, role, allowed_scope_keys: [], authorization_verified: true };
}

function environment(confirmed = true): Record<string, string> {
  return confirmed ? { [HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.enabled]: "true", [HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_CONFIRMATION_VALUE } : {};
}

function prepared(changed = false) {
  return prepareHermesDailyFarmBriefRealDataPersistence({ targetDate: TARGET_DATE, generatedAt: GENERATED_AT, readOperationalSources: async () => operational({ changed }), readMemoryContext: async () => ({ result: "error" }) });
}

function input(repository: HermesDailyFarmBriefFixturePersistenceRepository, overrides: Partial<Parameters<typeof runHermesDailyFarmBriefAuthorizedRealDataPersistence>[0]> = {}) {
  const { repositoryBundle, ...rest } = overrides;
  return {
    mode: "persist" as const, environment: environment(), targetDate: TARGET_DATE, generatedAt: GENERATED_AT, prepare: () => prepared(), expectedCurrentVersion: null,
    repositoryBundle: repositoryBundle ?? createHermesDailyFarmBriefFixtureRepositoryBundle(repository), administratorActor: actor("administrator"), generalStaffActor: actor("general_staff"), ...rest,
  };
}

const disabledRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
const disabled = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(disabledRepository, { environment: environment(false) }));
assert.equal(disabled.result, "preflight");
assert.equal(disabled.persistence_enabled, false);
assert.equal(disabledRepository.transactionCallCount, 0);

const dryRunRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
const dryRun = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(dryRunRepository, { mode: "dry_run" }));
assert.equal(dryRun.result, "preflight");
assert.equal(dryRun.target_repository_identity_check, "matched");
assert.equal(dryRunRepository.transactionCallCount, 0);
assert.deepEqual(dryRun.source_coverage.map((item) => [item.source_type, item.source_record_count, item.input_record_count]), [["inventory", 7, 7], ["work_log", 100, 10], ["field", 71, 20], ["crop_cycle", 40, 20], ["hermes_note", 0, 0]]);
const workLogCoverage = dryRun.source_coverage.find((item) => item.source_type === "work_log");
assert.ok(workLogCoverage && workLogCoverage.selected_fact_count > 0);
assert.equal(workLogCoverage.attention_count, workLogCoverage.selected_fact_count);
assert.equal(dryRun.source_coverage.find((item) => item.source_type === "hermes_note")?.selected_fact_count, 0);
assert.equal(dryRun.relation_validation, "passed");

const mismatchRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
const otherBundle = createHermesDailyFarmBriefFixtureRepositoryBundle(new HermesDailyFarmBriefFixturePersistenceRepository());
const mismatchedBundle = { ...createHermesDailyFarmBriefFixtureRepositoryBundle(mismatchRepository), readRepository: otherBundle.readRepository } as HermesDailyFarmBriefRepositoryBundle;
const mismatch = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(mismatchRepository, { repositoryBundle: mismatchedBundle }));
assert.equal(mismatch.target_repository_identity_check, "not_matched");
assert.equal(mismatchRepository.transactionCallCount, 0);

let datePrepareCalls = 0;
const dateMismatch = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(new HermesDailyFarmBriefFixturePersistenceRepository(), { generatedAt: "2026-07-18T01:00:00.000Z", prepare: async () => { datePrepareCalls += 1; return null; } }));
assert.equal(dateMismatch.stage, "date");
assert.equal(datePrepareCalls, 0);

const repository = new HermesDailyFarmBriefFixturePersistenceRepository();
const inserted = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(repository));
assert.equal(inserted.result, "inserted");
assert.equal(inserted.read_after_write, "pass");
assert.equal(inserted.latest_selector, "pass");
assert.equal(inserted.latest_display_projection, "pass");
assert.equal(inserted.administrator_display_state, "current");
assert.equal(inserted.general_staff_counts_redacted, true);
assert.deepEqual(inserted.call_counts, { operational_read: 1, memory_read: 1, scope_build: 1, role_projection: 1, persistence_transaction: 1, repository_read: 1 });
assert.equal(inserted.database_write_performed, false);
assert.equal(inserted.safety.application_database_write_performed, false);
assert.equal(inserted.safety.proposal_saved, false);

const reused = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(repository));
assert.equal(reused.result, "reused");

const conflict = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(repository, { prepare: () => prepared(true) }));
assert.equal(conflict.result, "rejected");
assert.equal(conflict.stage, "persistence");

const rollbackRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
rollbackRepository.failNextTransaction();
const rollback = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(rollbackRepository));
assert.equal(rollback.result, "failed_closed");
assert.equal(rollback.stage, "persistence");
assert.equal(rollbackRepository.inspectRecords().length, 0);

class FailedReadFixtureRepository extends HermesDailyFarmBriefFixturePersistenceRepository {
  override async readRecordCandidates() {
    this.readCount += 1;
    return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1" as const, status: "unavailable" as const, transaction_read_only: true as const, records: [] };
  }
}
const failedReadRepository = new FailedReadFixtureRepository();
const failedReadBundle = createHermesDailyFarmBriefFixtureRepositoryBundle(failedReadRepository);
const failedRead = await runHermesDailyFarmBriefAuthorizedRealDataPersistence(input(failedReadRepository, { repositoryBundle: failedReadBundle }));
assert.equal(failedRead.result, "failed_closed");
assert.equal(failedRead.stage, "read_after_write");

const serialized = JSON.stringify(inserted);
for (const forbidden of ["record_id", "source_record_id", "scope_index", "principal_ref", "allowed_scope_keys", "credential", "field-0", "cycle-0"]) assert.equal(serialized.includes(forbidden), false);
assert.equal(inserted.safety.secret_exposed, false);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_authorized_real_data_persistence", default_disabled: true, dry_run_write_count: 0, repository_identity_mismatch_write_count: 0, insert: "pass", idempotent_reuse: "pass", conflicting_reuse: "rejected", rollback: "pass", read_after_write: "pass", latest_selector: "pass", latest_display: "pass", operational_read_maximum: 1, memory_read_maximum: 1, app_database_write_performed: false, proposal_saved: false, secret_exposed: false }));
