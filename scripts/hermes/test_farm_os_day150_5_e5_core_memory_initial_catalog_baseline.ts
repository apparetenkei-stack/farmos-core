import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH,
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID,
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH,
  compileFarmOsCoreMemoryInitialCatalogBaselineAuthority,
  compileFarmOsCoreMemoryInitialCatalogBaselineSql,
  parseFarmOsCoreMemoryInitialCatalogBaselineAuthority,
  serializeFarmOsCoreMemoryInitialCatalogBaselineAuthority,
} from "../../src/lib/hermes/farm_os_core_memory_initial_catalog_baseline";

const sql = readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH, "utf8");
const compiledSql = compileFarmOsCoreMemoryInitialCatalogBaselineSql();
assert.equal(sql, compiledSql, "tracked baseline SQL must equal deterministic compiler output");
const parsed = parseFarmOsCoreMemoryInitialCatalogBaselineAuthority(JSON.parse(
  readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH, "utf8")));
assert.notEqual(parsed, null);
const compiled = compileFarmOsCoreMemoryInitialCatalogBaselineAuthority(sql);
assert.equal(
  readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH, "utf8"),
  serializeFarmOsCoreMemoryInitialCatalogBaselineAuthority(compiled),
  "tracked authority must equal deterministic compiler output",
);
assert.equal(parsed!.baseline_id, FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID);
assert.equal(parsed!.baseline_sha256,
  `sha256:${createHash("sha256").update(sql).digest("hex")}`);
assert.equal(parsed!.migrations.length, 6);
assert.equal(parsed!.final_migration_head,
  "202608110001_production_target_execution_durability");
assert.match(sql, /create schema ai;/u);
assert.match(sql, /CREATE TABLE IF NOT EXISTS ai\.proposal_inbox/u);
assert.match(sql, /create table if not exists ai\.operational_memory_source_snapshots/u);
assert.match(sql, /create or replace function ai\.persist_operational_memory_bundle\(/u);
assert.doesNotMatch(sql, /insert into core_schema\.migration_history/iu);
assert.doesNotMatch(sql, /\b(?:PASSWORD|CREATE ROLE|GRANT)\b/iu);
assert.doesNotMatch(sql, /day3_roles_and_proposal_inbox\.sql|\\ir|\\i\s/iu);
assert.equal(parsed!.forbidden_business_data, true);
for (const source of parsed!.source_artifacts) {
  assert.equal(source.sha256,
    `sha256:${createHash("sha256").update(readFileSync(source.path)).digest("hex")}`);
}
console.log("FARM_OS_DAY150_5_E5_CORE_MEMORY_INITIAL_CATALOG_BASELINE_PASS");
