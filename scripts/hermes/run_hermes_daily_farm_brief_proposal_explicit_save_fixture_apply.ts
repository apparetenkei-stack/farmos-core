import {
  HERMES_DAY126_FIXTURE_APPLY_ENABLED_ENV,
  applyHermesDay126Fixture,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_fixture_boundary";
import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";

const targetConfigured = process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV] !== undefined;
const applyEnabled = process.env[HERMES_DAY126_FIXTURE_APPLY_ENABLED_ENV] === "true";
console.log(JSON.stringify({
  boundary: "day126_daily_farm_brief_proposal_fixture_apply_preview",
  database_target_configured: targetConfigured,
  preflight_required: true,
  explicit_apply_enabled: applyEnabled,
  production_database_connection_allowed: false,
  retry_count: 0,
  secret_exposed: false,
}));

const result = await applyHermesDay126Fixture({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
  applyEnabled,
});
console.log(JSON.stringify(result));
