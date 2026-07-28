import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  FarmOsInMemoryRtxStructuringQueue,
  type FarmOsRtxJobStateEvent,
  type FarmOsRtxPersistedCandidate,
  type FarmOsRtxQueueResult,
  type FarmOsRtxQueueState,
} from "./farm_os_rtx_structuring_queue";
import type {
  FarmOsRtxStructuringJob,
} from "./farm_os_rtx_structuring_contract";

const LOCK_SQL =
  "select pg_advisory_xact_lock(hashtext($1::text))";
const LOCK_KEY = "farmos_rtx_structuring_queue_v1";
const BUNDLE_SQL =
  "select ai.persist_rtx_structuring_bundle($1::jsonb,$2::jsonb,$3::jsonb) as result";

type QueuePool = { connect(): Promise<PoolClient>; end(): Promise<void> };
type JobRow = { job_json: FarmOsRtxStructuringJob };
type EventRow = Omit<
  FarmOsRtxJobStateEvent,
  | "available_at"
  | "lease_expires_at"
  | "created_at"
  | "updated_at"
  | "completed_at"
  | "sequence"
> & {
  available_at: Date | string;
  lease_expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
  sequence: string | number;
};
type CandidateRow = Omit<FarmOsRtxPersistedCandidate, "created_at"> & {
  created_at: Date | string;
};

function iso(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("RTX_DB_TIME_INVALID");
  return parsed.toISOString();
}

function sequence(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("RTX_DB_SEQUENCE_INVALID");
  }
  return parsed;
}

async function readState(client: PoolClient): Promise<FarmOsRtxQueueState> {
  const jobs = await client.query<JobRow>(`
    select job_json from ai.rtx_structuring_jobs order by created_at, job_id
  `);
  const events = await client.query<EventRow>(`
    select event_id, job_id, status, attempt, available_at, lease_owner,
      lease_expires_at, created_at, completed_at, failure_code,
      updated_at,
      event_sequence as sequence
    from ai.rtx_structuring_job_state_events order by event_sequence
  `);
  const candidates = await client.query<CandidateRow>(`
    select candidate_id, job_id, source_snapshot_id, source_content_hash,
      model_provenance, candidate_json, validation_result, validation_errors,
      created_at, state, business_sot, projection_active_version,
      automatically_promoted, worker_output_untrusted
    from ai.rtx_structuring_candidates order by created_at, candidate_id
  `);
  const normalizedEvents = events.rows.map((event) => ({
    ...event,
    available_at: iso(event.available_at),
    lease_expires_at: event.lease_expires_at === null
      ? null
      : iso(event.lease_expires_at),
    created_at: iso(event.created_at),
    updated_at: iso(event.updated_at),
    completed_at: event.completed_at === null ? null : iso(event.completed_at),
    sequence: sequence(event.sequence),
  }));
  return {
    jobs: jobs.rows.map((row) => structuredClone(row.job_json)),
    events: normalizedEvents,
    candidates: candidates.rows.map((candidate) => ({
      ...candidate,
      created_at: iso(candidate.created_at),
    })),
    next_sequence:
      Math.max(0, ...normalizedEvents.map((event) => event.sequence)) + 1,
  };
}

function delta<T>(before: T[], after: T[]): T[] {
  if (after.length < before.length) throw new Error("RTX_DB_STATE_REGRESSED");
  return after.slice(before.length);
}

function jobRows(jobs: FarmOsRtxStructuringJob[]): unknown[] {
  return jobs.map((job) => ({
    job_id: job.job_id,
    contract_version: job.contract_version,
    source_snapshot_id: job.source_snapshot_id,
    source_record_id: job.source_record_id,
    source_content_hash: job.source_content_hash,
    business_date: job.business_date,
    semantic_source_status: job.semantic_source_status,
    production_job_creation: job.production_job_creation,
    job_json: job,
    created_at: job.created_at,
    not_before: job.not_before,
    maximum_attempts: job.maximum_attempts,
  }));
}

function ids(state: FarmOsRtxQueueState): string {
  return JSON.stringify({
    jobs: state.jobs.map((job) => job.job_id).sort(),
    events: state.events.map((event) => event.event_id).sort(),
    candidates: state.candidates.map((candidate) => candidate.candidate_id)
      .sort(),
  });
}

