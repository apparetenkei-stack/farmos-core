import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_PATH_ENV,
  FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_SHA256,
  FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE,
  FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT,
  assertFarmOsE5PasswordOnlyCredential,
  classifyFarmOsE5AppBusinessFailure,
  createFarmOsE5AppBusinessPgConfig,
  loadFarmOsE5AppBusinessConnectionIdentity,
  parseFarmOsE5AppBusinessConnectionIdentity,
} from "../../src/lib/hermes/farm_os_e5_app_business_staging_connection";
import {
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS,
} from "../../src/lib/hermes/farm_os_e5_supabase_resource_fingerprint";

const fixturePath = "/server-owned/staging-app-business-identity.json";
const sessionPoolerHost = [
  "aws-0-ap-northeast-1",
  "pooler",
  "supabase",
  "com",
].join(".");
const fixture = {
  connection_mode: FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE,
  credential_class: "app-business-staging-readonly",
  database: "postgres",
  environment_id: "apparetenkei-staging-primary",
  host: sessionPoolerHost,
  migration_head: "20260807000000",
  port: FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT,
  resource_fingerprint:
    FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS.staging_app_business,
  schema_version:
    "farmos.day150-5-e5.app-business-staging-connection-identity.v1",
  sslmode: "require",
  username: "postgres.abcdefghijklmnopqrst",
};
const digest = (source: string) =>
  `sha256:${createHash("sha256").update(source, "utf8").digest("hex")}`;

const parsed = parseFarmOsE5AppBusinessConnectionIdentity(fixture);
assert.notEqual(parsed, null);
const loaded = loadFarmOsE5AppBusinessConnectionIdentity({
  [FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_PATH_ENV]: fixturePath,
}, (path) => {
  assert.equal(path, fixturePath);
  return JSON.stringify(fixture);
}, digest(JSON.stringify(fixture)));
assert.deepEqual(loaded, fixture);
assert.equal(FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_SHA256,
  "sha256:8d1b5dce9d74d1324ff59e960a43cfc7abc621bf3f2bd713e8d9b363fdb0383e");

const password = "synthetic-password-only";
assert.equal(assertFarmOsE5PasswordOnlyCredential(password), password);
for (const fullUrl of [
  "postgres://fixture.invalid/db",
  "postgresql://fixture.invalid/db",
]) {
  assert.throws(() => assertFarmOsE5PasswordOnlyCredential(fullUrl),
    (error) => classifyFarmOsE5AppBusinessFailure(
      error,
      "CREDENTIAL_SHAPE_VALIDATION",
    ).error_class === "CREDENTIAL_SHAPE_CONTRACT_MISMATCH");
}

const pgConfig = createFarmOsE5AppBusinessPgConfig(loaded, password);
assert.equal(pgConfig.host, fixture.host);
assert.equal(pgConfig.user, fixture.username);
assert.equal(pgConfig.database, fixture.database);
assert.equal(pgConfig.port, 5432);
assert.equal(pgConfig.password, password);
assert.deepEqual(pgConfig.ssl, { rejectUnauthorized: false });
assert.equal("connectionString" in pgConfig, false);

assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  resource_fingerprint:
    FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
      .production_app_business_deny,
}), null);
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  environment_id: "apparetenkei-production-primary",
}), null);
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  host: "db.production.invalid",
}), null);
const missingUsername = { ...fixture } as Record<string, unknown>;
delete missingUsername.username;
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity(missingUsername), null);
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  port: 6543,
}), null);
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  connection_mode: "TRANSACTION_POOLER",
}), null);
assert.equal(parseFarmOsE5AppBusinessConnectionIdentity({
  ...fixture,
  extra: "denied",
}), null);

for (const [override, expected] of [
  [{ port: 6543 }, "WRONG_PORT_OR_POOLER_MODE"],
  [{ connection_mode: "TRANSACTION_POOLER" },
    "WRONG_PORT_OR_POOLER_MODE"],
  [{ sslmode: "disable" }, "SSL_CONFIGURATION_ERROR"],
  [{ credential_class: "app-business-production-readonly" },
    "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED"],
  [{ migration_head: "20260806000000" },
    "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED"],
  [{ username: "" }, "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR"],
  [{ database: "" }, "WRONG_DATABASE_NAME"],
] as const) {
  let loadError: unknown;
  const candidateSource = JSON.stringify({ ...fixture, ...override });
  try {
    loadFarmOsE5AppBusinessConnectionIdentity({
      [FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_PATH_ENV]: fixturePath,
    }, () => candidateSource, digest(candidateSource));
  } catch (error) {
    loadError = error;
  }
  assert.equal(classifyFarmOsE5AppBusinessFailure(
    loadError,
    "CONNECTION_IDENTITY_LOAD",
  ).error_class, expected);
}

const classifications = [
  [{ code: "28P01" }, "PASSWORD_AUTHENTICATION_FAILED"],
  [{ code: "28000" }, "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR"],
  [{ code: "3D000" }, "WRONG_DATABASE_NAME"],
  [{ code: "ENOTFOUND" }, "NETWORK_OR_DNS_FAILURE"],
  [new Error("TLS certificate rejected"), "SSL_CONFIGURATION_ERROR"],
  [new Error("generic failure"), "UNKNOWN"],
] as const;
for (const [error, expected] of classifications) {
  const safe = classifyFarmOsE5AppBusinessFailure(error, "CONNECT");
  assert.equal(safe.error_class, expected);
  assert.equal(safe.connection_mode,
    "SUPABASE_SHARED_POOLER_SESSION");
  assert.equal(JSON.stringify(safe).includes("fixture.session"), false);
}
assert.equal(classifyFarmOsE5AppBusinessFailure(
  new Error("generic process failure"),
  "CONNECT",
).error_class, "UNKNOWN");

let missingIdentity: unknown;
try {
  loadFarmOsE5AppBusinessConnectionIdentity({}, () => "");
} catch (error) {
  missingIdentity = error;
}
assert.equal(classifyFarmOsE5AppBusinessFailure(
  missingIdentity,
  "CONNECTION_IDENTITY_LOAD",
).error_class,
"STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED");

const bootstrap = readFileSync(new URL(
  "./bootstrap_farm_os_day150_5_e5_secure_credentials.sh",
  import.meta.url,
), "utf8");
assert.equal((bootstrap.match(/security add-generic-password/gu) ?? []).length,
  1);
assert.match(bootstrap, /1\/1 App Business Staging read-only DB password/u);
assert.doesNotMatch(bootstrap, /database URL|connection string/iu);

console.log("farm_os_day150_5_e5_app_business_staging_connection: PASS");
