import { readHermesOperationalReadonlySources } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";
import { integrateHermesDailyFarmBriefRealData } from "./brief_runtime/hermes_daily_farm_brief_integration";

const enabled =
  process.env.HERMES_DAILY_FARM_BRIEF_REAL_DATA_SMOKE_ENABLED === "true";

if (!enabled) {
  console.log(
    JSON.stringify(
      {
        result: "skipped",
        reason: "real_data_smoke_not_enabled",
        real_data_preview: "not_executed_environment_unavailable",
        external_read_performed: false,
        database_write_performed: false,
        notification_performed: false,
        model_execution_performed: false,
        secret_exposed: false,
      },
      null,
      2,
    ),
  );
} else {
  const result = await integrateHermesDailyFarmBriefRealData({
    readOperationalSources: () => readHermesOperationalReadonlySources(),
    readMemoryContext: () => readHermesMemoryContext(),
    timezone: "Asia/Tokyo",
  });

  const sources = Object.fromEntries(
    result.safe_preview.sources.map((source) => [
      source.source_type,
      {
        status: source.status,
        record_count: source.record_count,
        freshness: source.freshness,
      },
    ]),
  );
  const cropCycle = result.safe_preview.sources.find(
    (source) => source.source_type === "crop_cycle",
  );
  console.log(JSON.stringify({
    result: "ok",
    real_data_preview: "executed_read_only",
    sources,
    relation_validation_result:
      cropCycle?.status === "invalid" ? "failed_closed" : "passed_or_not_applicable",
    external_read_performed: true,
    database_write_performed: false,
    brief_persistence_performed: false,
    proposal_saved: false,
    secret_exposed: false,
  }, null, 2));
}
