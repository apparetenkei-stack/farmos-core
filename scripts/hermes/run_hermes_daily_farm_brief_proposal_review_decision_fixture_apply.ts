import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import {
  HERMES_DAY128_FIXTURE_APPLY_APPROVED_ENV,
  applyHermesDay128Fixture,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";

const approved = process.env[HERMES_DAY128_FIXTURE_APPLY_APPROVED_ENV] === "true";
console.log(JSON.stringify({
  boundary: "day128_review_decision_fixture_apply_preview",
  explicit_approval: approved,
  isolated_target_required: true,
  local_socket_required: true,
  production_connection_allowed: false,
  retry_count: 0,
}));

console.log(JSON.stringify(await applyHermesDay128Fixture({
  databaseTarget: process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV],
  approved,
})));
