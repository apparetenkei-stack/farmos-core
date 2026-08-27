import { execFileSync } from "node:child_process";

import { Client } from "pg";

import {
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS,
} from "../../src/lib/hermes/farm_os_e5_supabase_resource_fingerprint";
import {
  assertFarmOsE5PasswordOnlyCredential,
  classifyFarmOsE5AppBusinessFailure,
  createFarmOsE5AppBusinessPgConfig,
  loadFarmOsE5AppBusinessConnectionIdentity,
  type FarmOsE5AppBusinessFailurePhase,
} from "../../src/lib/hermes/farm_os_e5_app_business_staging_connection";

const KEYCHAIN_SERVICE =
  "jp.apparetenkei.farmos-core-staging.app-business-readonly";
const KEYCHAIN_ACCOUNT = "app-business-staging-readonly";
const EXPECTED_MIGRATION_COUNT = 24;
const EXPECTED_MIGRATION_HEAD = "20260807000000";
const CREDENTIAL_CLASS = "app-business-staging-readonly";

function readKeychainPassword(): string {
  const value = execFileSync("/usr/bin/security", [
    "find-generic-password",
    "-s",
    KEYCHAIN_SERVICE,
    "-a",
    KEYCHAIN_ACCOUNT,
    "-w",
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  }).replace(/\r?\n$/u, "");
  return assertFarmOsE5PasswordOnlyCredential(value);
}

async function verify(): Promise<void> {
  let phase: FarmOsE5AppBusinessFailurePhase = "KEYCHAIN_READ";
  let client: Client | null = null;
  try {
    const password = readKeychainPassword();
    phase = "CONNECTION_IDENTITY_LOAD";
    const identity = loadFarmOsE5AppBusinessConnectionIdentity();
    client = new Client(createFarmOsE5AppBusinessPgConfig(identity, password));
    phase = "CONNECT";
    await client.connect();
    phase = "READ_ONLY_TRANSACTION";
    await client.query("BEGIN TRANSACTION READ ONLY");
    const server = await client.query<{ server_version_num: string }>(
      "select current_setting('server_version_num') as server_version_num",
    );
    const readonly = await client.query<{ transaction_read_only: string }>(
      "select current_setting('transaction_read_only') as transaction_read_only",
    );
    phase = "MIGRATION_QUERY";
    const migrations = await client.query<{
      migration_count: number;
      migration_head: string | null;
    }>(
      `select count(*)::int as migration_count,
              max(version)::text as migration_head
         from supabase_migrations.schema_migrations`,
    );
    phase = "CLEANUP";
    await client.query("ROLLBACK");

    phase = "RESOURCE_VERIFY";
    const observed = migrations.rows[0];
    if (server.rows[0]?.server_version_num.slice(0, 2) !== "17" ||
      readonly.rows[0]?.transaction_read_only !== "on" ||
      observed?.migration_count !== EXPECTED_MIGRATION_COUNT ||
      observed?.migration_head !== EXPECTED_MIGRATION_HEAD ||
      String(FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
        .staging_app_business) ===
        String(FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
          .production_app_business_deny)) {
      throw new Error("staging_resource_verification_mismatch");
    }

    console.log(JSON.stringify({
      status: "APP_BUSINESS_STAGING_READONLY_VERIFIED",
      resource_fingerprint:
        FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
          .staging_app_business,
      migration_count: observed.migration_count,
      migration_head: observed.migration_head,
      credential_class: CREDENTIAL_CLASS,
      transaction_read_only: true,
      writes: 0,
      production_connections: 0,
    }));
  } catch (error) {
    console.error(JSON.stringify(classifyFarmOsE5AppBusinessFailure(
      error,
      phase,
    )));
    process.exitCode = 1;
  } finally {
    if (client !== null) await client.end().catch(() => undefined);
  }
}

void verify();
