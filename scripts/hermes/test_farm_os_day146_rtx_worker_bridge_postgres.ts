import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

import {
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  FARM_OS_RTX_WORKER_ID,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_contract";
import {
  signFarmOsRtxBridgeRequest,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_auth";
import {
  FarmOsRtxWorkerBridgePostgresRepository,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_postgres_repository";
import {
  FarmOsRtxWorkerBridgeService,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_service";
import {
  FarmOsRtxStructuringPostgresRepository,
} from "../../src/lib/hermes/farm_os_rtx_structuring_postgres_repository";

type Fixture = {
  job: Record<string, unknown>;
  valid_candidate: Record<string, unknown>;
};
const fixture = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
  "utf8",
)) as Fixture;
const queueSchema = readFileSync(
  new URL("../sql/day146_rtx_structuring_queue_foundation.sql", import.meta.url),
  "utf8",
);
const bridgeSchema = readFileSync(
  new URL("../sql/day146_rtx_worker_bridge_foundation.sql", import.meta.url),
  "utf8",
);
const KEY = "fixture-only-postgres-hmac-key-minimum-32";
const NOW = new Date("2026-07-29T13:00:00.000Z");
const metrics = {
  pass_1_latency_ms: 100,
  pass_2_latency_ms: 50,
  completion_tokens: 25,
  handoff_bytes: 500,
  candidate_bytes: 700,
  reasoning_present: true,
  gpu_utilization_percent: 80,
  gpu_temperature_celsius: 65,
};
const privateTransport = {
  source: "tailscale_private",
  public_request: false,
  ordinary_lan_request: false,
  tls_or_private_overlay_verified: true,
} as const;
let nonceSequence = 0;

function job(suffix: string, hash: string) {
  return {
    ...structuredClone(fixture.job),
    job_id: `rtx_job_bridge_${suffix}`,
    source_snapshot_id: `snapshot_bridge_${suffix}`,
    source_record_id: `work_bridge_${suffix}`,
    source_content_hash: hash.repeat(64),
  };
}
function candidate(value: Record<string, unknown>) {
  return {
    ...structuredClone(fixture.valid_candidate),
    job_id: value.job_id,
    source_snapshot_id: value.source_snapshot_id,
    source_record_id: value.source_record_id,
    source_content_hash: value.source_content_hash,
  };
}
function bridge(
  repository: FarmOsRtxWorkerBridgePostgresRepository,
  now = NOW,
) {
  return new FarmOsRtxWorkerBridgeService({
    repository,
    hmac_key: KEY,
    environment: { FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true" },
    clock: () => now,
  });
}
async function call(
  service: FarmOsRtxWorkerBridgeService,
  path: string,
  body: unknown,
  nonce = `pg_bridge_nonce_${String(++nonceSequence).padStart(4, "0")}`,
) {
  const raw = JSON.stringify(body);
  const headers = signFarmOsRtxBridgeRequest({
    hmac_key: KEY,
    method: "POST",
    path,
    worker_id: FARM_OS_RTX_WORKER_ID,
    timestamp: String(Math.floor(NOW.getTime() / 1000)),
    nonce,
    raw_body: raw,
  });
  return service.handle({
    method: "POST",
    path,
    headers,
    raw_body: raw,
    transport_context: privateTransport,
  });
}
async function appendOnly(
  client: PoolClient,
  sql: string,
): Promise<void> {
  await client.query("savepoint append_only_check");
  try {
    await client.query(sql);
    assert.fail("append-only mutation unexpectedly succeeded");
  } catch (error) {
    assert.match(String(error), /rtx_worker_bridge_append_only/u);
  } finally {
    await client.query("rollback to savepoint append_only_check");
  }
}

assert.equal(process.env.FARMOS_DAY146_RTX_BRIDGE_POSTGRES_ISOLATED, "true");
const pool = new Pool({
  host: "127.0.0.1",
  port: 55434,
  database: "farmos_day146_rtx_bridge",
  user: "postgres",
  password: "day146-rtx-bridge-fixture-only",
  ssl: false,
  max: 6,
  connectionTimeoutMillis: 2000,
});
const queueRepository = new FarmOsRtxStructuringPostgresRepository({ pool });
const bridgeRepository = new FarmOsRtxWorkerBridgePostgresRepository({
  pool,
  feature_enabled: true,
});
const claimBody = {
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  worker_capabilities: { night_two_pass: true },
  maximum_jobs: 1,
};

try {
  assert.match((await pool.query<{ server_version: string }>(
    "show server_version",
  )).rows[0]?.server_version ?? "", /^16\./u);
  await pool.query(queueSchema);
  await pool.query(bridgeSchema);
  await pool.query(bridgeSchema);
  const schema = await pool.query<{
    relations: string;
    triggers: string;
  }>(`
    select
      (select count(*)::text from pg_class c join pg_namespace n
        on n.oid=c.relnamespace where n.nspname='ai'
        and c.relname like 'rtx_worker_bridge_%' and c.relkind='r') relations,
      (select count(*)::text from pg_trigger t join pg_class c
        on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='ai' and not t.tgisinternal
        and t.tgname like 'rtx_worker_bridge_%_append_only') triggers
  `);
  assert.deepEqual(schema.rows[0], { relations: "3", triggers: "3" });

  const candidateJob = job("candidate", "b");
  assert.equal((await queueRepository.createFixtureJob(candidateJob)).status,
    "created");
  const service = bridge(bridgeRepository);
  const claim = await call(
    service,
    "/internal/rtx-worker/v1/claim",
    claimBody,
  );
  assert.equal(claim.body.result, "leased");
  assert.equal((claim.body.job as Record<string, unknown>).job_id,
    candidateJob.job_id);
  const receipt = claim.body.lease_receipt;
  assert.equal(typeof receipt, "string");

  const heartbeat = await call(
    service,
    "/internal/rtx-worker/v1/heartbeat",
    {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      job_id: candidateJob.job_id,
      lease_receipt: receipt,
    },
  );
  assert.equal(heartbeat.body.result, "lease_extended");

  const candidateBody = {
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: candidateJob.job_id,
    lease_receipt: receipt,
    candidate: candidate(candidateJob),
    worker_metrics: metrics,
  };
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/candidate",
    candidateBody,
  )).body.result, "accepted");
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/candidate",
    candidateBody,
  )).body.result, "idempotent_replay");
  const beforeConflict = await queueRepository.readState();
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/candidate",
    {
      ...candidateBody,
      candidate: { ...candidate(candidateJob), confidence: 0.61 },
    },
  )).body.result, "conflict");
  const afterConflict = await queueRepository.readState();
  assert.equal(afterConflict.candidates.length, beforeConflict.candidates.length);
  assert.equal(afterConflict.events.length, beforeConflict.events.length);
  assert.equal(afterConflict.candidates[0]?.automatically_promoted, false);

  const failureJob = job("failure", "c");
  assert.equal((await queueRepository.createFixtureJob(failureJob)).status,
    "created");
  const failureClaim = await call(
    service,
    "/internal/rtx-worker/v1/claim",
    claimBody,
  );
  assert.equal((failureClaim.body.job as Record<string, unknown>).job_id,
    failureJob.job_id);
  const failureBody = {
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: failureJob.job_id,
    lease_receipt: failureClaim.body.lease_receipt,
    failure_code: "request_timeout",
    retryable: true,
    safe_metrics: metrics,
  };
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/failure",
    failureBody,
  )).body.result, "failure_recorded");
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/failure",
    failureBody,
  )).body.result, "idempotent_replay");
  assert.equal((await queueRepository.readState()).events.at(-1)?.status,
    "retry_pending");

  const replayJob = job("replay", "d");
  await queueRepository.createFixtureJob(replayJob);
  const replayNonce = "pg_nonce_replay_single_use";
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/claim",
    claimBody,
    replayNonce,
  )).body.result, "leased");
  assert.equal((await call(
    service,
    "/internal/rtx-worker/v1/claim",
    claimBody,
    replayNonce,
  )).body.result, "replay_rejected");

  const rollbackJob = job("rollback", "e");
  await queueRepository.createFixtureJob(rollbackJob);
  const beforeRollback = await queueRepository.readState();
  const rollback = await bridgeRepository.execute({
    operation: "claim",
    worker_id: FARM_OS_RTX_WORKER_ID,
    nonce: "pg_nonce_atomic_rollback",
    request_id: "request_atomic_rollback",
    body_sha256: "f".repeat(64),
    body_size: 99999,
    received_at: NOW.toISOString(),
    nonce_expires_at: new Date(NOW.getTime() + 600_000).toISOString(),
    request: claimBody,
  });
  assert.equal(rollback.result, "rejected");
  const afterRollback = await queueRepository.readState();
  assert.equal(afterRollback.events.length, beforeRollback.events.length);
  const nonceCount = await pool.query<{ count: string }>(`
    select count(*)::text count from ai.rtx_worker_bridge_nonces
    where nonce='pg_nonce_atomic_rollback'
  `);
  assert.equal(nonceCount.rows[0]?.count, "0");

  const client = await pool.connect();
  try {
    await client.query("begin");
    await appendOnly(client,
      "update ai.rtx_worker_bridge_nonces set request_id='changed'");
    await appendOnly(client,
      "delete from ai.rtx_worker_bridge_lease_events");
    await appendOnly(client,
      "update ai.rtx_worker_bridge_audit_events set accepted=false");
    await client.query(`
      insert into ai.rtx_worker_bridge_nonces (
        worker_id, nonce, request_id, received_at, expires_at
      ) values (
        'worker_windows_main_01', 'pg_nonce_expired_purge_fixture',
        'request_expired_purge_fixture',
        statement_timestamp() - interval '700 seconds',
        statement_timestamp() - interval '100 seconds'
      )
    `);
    const purged = await client.query(`
      delete from ai.rtx_worker_bridge_nonces
      where nonce='pg_nonce_expired_purge_fixture'
    `);
    assert.equal(purged.rowCount, 1);
    await client.query("rollback");
  } finally {
    client.release();
  }

  const audit = await pool.query<{
    raw_signature_stored: boolean;
    request_body_stored: boolean;
  }>(`
    select raw_signature_stored, request_body_stored
    from ai.rtx_worker_bridge_audit_events
  `);
  assert.ok(audit.rows.length > 0);
  assert.ok(audit.rows.every((row) =>
    row.raw_signature_stored === false &&
    row.request_body_stored === false
  ));
  const databaseText = JSON.stringify(audit.rows);
  for (const forbidden of [
    "FARMOS_RTX_BRIDGE_HMAC_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "reasoning_content",
  ]) assert.equal(databaseText.includes(forbidden), false);

  console.log(JSON.stringify({
    test: "farm_os_day146_rtx_worker_bridge_postgres",
    postgres_version: 16,
    schema_reapply: "PASS",
    nonce_replay_protection: "PASS",
    atomic_lease: "PASS",
    heartbeat: "PASS",
    candidate_persistence: "PASS",
    failure_persistence: "PASS",
    idempotent_replay: "PASS",
    conflict_rollback: "PASS",
    append_only: "PASS",
    transaction_rollback: "PASS",
    production_db_operation: false,
    linked_db_operation: false,
  }));
} finally {
  await bridgeRepository.close();
  await queueRepository.close();
  await pool.end();
}
