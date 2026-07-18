import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay127ProposalReviewPostgresReadiness } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_readiness";

const result = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
});

console.log(JSON.stringify({
  boundary: "day127_daily_farm_brief_proposal_review_postgres_readiness",
  state: result.state,
  denial_reason: result.denial_reason,
  transaction_call_count: result.transaction_call_count,
  database_write_performed: false,
  production_connection_performed: false,
  raw_identifier_exposed: false,
  principal_ref_exposed: false,
  credential_exposed: false,
  retry_count: 0,
}));
