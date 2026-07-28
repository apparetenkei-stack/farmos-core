import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

import {
  FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
} from "../../src/lib/hermes/farm_os_rtx_structuring_contract";
import {
  FarmOsRtxStructuringPostgresRepository,
} from "../../src/lib/hermes/farm_os_rtx_structuring_postgres_repository";

type FixtureDocument = {
  job: Record<string, unknown>;
  valid_candidate: Record<string, unknown>;
};
const fixture = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
  "utf8",
)) as FixtureDocument;
const schemaSql = readFileSync(
  new URL("../sql/day146_rtx_structuring_queue_foundation.sql", import.meta.url),
  "utf8",
);

function jobVariant(suffix: string, hashCharacter: string) {
  return {
    ...structuredClone(fixture.job),
    job_id: `rtx_job_fixture_${suffix}`,
    source_snapshot_id: `snapshot_fixture_${suffix}`,
    source_record_id: `work_fixture_${suffix}`,
    source_content_hash: hashCharacter.repeat(64),
  };
}

function candidateFor(job: Record<string, unknown>) {
  return {
    ...structuredClone(fixture.valid_candidate),
    job_id: job.job_id,
    source_snapshot_id: job.source_snapshot_id,
    source_record_id: job.source_record_id,
    source_content_hash: job.source_content_hash,
  };
}

