import { URL } from "node:url";

const raw = process.env.DAY145B_CORE_TEST_DATABASE_URL;
let safe = false;
if (raw) {
  try {
    const url = new URL(raw);
    safe =
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname.slice(1).endsWith("_test");
  } catch {
    safe = false;
  }
}
console.log(JSON.stringify({
  isolated_db_gate: safe ? "pass" : "fail",
  db_tests_executed: false,
  reason: safe ? "runner_requires_explicit_human_apply_step" : "safe_local_test_database_not_configured",
  credential_values_logged: false,
  linked_db_operation_count: 0,
  production_write_count: 0,
}));
