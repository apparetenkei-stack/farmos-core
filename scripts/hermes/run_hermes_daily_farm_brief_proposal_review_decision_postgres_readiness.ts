import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay128ReviewPostgresReadiness } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";

const result = await diagnoseHermesDay128ReviewPostgresReadiness({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
  transactionExecutorFactory: () => ({
    executeSingleConnectionTransaction: async () => {
      throw new Error("day128_readiness_runner_does_not_execute_writes");
    },
  }),
});

console.log(JSON.stringify({
  boundary: "day128_review_decision_postgres_readiness",
  state: result.state,
  denial_reason: result.denial_reason,
  database_target_valid: result.database_target_valid,
  local_socket: result.local_socket,
  audit_schema_present: result.audit_schema_present,
  audit_table_present: result.audit_table_present,
  runtime_role_present: result.runtime_role_present,
  required_privileges_present: result.required_privileges_present,
  forbidden_privileges_absent: result.forbidden_privileges_absent,
  app_database_write_privilege_present:
    result.app_database_write_privilege_present,
  production_connection_performed: result.production_connection_performed,
  database_write_performed: result.database_write_performed,
  transaction_call_count: result.transaction_call_count,
  retry_count: result.retry_count,
  repository_available: result.repository !== null,
}));
