import { readHermesOperationalReadonlySources } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV,
  prepareHermesDailyFarmBriefRealDataPersistence,
  runHermesDailyFarmBriefAuthorizedRealDataPersistence,
} from "./brief_runtime/hermes_daily_farm_brief_authorized_real_data_persistence";
import { createHermesDailyFarmBriefProductionRepositoryBundle } from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

const targetDate = "2026-07-17" as const;
const generatedAt = process.env[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.generatedAt] ?? "";
const repositoryBundle = createHermesDailyFarmBriefProductionRepositoryBundle(process.env);

const result = await runHermesDailyFarmBriefAuthorizedRealDataPersistence({
  mode: process.argv.includes("--persist") ? "persist" : "dry_run",
  environment: process.env,
  targetDate,
  generatedAt,
  prepare: () => prepareHermesDailyFarmBriefRealDataPersistence({ targetDate, generatedAt, readOperationalSources: () => readHermesOperationalReadonlySources(), readMemoryContext: () => readHermesMemoryContext() }),
  repositoryBundle,
  administratorActor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day123-server-administrator", role: "administrator", allowed_scope_keys: [], authorization_verified: true },
  generalStaffActor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day123-server-general-staff", role: "general_staff", allowed_scope_keys: [], authorization_verified: true },
});

console.log(JSON.stringify(result, null, 2));
