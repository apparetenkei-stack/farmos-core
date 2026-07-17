import { readHermesOperationalReadonlySources } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV,
  buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand,
  prepareHermesDailyFarmBriefRealDataPersistence,
} from "./brief_runtime/hermes_daily_farm_brief_authorized_real_data_persistence";
import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV,
  createHermesDailyFarmBriefProductionRepositoryBundle,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Missing local configuration is reported as database_unavailable without details.
}

const targetDate = "2026-07-17" as const;
const generatedAt = process.env[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.generatedAt] ?? "2026-07-17T01:00:00.000Z";
const environment = { ...process.env };
delete environment[HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV];
delete environment[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.enabled];
delete environment[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.confirmation];

const bundle = createHermesDailyFarmBriefProductionRepositoryBundle(environment);
const prepared = await prepareHermesDailyFarmBriefRealDataPersistence({
  targetDate,
  generatedAt,
  readOperationalSources: () => readHermesOperationalReadonlySources(),
  readMemoryContext: () => readHermesMemoryContext(),
});
const command = prepared === null ? null : buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand({
  prepared,
  targetDate,
  generatedAt,
  expectedCurrentVersion: null,
});
const result = await bundle.diagnoseWriteReadiness({ command, targetDate, expectedCurrentVersion: null });
const candidatesEligible = result.owner_candidate === "eligible" && result.runtime_candidate === "eligible";
const objectsReady = result.required_relations === "present" && result.persist_function === "ready";

console.log(JSON.stringify({
  result: "pass",
  boundary: "hermes_daily_farm_brief_production_write_readiness",
  ...result,
  actual_persistence_enabled: false,
  persistence_transaction_call_count: 0,
  manual_apply_preflight: {
    ready_for_manual_apply: result.connection_available && result.command_valid && objectsReady && candidatesEligible && result.rollback_verified,
    function_change_required: result.function_security !== "definer" || result.search_path !== "fixed",
    owner_change_required: result.owner_role !== "safe" || result.owner_candidate !== "eligible",
    revoke_public_required: result.public_execute === "present",
    grant_execute_required: result.execute_privilege !== "present",
    revoke_direct_dml_required: result.runtime_direct_dml === "present",
    rollback_plan_available: true,
    production_change_performed: false,
  },
}, null, 2));
