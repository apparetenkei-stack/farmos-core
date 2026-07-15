import { runDay114PostgresScenario } from "./test_hermes_daily_farm_brief_postgres_persistence_boundary";

runDay114PostgresScenario()
  .then((result) => console.log(JSON.stringify({ preview: "hermes_daily_farm_brief_postgres_persistence", ...result, production_database_write_performed: false, app_db_write_performed: false, secret_exposed: false }, null, 2)))
  .catch((error) => { console.error(error instanceof Error ? error.message : "day114_preview_failed"); process.exitCode = 1; });
