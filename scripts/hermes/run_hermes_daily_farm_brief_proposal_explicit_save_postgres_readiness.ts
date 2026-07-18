import {
  HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV,
  diagnoseHermesDay126ProposalExplicitSavePostgresReadiness,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";

const result = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
});

console.log(JSON.stringify({
  boundary: "day126_daily_farm_brief_explicit_save_postgres_readiness",
  state: result.state,
  denial_reason: result.denial_reason,
  database_target: result.database_target,
  transaction_call_count: result.transaction_call_count,
  database_write_performed: false,
  production_database_connection_performed: false,
  production_database_write_performed: false,
  secret_exposed: false,
  retry_count: 0,
}));
