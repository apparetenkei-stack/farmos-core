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

  console.log(JSON.stringify(result.safe_preview, null, 2));
}
