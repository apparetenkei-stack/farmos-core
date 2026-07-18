import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay128FixtureReadiness } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";

const result = await diagnoseHermesDay128FixtureReadiness({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
});

console.log(JSON.stringify({
  boundary: "day128_review_decision_fixture_readiness",
  state: result.state,
  denial_reason: result.denial_reason,
  target_database: result.transaction_call_count === 0 ? "none" : "isolated_test",
  transaction_call_count: result.transaction_call_count,
  database_write_performed: false,
  production_connection_performed: false,
  retry_count: 0,
}));
