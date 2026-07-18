import {
  diagnoseHermesDay126FixtureReadiness,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_fixture_boundary";
import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";

const result = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV] });
console.log(JSON.stringify({
  boundary: "day126_daily_farm_brief_proposal_fixture_readiness",
  state: result.state,
  denial_reason: result.denial_reason,
  database_target: result.database_target,
  fixture_ready: result.fixture_ready,
  transaction_call_count: result.transaction_call_count,
  database_write_performed: false,
  production_database_connection_performed: false,
  production_database_write_performed: false,
  retry_count: 0,
  secret_exposed: false,
}));
