import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256,
  FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR,
  loadFarmOsCoreSelectedEnvironmentIdentityRuntime,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";
import {
  FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
  loadFarmOsCoreMemorySelectedReadPoolConfig,
} from "../../src/lib/hermes/farm_os_core_memory_read_runtime_config";

export function qualifyFarmOsCoreProductionRuntimeOffline(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (environment[FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR] !== "production") {
    throw new Error("CORE_PRODUCTION_OFFLINE_SELECTOR_INVALID");
  }
  const runtime = loadFarmOsCoreSelectedEnvironmentIdentityRuntime({
    environment,
    read_file: (path) => readFileSync(path, "utf8"),
  });
  if (runtime.state !== "READY") {
    throw new Error("CORE_PRODUCTION_OFFLINE_MANIFEST_NOT_READY");
  }
  const pool = loadFarmOsCoreMemorySelectedReadPoolConfig({ environment });
  const authority = FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY;
  if (pool.host !== authority.host || pool.port !== authority.port ||
    pool.database !== authority.database || pool.user !== authority.user ||
    pool.options !== "-c default_transaction_read_only=on") {
    throw new Error("CORE_PRODUCTION_OFFLINE_CORE_MEMORY_MISMATCH");
  }
  console.log(JSON.stringify({
    result: "CORE_PRODUCTION_RUNTIME_OFFLINE_QUALIFICATION_PASS",
    selector: "production",
    manifest_loader: "READY",
    manifest_external_pin: "MATCH",
    manifest_sha256: FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256,
    core_memory_listener: `${authority.host}:${authority.port}`,
    core_memory_credential_class: authority.credential_class,
    transaction_read_only: true,
    staging_identity_selected: 0,
    staging_core_memory_selected: 0,
    production_app_business_operations: 0,
    secret_exposure: 0,
  }));
}

if (process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href) {
  qualifyFarmOsCoreProductionRuntimeOffline();
}