async function appendOnly(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<void> {
  await client.query("savepoint append_only_check");
  try {
    await client.query(sql, values);
    assert.fail("append-only mutation unexpectedly succeeded");
  } catch (error) {
    assert.match(String(error), /rtx_structuring_append_only/u);
  } finally {
    await client.query("rollback to savepoint append_only_check");
  }
}

assert.equal(process.env.FARMOS_DAY146_RTX_POSTGRES_ISOLATED, "true");
const pool = new Pool({
  host: "127.0.0.1",
  port: 55433,
  database: "farmos_day146_rtx",
  user: "postgres",
  password: "day146-rtx-fixture-only",
  ssl: false,
  max: 6,
  connectionTimeoutMillis: 2000,
});
const repository = new FarmOsRtxStructuringPostgresRepository({ pool });

try {
  const version = await pool.query<{ server_version: string }>(
    "show server_version",
  );
  assert.match(version.rows[0]?.server_version ?? "", /^16\./u);
  await pool.query(schemaSql);
  await pool.query(schemaSql);
  const schema = await pool.query<{
    relation_count: string;
    trigger_count: string;
    function_count: string;
    identity_count: string;
  }>(`
    select
      (select count(*)::text from pg_class c join pg_namespace n
        on n.oid = c.relnamespace where n.nspname = 'ai'
        and c.relname like 'rtx_structuring_%' and c.relkind = 'r')
        as relation_count,
      (select count(*)::text from pg_trigger t join pg_class c
        on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'ai' and not t.tgisinternal
        and t.tgname like 'rtx_structuring_%_append_only') as trigger_count,
      (select count(*)::text from pg_proc p join pg_namespace n
        on n.oid = p.pronamespace where n.nspname = 'ai'
        and p.proname = 'persist_rtx_structuring_bundle') as function_count,
      (select count(*)::text from information_schema.columns
        where table_schema = 'ai' and column_name = 'event_sequence'
        and is_identity = 'YES') as identity_count
  `);
  assert.deepEqual(schema.rows[0], {
    relation_count: "3",
    trigger_count: "3",
    function_count: "1",
    identity_count: "1",
  });

  assert.equal(repository.createProductionJob().status,
    "production_source_unavailable");
  assert.equal((await repository.readState()).jobs.length, 0);

  const duplicateJob = jobVariant("duplicate", "b");
  const duplicateResults = await Promise.all([
    repository.createFixtureJob(duplicateJob),
    repository.createFixtureJob(duplicateJob),
  ]);
  assert.equal(
    duplicateResults.filter((result) => result.status === "created").length,
    1,
  );
  assert.equal(
    duplicateResults.filter((result) =>
      result.status === "duplicate_ignored"
    ).length,
    1,
  );

  const leaseResults = await Promise.all([
    repository.claim({
      authenticated_worker_id: "worker_fixture_a",
      now: "2026-07-28T22:00:00+09:00",
      maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
    }),
    repository.claim({
      authenticated_worker_id: "worker_fixture_b",
      now: "2026-07-28T22:00:00+09:00",
      maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
    }),
  ]);
  assert.equal(
    leaseResults.flatMap((result) => result.jobs).length,
    1,
  );
  assert.equal((await repository.readState()).events.filter((event) =>
    event.status === "leased"
  ).length, 1);
  await repository.workerUnavailable({
    job_id: duplicateJob.job_id as string,
    now: "2026-07-28T22:02:00+09:00",
  });
  assert.equal((await repository.readState()).events.at(-1)?.status,
    "retry_pending");

  const candidateJob = jobVariant("candidate", "c");
  await repository.createFixtureJob(candidateJob);
  await repository.claim({
    authenticated_worker_id: "worker_fixture_candidate",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const saved = await repository.saveCandidate({
    authenticated_worker_id: "worker_fixture_candidate",
    value: candidateFor(candidateJob),
    now: "2026-07-28T22:05:00+09:00",
  });
  assert.equal(saved.status, "candidate_saved");
  assert.equal(saved.candidate?.automatically_promoted, false);
  assert.equal(saved.candidate?.projection_active_version, false);

  const invalidJob = jobVariant("invalid", "d");
  await repository.createFixtureJob(invalidJob);
  await repository.claim({
    authenticated_worker_id: "worker_fixture_invalid",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const invalidCandidate = {
    ...candidateFor(invalidJob),
    summary: "sourceにない確定事実",
  };
  const rejected = await repository.saveCandidate({
    authenticated_worker_id: "worker_fixture_invalid",
    value: invalidCandidate,
    now: "2026-07-28T22:05:00+09:00",
  });
  assert.equal(rejected.status, "candidate_rejected");
  assert.equal(rejected.candidate?.state, "rejected");
  assert.equal(rejected.safety.active_projection_modified, false);
  assert.equal(rejected.safety.fallback_model_used, false);

  const beforeRollback = await repository.readState();
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query("begin");
    await assert.rejects(rollbackClient.query(
      "select ai.persist_rtx_structuring_bundle($1::jsonb,$2::jsonb,$3::jsonb)",
      [
        JSON.stringify([{
          job_id: "rtx_job_atomic_failure",
          contract_version: "farmos.operational_memory.rtx_structuring_job.v1",
          source_snapshot_id: "snapshot_atomic_failure",
          source_record_id: "work_atomic_failure",
          source_content_hash: "e".repeat(64),
          business_date: "2026-07-28",
          semantic_source_status: "fixture_only",
          production_job_creation: false,
          job_json: jobVariant("atomic", "e"),
          created_at: "2026-07-28T21:00:00+09:00",
          not_before: "2026-07-28T22:00:00+09:00",
          maximum_attempts: 3,
        }]),
        JSON.stringify([]),
        JSON.stringify([{
          candidate_id: "rtx_candidate_atomic_invalid",
          job_id: "rtx_job_atomic_failure",
          source_snapshot_id: "snapshot_atomic_failure",
          source_content_hash: "e".repeat(64),
          model_provenance: {},
          candidate_json: null,
          validation_result: "accepted_candidate",
          validation_errors: [],
          created_at: "2026-07-28T22:00:00+09:00",
          state: "candidate",
          business_sot: false,
          projection_active_version: false,
          automatically_promoted: true,
          worker_output_untrusted: true,
        }]),
      ],
    ));
    await rollbackClient.query("rollback");
  } finally {
    rollbackClient.release();
  }
  const afterRollback = await repository.readState();
  assert.deepEqual(
    [
      afterRollback.jobs.length,
      afterRollback.events.length,
      afterRollback.candidates.length,
    ],
    [
      beforeRollback.jobs.length,
      beforeRollback.events.length,
      beforeRollback.candidates.length,
    ],
  );

  const state = await repository.readState();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const jobId = state.jobs[0]?.job_id;
    const eventId = state.events[0]?.event_id;
    const candidateId = state.candidates[0]?.candidate_id;
    assert.ok(jobId && eventId && candidateId);
    await appendOnly(
      client,
      "update ai.rtx_structuring_jobs set created_at = created_at where job_id = $1",
      [jobId],
    );
    await appendOnly(
      client,
      "delete from ai.rtx_structuring_jobs where job_id = $1",
      [jobId],
    );
    await appendOnly(
      client,
      "update ai.rtx_structuring_job_state_events set created_at = created_at where event_id = $1",
      [eventId],
    );
    await appendOnly(
      client,
      "delete from ai.rtx_structuring_job_state_events where event_id = $1",
      [eventId],
    );
    await appendOnly(
      client,
      "update ai.rtx_structuring_candidates set created_at = created_at where candidate_id = $1",
      [candidateId],
    );
    await appendOnly(
      client,
      "delete from ai.rtx_structuring_candidates where candidate_id = $1",
      [candidateId],
    );
    await client.query("rollback");
  } finally {
    client.release();
  }

  console.log("farm_os_day146_rtx_structuring_postgres: PASS");
} finally {
  await pool.end();
}
