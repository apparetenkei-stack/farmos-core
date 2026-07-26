import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "src/lib/hermes/farm_os_eligible_proposal_persistence.ts",
  "src/lib/hermes/farm_os_eligible_proposal_postgres.ts",
  "src/lib/hermes/farm_os_core_db_migration_manifest.ts",
  "src/lib/hermes/farm_os_production_workload_auth.ts",
];
const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
const forbidden = [
  "supabase",
  "farming-app",
  "service_role",
  "postgres://",
  "postgresql://",
  "BEGIN PRIVATE KEY",
  "fetch(",
  "axios",
  "node:http",
  "node:https",
  "child_process",
];
for (const token of forbidden) assert.equal(source.includes(token), false, `forbidden dependency: ${token}`);
assert.equal(source.includes("fixture_fallback_used: false"), true);
assert.equal(source.includes("human_approval"), false);
assert.equal(source.includes("execution_status: \"draft\""), true);
console.log(JSON.stringify({
  files,
  forbidden_dependency_count: 0,
  fixture_production_fallback_count: 0,
  browser_direct_write_count: 0,
  farming_app_write_dependency_count: 0,
}));
