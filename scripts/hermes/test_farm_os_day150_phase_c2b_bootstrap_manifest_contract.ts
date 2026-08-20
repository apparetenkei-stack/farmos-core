import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_PURPOSE,
  canonicalizeFarmOsDay150C2bBootstrapManifestBody,
  computeFarmOsDay150C2bBootstrapManifestDigest,
  farmOsDay150C2bBootstrapManifestBodiesEqual,
  parseFarmOsDay150C2bBootstrapManifest,
  type FarmOsDay150C2bBootstrapManifestBody,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_manifest_contract";

type MutableJson = { [key: string]: any };

function cloneBody(): MutableJson {
  return JSON.parse(JSON.stringify(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY)) as MutableJson;
}

function envelope(body: unknown = cloneBody(), manifestDigest: unknown =
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest): unknown {
  return { manifest_body: body, manifest_digest: manifestDigest };
}

function expectBodyRejection(mutator: (body: MutableJson) => void): void {
  const body = cloneBody();
  mutator(body);
  const result = parseFarmOsDay150C2bBootstrapManifest(envelope(body));
  assert.equal(result.accepted, false);
  if (!result.accepted) assert.equal(result.reason, "MANIFEST_BODY_MISMATCH");
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).reverse()
    .map(([key, child]) => [key, reverseObjectKeys(child)]));
}

const parsed = parseFarmOsDay150C2bBootstrapManifest(
  JSON.parse(JSON.stringify(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE)),
);
assert.equal(parsed.accepted, true);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY.schema_version,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY.purpose,
  FARM_OS_DAY150_C2B_BOOTSTRAP_PURPOSE);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_DIGEST_DOMAIN,
  "farmos.day150-c2b-bootstrap-manifest.v1:manifest-body");

const reordered = reverseObjectKeys(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY) as
  FarmOsDay150C2bBootstrapManifestBody;
assert.equal(canonicalizeFarmOsDay150C2bBootstrapManifestBody(reordered),
  canonicalizeFarmOsDay150C2bBootstrapManifestBody(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY));
assert.equal(computeFarmOsDay150C2bBootstrapManifestDigest(reordered),
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest);
assert.equal(farmOsDay150C2bBootstrapManifestBodiesEqual(reordered,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY), true);
assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(reordered)).accepted, true);
assert.match(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
  /^sha256:[a-f0-9]{64}$/u);

const candidateDigest = FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest;
const tamperedDigest = `${candidateDigest.slice(0, -1)}${candidateDigest.endsWith("0") ? "1" : "0"}`;
const tampered = parseFarmOsDay150C2bBootstrapManifest(envelope(cloneBody(), tamperedDigest));
assert.equal(tampered.accepted, false);
if (!tampered.accepted) assert.equal(tampered.reason, "MANIFEST_DIGEST_MISMATCH");
for (const invalidDigest of [
  `sha256:${"A".repeat(64)}`,
  `sha256:${"a".repeat(63)}`,
  `sha512:${"a".repeat(64)}`,
]) {
  const result = parseFarmOsDay150C2bBootstrapManifest(envelope(cloneBody(), invalidDigest));
  assert.equal(result.accepted, false);
  if (!result.accepted) assert.equal(result.reason, "MANIFEST_DIGEST_INVALID");
}

assert.equal(parseFarmOsDay150C2bBootstrapManifest({
  ...FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
  unknown: true,
}).accepted, false);
assert.equal(parseFarmOsDay150C2bBootstrapManifest({
  manifest_body: cloneBody(),
}).accepted, false);
assert.equal(parseFarmOsDay150C2bBootstrapManifest([]).accepted, false);
assert.equal(parseFarmOsDay150C2bBootstrapManifest(Object.assign(Object.create(null),
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE)).accepted, false);

