import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY,
  fingerprintFarmOsCoreMemoryStagingResource,
} from "../../src/lib/hermes/farm_os_core_memory_staging_provider_authority";

const authority = FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY;
const evidence = {
  provider_class: authority.provider_class,
  provider_scope: authority.provider_scope,
  logical_name: authority.logical_name,
  resource_alias: authority.resource_alias,
  volume_name: authority.volume_name,
  postgres_major: authority.postgres_major,
  image_digest: authority.image_digest,
  listener_address: authority.listener_address,
  listener_port: authority.listener_port,
};
const accepted = fingerprintFarmOsCoreMemoryStagingResource(evidence);
assert.equal(accepted.accepted, true);
if (!accepted.accepted) throw new Error("provider_fixture_rejected");
assert.match(accepted.resource_fingerprint, /^sha256:[a-f0-9]{64}$/u);
assert.deepEqual(
  fingerprintFarmOsCoreMemoryStagingResource(structuredClone(evidence)),
  fingerprintFarmOsCoreMemoryStagingResource(structuredClone(evidence)),
);

for (const denied of [
  { ...evidence, resource_alias: "farmos-postgres" },
  { ...evidence, volume_name: "./data/postgres" },
  { ...evidence, listener_port: 5432 },
  { ...evidence, listener_address: "0.0.0.0" },
  { ...evidence, provider_scope: "production" },
]) {
  assert.equal(fingerprintFarmOsCoreMemoryStagingResource(denied).accepted,
    false);
}

const compose = readFileSync(
  "artifacts/day150-5/e5/core-memory-staging.compose.yaml",
  "utf8",
);
assert.match(compose, /container_name: farmos-core-memory-staging-postgres/u);
assert.match(compose, /127\.0\.0\.1:55432:5432/u);
assert.match(compose, /name: farmos-core-memory-staging-postgres-data/u);
assert.match(compose, /name: farmos-core-memory-staging-loopback/u);
assert.match(compose, /driver: bridge/u);
assert.doesNotMatch(compose, /0\.0\.0\.0/u);
assert.doesNotMatch(compose, /\.\/data\/postgres/u);
assert.doesNotMatch(compose, /127\.0\.0\.1:5432:5432/u);

const secureBootstrap = readFileSync(
  "scripts/hermes/bootstrap_farm_os_day150_5_e5_secure_credentials.sh",
  "utf8",
);
assert.match(secureBootstrap,
  /1\/1 App Business Staging read-only DB password/u);
assert.doesNotMatch(secureBootstrap, /supabase-projects-read/u);
assert.equal((secureBootstrap.match(/ -w\n/gu) ?? []).length, 1);
assert.doesNotMatch(secureBootstrap, /-w\s+["'][^"']+["']/u);
assert.doesNotMatch(secureBootstrap, /PASSWORD=/u);
const secretMaterializer = readFileSync(
  "scripts/hermes/farm_os_day150_5_e5_keychain_secret_materializer.expect",
  "utf8",
);
assert.match(secretMaterializer,
  /jp\.apparetenkei\.farmos-core-staging\.core-memory-readonly/u);
assert.match(secretMaterializer,
  /set bootstrap_secret \[generate_secret\]/u);
assert.match(secretMaterializer,
  /set runtime_secret \[generate_secret\]/u);
assert.match(secretMaterializer,
  /while \{\$runtime_secret eq \$bootstrap_secret\}/u);
assert.match(secretMaterializer, /log_user 0/u);
assert.doesNotMatch(secretMaterializer, /puts.*bootstrap_secret/u);
assert.doesNotMatch(secretMaterializer, /puts.*runtime_secret/u);

const bootstrapRequest = JSON.parse(readFileSync(
  "artifacts/day150-5/e5/secure-bootstrap.request.json",
  "utf8",
)) as Record<string, unknown>;
assert.equal(bootstrapRequest.prompt_count, 1);
assert.equal(bootstrapRequest.supersedes_prompt_count, 8);
assert.equal(bootstrapRequest.superseded_status, "INVALIDATED_NOT_EXECUTED");
assert.deepEqual(bootstrapRequest.keychain_services, [
  "jp.apparetenkei.farmos-core-staging.app-business-readonly",
  "jp.apparetenkei.farmos-core-staging.core-memory-bootstrap",
  "jp.apparetenkei.farmos-core-staging.core-memory-readonly",
]);

console.log("farm_os_day150_5_e5_core_memory_staging_provider: PASS");
