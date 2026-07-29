import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS,
  FARM_OS_RTX_BRIDGE_MAXIMUM_EXTENSIONS,
  type FarmOsRtxBridgeCandidateRequest,
  type FarmOsRtxBridgeFailureRequest,
  type FarmOsRtxBridgeHeartbeatRequest,
} from "./farm_os_rtx_worker_bridge_contract";
import type {
  FarmOsRtxBridgeRepositoryInput,
  FarmOsRtxBridgeRepositoryResult,
  FarmOsRtxWorkerBridgeRepository,
} from "./farm_os_rtx_worker_bridge_service";
import {
  computeFarmOsRtxBridgeResultHash,
} from "./farm_os_rtx_worker_bridge_service";
import {
  applyFarmOsRtxQueueMutation,
  readFarmOsRtxQueueState,
} from "./farm_os_rtx_structuring_postgres_repository";

const LOCK_SQL = "select pg_advisory_xact_lock(hashtext($1::text))";
const LOCK_KEY = "farmos_rtx_structuring_queue_v1";
type BridgePool = { connect(): Promise<PoolClient>; end(): Promise<void> };
type LeaseRow = {
  job_id: string;
  worker_id: string;
  receipt_hash: string;
  lease_expires_at: Date | string;
  extension_count: number;
  event_type: string;
  result_kind: "candidate" | "failure" | null;
  result_hash: string | null;
};

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function id(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}
function safe(): FarmOsRtxBridgeRepositoryResult["safety"] {
  return {
    business_sot_changed: false,
    active_projection_modified: false,
    candidate_auto_promoted: false,
    fallback_model_used: false,
    farming_app_write_performed: false,
  };
}
function result(
  value: FarmOsRtxBridgeRepositoryResult["result"],
  extra: Omit<FarmOsRtxBridgeRepositoryResult, "result" | "safety"> = {},
): FarmOsRtxBridgeRepositoryResult {
  return { result: value, ...extra, safety: safe() };
}
function equalHash(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/u.test(left) || !/^[0-9a-f]{64}$/u.test(right)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
function iso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

async function latestLease(
  client: PoolClient,
  jobId: string,
): Promise<LeaseRow | null> {
  const value = await client.query<LeaseRow>(`
    select job_id, worker_id, receipt_hash, lease_expires_at,
      extension_count, event_type, result_kind, result_hash
    from ai.rtx_worker_bridge_lease_events
    where job_id = $1
    order by event_sequence desc
    limit 1
  `, [jobId]);
  return value.rows[0] ?? null;
}

async function insertLeaseEvent(client: PoolClient, input: {
  job_id: string;
  worker_id: string;
  receipt_hash: string;
  lease_expires_at: string;
  extension_count: number;
  event_type:
    | "claimed"
    | "extended"
    | "candidate_accepted"
    | "candidate_rejected"
    | "failure_recorded";
  result_kind: "candidate" | "failure" | null;
  result_hash: string | null;
  created_at: string;
}): Promise<void> {
  await client.query(`
    insert into ai.rtx_worker_bridge_lease_events (
      event_id, job_id, worker_id, receipt_hash, lease_expires_at,
      extension_count, event_type, result_kind, result_hash, created_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    id("rtx_bridge_lease_event"),
    input.job_id,
    input.worker_id,
    input.receipt_hash,
    input.lease_expires_at,
    input.extension_count,
    input.event_type,
    input.result_kind,
    input.result_hash,
    input.created_at,
  ]);
}

export class FarmOsRtxWorkerBridgePostgresRepository
  implements FarmOsRtxWorkerBridgeRepository {
  private readonly pool: BridgePool;
  private readonly ownsPool: boolean;
  private readonly featureEnabled: boolean;
  constructor(
    input:
      | { pool: BridgePool; feature_enabled?: boolean }
      | { poolConfig: PoolConfig; feature_enabled?: boolean },
  ) {
    if ("pool" in input) {
      this.pool = input.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        ...input.poolConfig,
        application_name: "farmos-core-rtx-worker-bridge",
        max: Math.min(input.poolConfig.max ?? 2, 4),
      });
      this.ownsPool = true;
    }
    this.featureEnabled = input.feature_enabled === true;
  }

  async execute(
    input: FarmOsRtxBridgeRepositoryInput,
  ): Promise<FarmOsRtxBridgeRepositoryResult> {
    if (!this.featureEnabled) return result("unavailable");
    const client = await this.pool.connect();
    let started = false;
    try {
      await client.query("begin isolation level read committed read write");
      started = true;
      await client.query("set local statement_timeout = '10000ms'");
      await client.query("set local lock_timeout = '10000ms'");
      await client.query(LOCK_SQL, [LOCK_KEY]);
      await client.query(`
        delete from ai.rtx_worker_bridge_nonces
        where expires_at <= statement_timestamp()
      `);
      const nonce = await client.query(`
        insert into ai.rtx_worker_bridge_nonces (
          worker_id, nonce, request_id, received_at, expires_at
        ) values ($1,$2,$3,$4,$5)
        on conflict do nothing
        returning nonce
      `, [
        input.worker_id,
        input.nonce,
        input.request_id,
        input.received_at,
        input.nonce_expires_at,
      ]);
      if (nonce.rowCount !== 1) {
        await client.query("commit");
        started = false;
        return result("replay_rejected");
      }
      let outcome: FarmOsRtxBridgeRepositoryResult;
      if (input.operation === "claim") {
        outcome = await this.claim(client, input);
      } else {
        outcome = await this.withLease(client, input);
      }
      await client.query(`
        insert into ai.rtx_worker_bridge_audit_events (
          audit_id, worker_id, operation, request_id, accepted,
          failure_code, received_at, body_size,
          raw_signature_stored, request_body_stored
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,false,false)
      `, [
        id("rtx_bridge_audit"),
        input.worker_id,
        input.operation,
        input.request_id,
        ["leased", "accepted", "idempotent_replay", "lease_extended",
          "failure_recorded", "no_jobs"].includes(outcome.result),
        outcome.failure_code ?? null,
        input.received_at,
        input.body_size,
      ]);
      await client.query("commit");
      started = false;
      return outcome;
    } catch {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed without exposing DB or request details.
        }
      }
      return result("rejected", { failure_code: "BRIDGE_TRANSACTION_FAILED" });
    } finally {
      client.release();
    }
  }

  private async claim(
    client: PoolClient,
    input: FarmOsRtxBridgeRepositoryInput,
  ): Promise<FarmOsRtxBridgeRepositoryResult> {
    const claimed = await applyFarmOsRtxQueueMutation(
      client,
      (queue) =>
        queue.claim({
          authenticated_worker_id: input.worker_id,
          now: input.received_at,
          maximum_jobs: 1,
        }),
    );
    const job = claimed.jobs[0];
    if (!job) return result("no_jobs");
    const queue = await readFarmOsRtxQueueState(client);
    const event = queue.events.filter((candidate) =>
      candidate.job_id === job.job_id
    ).at(-1);
    if (!event?.lease_expires_at) {
      throw new Error("RTX_BRIDGE_LEASE_NOT_CREATED");
    }
    const receipt = randomBytes(32).toString("base64url");
    await insertLeaseEvent(client, {
      job_id: job.job_id,
      worker_id: input.worker_id,
      receipt_hash: digest(receipt),
      lease_expires_at: event.lease_expires_at,
      extension_count: 0,
      event_type: "claimed",
      result_kind: null,
      result_hash: null,
      created_at: input.received_at,
    });
    return result("leased", {
      job,
      lease_receipt: receipt,
      lease_expires_at: event.lease_expires_at,
    });
  }

  private async withLease(
    client: PoolClient,
    input: FarmOsRtxBridgeRepositoryInput,
  ): Promise<FarmOsRtxBridgeRepositoryResult> {
    const request = input.request as
      | FarmOsRtxBridgeHeartbeatRequest
      | FarmOsRtxBridgeCandidateRequest
      | FarmOsRtxBridgeFailureRequest;
    const lease = await latestLease(client, request.job_id);
    if (!lease || lease.worker_id !== input.worker_id ||
      !equalHash(lease.receipt_hash, digest(request.lease_receipt))) {
      return result("rejected", { failure_code: "LEASE_INVALID" });
    }
    const resultHash = computeFarmOsRtxBridgeResultHash(
      input.operation,
      input.request,
    );
    const resultKind = input.operation === "submit_failure"
      ? "failure"
      : "candidate";
    if (lease.result_hash !== null) {
      return lease.result_kind === resultKind &&
          equalHash(lease.result_hash, resultHash)
        ? result("idempotent_replay")
        : result("conflict", { failure_code: "RESULT_CONFLICT" });
    }
    if (Date.parse(input.received_at) >= Date.parse(iso(lease.lease_expires_at))) {
      return result("rejected", { failure_code: "LEASE_EXPIRED" });
    }
    if (input.operation === "heartbeat") {
      if (lease.extension_count >= FARM_OS_RTX_BRIDGE_MAXIMUM_EXTENSIONS) {
        return result("rejected", {
          failure_code: "HEARTBEAT_LIMIT_EXCEEDED",
        });
      }
      const expiresAt = new Date(
        Math.max(
          Date.parse(input.received_at),
          Date.parse(iso(lease.lease_expires_at)),
        ) +
          FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS * 1000,
      ).toISOString();
      const extended = await applyFarmOsRtxQueueMutation(
        client,
        (queue) =>
          queue.extendLease({
            authenticated_worker_id: input.worker_id,
            job_id: request.job_id,
            now: input.received_at,
            lease_expires_at: expiresAt,
          }),
      );
      if (extended.status !== "lease_extended") {
        throw new Error("RTX_BRIDGE_HEARTBEAT_FAILED");
      }
      await insertLeaseEvent(client, {
        job_id: request.job_id,
        worker_id: input.worker_id,
        receipt_hash: lease.receipt_hash,
        lease_expires_at: expiresAt,
        extension_count: lease.extension_count + 1,
        event_type: "extended",
        result_kind: null,
        result_hash: null,
        created_at: input.received_at,
      });
      return result("lease_extended", { lease_expires_at: expiresAt });
    }
    if (input.operation === "submit_candidate") {
      const request = input.request as FarmOsRtxBridgeCandidateRequest;
      if (request.candidate.job_id !== request.job_id) {
        return result("rejected", {
          failure_code: "CANDIDATE_JOB_MISMATCH",
        });
      }
      const saved = await applyFarmOsRtxQueueMutation(
        client,
        (queue) =>
          queue.saveCandidate({
            authenticated_worker_id: input.worker_id,
            value: request.candidate,
            now: input.received_at,
          }),
      );
      const accepted = saved.status === "candidate_saved";
      await insertLeaseEvent(client, {
        job_id: request.job_id,
        worker_id: input.worker_id,
        receipt_hash: lease.receipt_hash,
        lease_expires_at: iso(lease.lease_expires_at),
        extension_count: lease.extension_count,
        event_type: accepted ? "candidate_accepted" : "candidate_rejected",
        result_kind: "candidate",
        result_hash: resultHash,
        created_at: input.received_at,
      });
      return accepted
        ? result("accepted")
        : result("rejected", { failure_code: "CANDIDATE_REJECTED" });
    }
    const failure = input.request as FarmOsRtxBridgeFailureRequest;
    const saved = await applyFarmOsRtxQueueMutation(
      client,
      (queue) =>
        queue.reportFailure({
          authenticated_worker_id: input.worker_id,
          job_id: failure.job_id,
          now: input.received_at,
          failure_code: failure.failure_code,
          retryable: failure.retryable,
        }),
    );
    if (saved.status !== "failure_recorded") {
      throw new Error("RTX_BRIDGE_FAILURE_REPORT_FAILED");
    }
    await insertLeaseEvent(client, {
      job_id: failure.job_id,
      worker_id: input.worker_id,
      receipt_hash: lease.receipt_hash,
      lease_expires_at: iso(lease.lease_expires_at),
      extension_count: lease.extension_count,
      event_type: "failure_recorded",
      result_kind: "failure",
      result_hash: resultHash,
      created_at: input.received_at,
    });
    return result("failure_recorded");
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}