expectBodyRejection((body) => { body.unknown = true; });
expectBodyRejection((body) => { delete body.purpose; });
expectBodyRejection((body) => { body.schema_version = "farmos.day150-c2b-bootstrap-manifest.v2"; });
expectBodyRejection((body) => { body.purpose = "PRODUCTION"; });
expectBodyRejection((body) => { body.target.source.c2a_source_commit = "a".repeat(40); });
expectBodyRejection((body) => { body.target.source.c2b_source_commit = "b".repeat(40); });
expectBodyRejection((body) => { body.target.image.repository = "postgres"; });
expectBodyRejection((body) => { body.target.image.repository_digest = `sha256:${"a".repeat(64)}`; });
expectBodyRejection((body) => { body.target.image.platform.os = "darwin"; });
expectBodyRejection((body) => { body.target.image.platform.architecture = "amd64"; });
expectBodyRejection((body) => { body.target.image.platform.variant = null; });
expectBodyRejection((body) => { body.target.image.expected_postgresql_major = 18; });
expectBodyRejection((body) => { body.target.registries.case_registry.authority = "wrong"; });
expectBodyRejection((body) => {
  body.target.registries.case_registry.digest = `sha256:${"a".repeat(64)}`;
});
expectBodyRejection((body) => { body.target.registries.fault_registry.authority = "wrong"; });
expectBodyRejection((body) => {
  body.target.registries.fault_registry.digest = `sha256:${"b".repeat(64)}`;
});
expectBodyRejection((body) => { body.target.migration.migration_id = "latest"; });
expectBodyRejection((body) => { body.target.migration.apply_sha256 = `sha256:${"c".repeat(64)}`; });
expectBodyRejection((body) => { body.target.migration.verify_sha256 = `sha256:${"d".repeat(64)}`; });
expectBodyRejection((body) => { body.policy.storage_rollback.classification = "DETECT_ALL"; });
expectBodyRejection((body) => { body.policy.ledger_root.path = "/tmp/farmos"; });
expectBodyRejection((body) => { body.policy.ledger_root.filesystem = "ANY_LOCAL_FILESYSTEM"; });
expectBodyRejection((body) => {
  body.policy.ledger_root.writer_principal_semantic = "arbitrary_writer";
});
expectBodyRejection((body) => { body.policy.actor.authentication = "CALLER_ASSERTED"; });
expectBodyRejection((body) => {
  body.policy.actor_capability_and_challenge.capability_generation = "REUSABLE";
});
expectBodyRejection((body) => { body.policy.writer_and_ui.codex = "LEDGER_WRITE"; });
expectBodyRejection((body) => { body.policy.writer_identity.environment = "INHERITED"; });
expectBodyRejection((body) => { body.policy.writer_identity.executable_mode = "0755"; });
expectBodyRejection((body) => { body.policy.writer_identity.working_directory = "/tmp"; });
expectBodyRejection((body) => { body.policy.publication.unsupported_primitive = "WEAK_FALLBACK"; });
expectBodyRejection((body) => { body.policy.publication.final_records = "MUTABLE"; });
expectBodyRejection((body) => { body.policy.orphan_recovery.automatic_delete = "ALLOWED"; });
expectBodyRejection((body) => { body.policy.global_generation_cas.serialization = "PER_RECORD"; });
expectBodyRejection((body) => { body.policy.clock.genesis = "DATE_NOW"; });
expectBodyRejection((body) => { body.policy.clock.recovery_authentication = "TTL_BOUND"; });
expectBodyRejection((body) => { body.policy.authorization_timing.authorization_start_ttl_seconds = 899; });
expectBodyRejection((body) => { body.policy.authorization_timing.authorization_start_ttl_seconds = 901; });
expectBodyRejection((body) => { body.policy.authorization_timing.attempt_to_spawn_deadline_seconds = 29; });
expectBodyRejection((body) => { body.policy.authorization_timing.attempt_to_spawn_deadline_seconds = 31; });
expectBodyRejection((body) => { body.policy.execution_fence.second_spawn = "ALLOWED"; });
expectBodyRejection((body) => {
  body.policy.execution_fence.process_crash_or_spawn_ack_ambiguity = "RETRY";
});
expectBodyRejection((body) => { body.policy.integrity.sufficiency = "HASH_ALWAYS_SUFFICIENT"; });
expectBodyRejection((body) => { body.policy.privacy.persisted_allowlist.pop(); });
expectBodyRejection((body) => { body.policy.privacy.password = "synthetic-secret"; });
expectBodyRejection((body) => { body.implementation_profile.artifact_policy.executable_mode = "0777"; });
assert.equal(JSON.stringify(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY)
  .includes("UNRESOLVED_IMPLEMENTATION_PROFILE"), false);
expectBodyRejection((body) => { body.runtime_claims.manifest_instance_created = true; });
expectBodyRejection((body) => { body.target = []; });

{
  const body = cloneBody();
  body.policy.privacy.prohibited.extra = "synthetic-secret";
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const body = cloneBody();
  Object.defineProperty(body, Symbol("secret"), { value: "synthetic-secret", enumerable: true });
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const body = cloneBody();
  Object.defineProperty(body, "accessor", { get: () => "synthetic-secret", enumerable: true });
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const body = cloneBody();
  const list = body.policy.privacy.prohibited as any[];
  Object.defineProperty(list, "secret", { value: "synthetic-secret", enumerable: true });
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const body = cloneBody();
  const list = body.policy.privacy.prohibited as any[];
  delete list[0];
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const body = cloneBody();
  Object.setPrototypeOf(body.policy.privacy.prohibited, Object.create(Array.prototype));
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(body)).accepted, false);
}
{
  const reflectiveFailure = new Proxy(cloneBody(), {
    ownKeys: () => { throw new Error("reflective failure"); },
  });
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(envelope(reflectiveFailure)).accepted, false);
}
{
  const target = cloneBody();
  let ownKeyReads = 0;
  const changesAfterValidation = new Proxy(target, {
    ownKeys: (value) => {
      ownKeyReads += 1;
      if (ownKeyReads > 1) throw new Error("caller object reread after validation");
      return Reflect.ownKeys(value);
    },
  });
  assert.equal(farmOsDay150C2bBootstrapManifestBodiesEqual(
    changesAfterValidation,
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  ), true);
  assert.equal(ownKeyReads, 1);
}
{
  const target = cloneBody();
  let ownKeyReads = 0;
  const changesAfterValidation = new Proxy(target, {
    ownKeys: (value) => {
      ownKeyReads += 1;
      if (ownKeyReads > 1) throw new Error("parser reread after validation");
      return Reflect.ownKeys(value);
    },
  });
  const result = parseFarmOsDay150C2bBootstrapManifest(envelope(changesAfterValidation));
  assert.equal(result.accepted, true);
  assert.equal(ownKeyReads, 1);
  if (result.accepted) {
    assert.equal(result.manifest, FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE);
  }
}

const syntheticSecret = "r1-do-not-emit-secret-value";
assert.equal(JSON.stringify(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE)
  .includes(syntheticSecret), false);

console.log(JSON.stringify({
  status: "PASS",
  authority: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  source_state: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY.source_state,
  manifest_digest: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
  docker_operations: 0,
  network_operations: 0,
  database_operations: 0,
  ipc_operations: 0,
}));