export class FarmOsRtxStructuringPostgresRepository {
  private readonly pool: QueuePool;
  private readonly ownsPool: boolean;

  constructor(input: { pool: QueuePool } | { poolConfig: PoolConfig }) {
    if ("pool" in input) {
      this.pool = input.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        ...input.poolConfig,
        application_name: "farmos-core-rtx-structuring-queue",
        max: Math.min(input.poolConfig.max ?? 2, 4),
      });
      this.ownsPool = true;
    }
  }

  createProductionJob(): FarmOsRtxQueueResult {
    return new FarmOsInMemoryRtxStructuringQueue().createProductionJob();
  }

  private async mutate(
    operation: (queue: FarmOsInMemoryRtxStructuringQueue) => FarmOsRtxQueueResult,
  ): Promise<FarmOsRtxQueueResult> {
    const client = await this.pool.connect();
    let started = false;
    try {
      await client.query("begin isolation level read committed read write");
      started = true;
      await client.query("set local statement_timeout = '10000ms'");
      await client.query("set local lock_timeout = '10000ms'");
      await client.query(LOCK_SQL, [LOCK_KEY]);
      const before = await readState(client);
      const queue = new FarmOsInMemoryRtxStructuringQueue(before);
      const result = operation(queue);
      const after = queue.snapshot();
      const jobDelta = delta(before.jobs, after.jobs);
      const eventDelta = delta(before.events, after.events);
      const candidateDelta = delta(before.candidates, after.candidates);
      if (jobDelta.length + eventDelta.length + candidateDelta.length > 0) {
        await client.query(BUNDLE_SQL, [
          JSON.stringify(jobRows(jobDelta)),
          JSON.stringify(eventDelta),
          JSON.stringify(candidateDelta),
        ]);
      }
      const persisted = await readState(client);
      if (ids(after) !== ids(persisted)) throw new Error("RTX_DB_READBACK_MISMATCH");
      await client.query("commit");
      started = false;
      return result;
    } catch {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed without exposing connection or worker output.
        }
      }
      return {
        status: "no_jobs",
        jobs: [],
        candidate: null,
        writes: { jobs: 0, events: 0, candidates: 0 },
        safety: {
          business_sot_changed: false,
          active_projection_modified: false,
          worker_database_access_granted: false,
          farming_app_write_performed: false,
          candidate_auto_promoted: false,
          fallback_model_used: false,
        },
      };
    } finally {
      client.release();
    }
  }

  createFixtureJob(value: unknown): Promise<FarmOsRtxQueueResult> {
    return this.mutate((queue) => queue.createFixtureJob(value));
  }

  claim(input: {
    authenticated_worker_id: string;
    now: string;
    maximum_jobs: 3;
  }): Promise<FarmOsRtxQueueResult> {
    return this.mutate((queue) => queue.claim(input));
  }

  recoverExpired(now: string): Promise<FarmOsRtxQueueResult> {
    return this.mutate((queue) => {
      const before = queue.snapshot().events.length;
      queue.recoverExpired(now);
      const writes = queue.snapshot().events.length - before;
      return {
        status: writes > 0 ? "worker_unavailable" : "no_jobs",
        jobs: [],
        candidate: null,
        writes: { jobs: 0, events: writes, candidates: 0 },
        safety: {
          business_sot_changed: false,
          active_projection_modified: false,
          worker_database_access_granted: false,
          farming_app_write_performed: false,
          candidate_auto_promoted: false,
          fallback_model_used: false,
        },
      };
    });
  }

  workerUnavailable(input: {
    job_id: string;
    now: string;
  }): Promise<FarmOsRtxQueueResult> {
    return this.mutate((queue) => queue.workerUnavailable(input));
  }

  saveCandidate(input: {
    authenticated_worker_id: string;
    value: unknown;
    now: string;
  }): Promise<FarmOsRtxQueueResult> {
    return this.mutate((queue) => queue.saveCandidate(input));
  }

  async readState(): Promise<FarmOsRtxQueueState> {
    const client = await this.pool.connect();
    let started = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      started = true;
      const state = await readState(client);
      await client.query("commit");
      started = false;
      return state;
    } catch {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed.
        }
      }
      throw new Error("RTX_DB_READ_FAILED");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}
