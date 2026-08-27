import { writeFileSync } from "node:fs";
import {
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH,
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH,
  compileFarmOsCoreMemoryInitialCatalogBaselineSql,
  compileFarmOsCoreMemoryInitialCatalogBaselineAuthority,
  serializeFarmOsCoreMemoryInitialCatalogBaselineAuthority,
} from "../../src/lib/hermes/farm_os_core_memory_initial_catalog_baseline";

const sql = compileFarmOsCoreMemoryInitialCatalogBaselineSql();
const authority = compileFarmOsCoreMemoryInitialCatalogBaselineAuthority(sql);
writeFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH, sql, { mode: 0o644 });
writeFileSync(
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH,
  serializeFarmOsCoreMemoryInitialCatalogBaselineAuthority(authority),
  { mode: 0o644 },
);
console.log("CORE_MEMORY_INITIAL_CATALOG_BASELINE_ARTIFACTS_GENERATED");
