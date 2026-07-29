import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS,
  FARM_OS_RTX_BRIDGE_MAXIMUM_EXTENSIONS,
  FARM_OS_RTX_BRIDGE_NONCE_RETENTION_SECONDS,
  FARM_OS_RTX_BRIDGE_REQUEST_LIMITS,
  FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS,
  farmOsRtxWorkerBridgeEnabled,
  parseFarmOsRtxBridgeRequest,
  type FarmOsRtxBridgeOperation,
  type FarmOsRtxBridgeRequest,
} from "./farm_os_rtx_worker_bridge_contract";
import {
  authenticateFarmOsRtxBridgeRequest,
} from "./farm_os_rtx_worker_bridge_auth";
import {
  FarmOsInMemoryRtxStructuringQueue,
  type FarmOsRtxQueueState,
} from "./farm_os_rtx_structuring_queue";

export type FarmOsRtxBridgeRepositoryInput = {
  operation: FarmOsRtxBridgeOperation;
  worker_id: string;
  nonce: string;
  request_id: string;
  body_sha256: string;
  body_size: number;
  received_at: string;
  nonce_expires_at: string;
  request: FarmOsRtxBridgeRequest;
};

export type FarmOsRtxBridgeRepositoryResult = {
  result:
    | "leased"
    | "no_jobs"
    | "accepted"
    | "idempotent_replay"
    | "conflict"
    | "rejected"
    | "lease_extended"
    | "failure_recorded"
    | "replay_rejected"
    | "unavailable";
  job?: unknown;
  lease_receipt?: string;
  lease_expires_at?: string;
  failure_code?: string;
  safety: {
    business_sot_changed: false;
    active_projection_modified: false;
    candidate_auto_promoted: false;
    fallback_model_used: false;
    farming_app_write_performed: false;
  };
};

export interface FarmOsRtxWorkerBridgeRepository {
  execute(
    input: FarmOsRtxBridgeRepositoryInput,
  ): Promise<FarmOsRtxBridgeRepositoryResult>;
}

export type FarmOsRtxBridgeServiceResponse = {
  http_status: 200 | 400 | 401 | 409 | 413 | 503;
  body: {
    contract_version: "farmos.operational_memory.rtx_worker_bridge.v1";
    result:
      | FarmOsRtxBridgeRepositoryResult["result"]
      | "invalid_request"
      | "unauthorized"
      | "payload_too_large"
      | "unavailable";
    job?: unknown;
    lease_receipt?: string;
    lease_expires_at?: string;
    failure_code?: string;
  };
};

function safety(): FarmOsRtxBridgeRepositoryResult["safety"] {
  return {
    business_sot_changed: false,
    active_projection_modified: false,
    candidate_auto_promoted: false,
    fallback_model_used: false,
    farming_app_write_performed: false,
  };
}
function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) =>
          `${JSON.stringify(key)}:${canonicalJson(item)}`
        ).join(",")
    }}`;
  }
  return JSON.stringify(value);
}
export function computeFarmOsRtxBridgeResultHash(
  operation: FarmOsRtxBridgeOperation,
  request: FarmOsRtxBridgeRequest,
): string {
  const material = operation === "submit_candidate"
    ? (request as Extract<FarmOsRtxBridgeRequest, { candidate: unknown }>)
      .candidate
    : operation === "submit_failure"
    ? {
      failure_code:
        (request as Extract<FarmOsRtxBridgeRequest, { failure_code: string }>)
          .failure_code,
      retryable:
        (request as Extract<FarmOsRtxBridgeRequest, { failure_code: string }>)
          .retryable,
    }
    : request;
  return digest(canonicalJson(material));
}
function response(
  httpStatus: FarmOsRtxBridgeServiceResponse["http_status"],
  result: FarmOsRtxBridgeServiceResponse["body"]["result"],
  extra: Omit<FarmOsRtxBridgeServiceResponse["body"], "contract_version" | "result"> =
    {},
): FarmOsRtxBridgeServiceResponse {
  return {
    http_status: httpStatus,
    body: {
      contract_version: "farmos.operational_memory.rtx_worker_bridge.v1",
      result,
      ...extra,
    },
  };
}

export class FarmOsRtxWorkerBridgeService {
  constructor(private readonly dependencies: {
    repository: FarmOsRtxWorkerBridgeRepository;
    hmac_key: string;
    environment: Readonly<Record<string, string | undefined>>;
    clock?: () => Date;
  }) {}

  async handle(input: {
    method: string;
    path: string;
    headers: Readonly<Record<string, string | undefined>>;
    raw_body: string;
    transport_context: {
      source: "tailscale_private" | "loopback_private_proxy";
      public_request: false;
      ordinary_lan_request: false;
      tls_or_private_overlay_verified: true;
    };
  }): Promise<FarmOsRtxBridgeServiceResponse> {
    if (!farmOsRtxWorkerBridgeEnabled(this.dependencies.environment)) {
      return response(503, "unavailable");
    }
    if (
      (input.transport_context.source !== "tailscale_private" &&
        input.transport_context.source !== "loopback_private_proxy") ||
      input.transport_context.public_request !== false ||
      input.transport_context.ordinary_lan_request !== false ||
      input.transport_context.tls_or_private_overlay_verified !== true
    ) return response(401, "unauthorized");
    const operation = Object.entries({
      claim: "/internal/rtx-worker/v1/claim",
      submit_candidate: "/internal/rtx-worker/v1/candidate",
      submit_failure: "/internal/rtx-worker/v1/failure",
      heartbeat: "/internal/rtx-worker/v1/heartbeat",
    }).find(([, path]) => path === input.path)?.[0] as
      | FarmOsRtxBridgeOperation
      | undefined;
    if (input.method !== "POST" || operation === undefined) {
      return response(400, "invalid_request");
    }
    if (
      Buffer.byteLength(input.raw_body, "utf8") >
        FARM_OS_RTX_BRIDGE_REQUEST_LIMITS[operation]
    ) return response(413, "payload_too_large");
    const now = this.dependencies.clock?.() ?? new Date();
    const auth = authenticateFarmOsRtxBridgeRequest({
      hmac_key: this.dependencies.hmac_key,
      method: input.method,
      path: input.path,
      headers: input.headers,
      raw_body: input.raw_body,
      now_epoch_seconds: Math.floor(now.getTime() / 1000),
    });
    if (!auth.authenticated) return response(401, "unauthorized");
    let decoded: unknown;
    try {
      decoded = JSON.parse(input.raw_body);
    } catch {
      return response(400, "invalid_request");
    }
    const parsed = parseFarmOsRtxBridgeRequest(operation, decoded);
    if (parsed === null) return response(400, "invalid_request");
    const receivedAt = now.toISOString();
    const result = await this.dependencies.repository.execute({
      operation,
      worker_id: auth.worker_id,
      nonce: auth.nonce,
      request_id: digest([
        auth.worker_id,
        auth.nonce,
        auth.body_sha256,
      ].join("\n")).slice(0, 32),
      body_sha256: auth.body_sha256,
      body_size: Buffer.byteLength(input.raw_body, "utf8"),
      received_at: receivedAt,
      nonce_expires_at: new Date(
        now.getTime() + FARM_OS_RTX_BRIDGE_NONCE_RETENTION_SECONDS * 1000,
      ).toISOString(),
      request: parsed,
    });
    const body = {
      contract_version: "farmos.operational_memory.rtx_worker_bridge.v1" as const,
      result: result.result,
      ...(result.job === undefined ? {} : { job: result.job }),
      ...(result.lease_receipt === undefined
        ? {}
        : { lease_receipt: result.lease_receipt }),
      ...(result.lease_expires_at === undefined
        ? {}
        : { lease_expires_at: result.lease_expires_at }),
      ...(result.failure_code === undefined
        ? {}
        : { failure_code: result.failure_code }),
    };
    const maximum = operation === "claim"
      ? FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.claim
      : FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.ordinary;
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > maximum) {
      return response(503, "unavailable");
    }
    return {
      http_status: result.result === "conflict"
        ? 409
        : result.result === "unavailable"
        ? 503
        : 200,
      body,
    };
  }
}

type Lease = {
  job_id: string;
  worker_id: string;
  receipt_hash: string;
  expires_at: string;
  extension_count: number;
  result_hash: string | null;
  result_kind: "candidate" | "failure" | null;
};

export class FarmOsInMemoryRtxWorkerBridgeRepository
  implements FarmOsRtxWorkerBridgeRepository {
  private readonly queue: FarmOsInMemoryRtxStructuringQueue;
  private readonly nonces = new Set<string>();
  private readonly leases = new Map<string, Lease>();

  constructor(input: {
    queue_state: FarmOsRtxQueueState;
    receipt_factory?: () => string;
    feature_enabled?: boolean;
  }) {
    this.queue = new FarmOsInMemoryRtxStructuringQueue(input.queue_state);
    this.receiptFactory = input.receipt_factory ??
      (() => randomBytes(32).toString("base64url"));
    this.featureEnabled = input.feature_enabled === true;
  }
  private readonly receiptFactory: () => string;
  private readonly featureEnabled: boolean;

  queueSnapshot(): FarmOsRtxQueueState {
    return this.queue.snapshot();
  }

  async execute(
    input: FarmOsRtxBridgeRepositoryInput,
  ): Promise<FarmOsRtxBridgeRepositoryResult> {
    if (!this.featureEnabled) {
      return { result: "unavailable", safety: safety() };
    }
    const nonceKey = `${input.worker_id}\n${input.nonce}`;
    if (this.nonces.has(nonceKey)) {
      return { result: "replay_rejected", safety: safety() };
    }
    this.nonces.add(nonceKey);
    if (input.operation === "claim") {
      const claimed = this.queue.claim({
        authenticated_worker_id: input.worker_id,
        now: input.received_at,
        maximum_jobs: 1,
      });
      const job = claimed.jobs[0];
      if (!job) return { result: "no_jobs", safety: safety() };
      const current = this.queue.snapshot().events.filter((event) =>
        event.job_id === job.job_id
      ).at(-1);
      if (!current?.lease_expires_at) {
        return { result: "rejected", safety: safety() };
      }
      const receipt = this.receiptFactory();
      this.leases.set(job.job_id, {
        job_id: job.job_id,
        worker_id: input.worker_id,
        receipt_hash: digest(receipt),
        expires_at: current.lease_expires_at,
        extension_count: 0,
        result_hash: null,
        result_kind: null,
      });
      return {
        result: "leased",
        job,
        lease_receipt: receipt,
        lease_expires_at: current.lease_expires_at,
        safety: safety(),
      };
    }
    const request = input.request as Exclude<
      FarmOsRtxBridgeRequest,
      { maximum_jobs: 1 }
    >;
    const lease = this.leases.get(request.job_id);
    const receiptValid = lease !== undefined &&
      lease.worker_id === input.worker_id &&
      lease.receipt_hash === digest(request.lease_receipt) &&
      Date.parse(input.received_at) < Date.parse(lease.expires_at);
    if (!lease || !receiptValid) {
      return {
        result: "rejected",
        failure_code: "LEASE_INVALID",
        safety: safety(),
      };
    }
    if (input.operation === "heartbeat") {
      if (lease.extension_count >= FARM_OS_RTX_BRIDGE_MAXIMUM_EXTENSIONS) {
        return {
          result: "rejected",
          failure_code: "HEARTBEAT_LIMIT_EXCEEDED",
          safety: safety(),
        };
      }
      const expiresAt = new Date(
        Math.max(Date.parse(input.received_at), Date.parse(lease.expires_at)) +
          FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS * 1000,
      ).toISOString();
      const extended = this.queue.extendLease({
        authenticated_worker_id: input.worker_id,
        job_id: request.job_id,
        now: input.received_at,
        lease_expires_at: expiresAt,
      });
      if (extended.status !== "lease_extended") {
        return { result: "rejected", safety: safety() };
      }
      lease.expires_at = expiresAt;
      lease.extension_count += 1;
      return {
        result: "lease_extended",
        lease_expires_at: expiresAt,
        safety: safety(),
      };
    }
    const resultHash = computeFarmOsRtxBridgeResultHash(
      input.operation,
      input.request,
    );
    const kind = input.operation === "submit_candidate"
      ? "candidate"
      : "failure";
    if (lease.result_hash !== null) {
      return lease.result_hash === resultHash && lease.result_kind === kind
        ? { result: "idempotent_replay", safety: safety() }
        : { result: "conflict", safety: safety() };
    }
    if (input.operation === "submit_candidate") {
      const candidateRequest = input.request as Extract<
        FarmOsRtxBridgeRequest,
        { candidate: unknown }
      >;
      if (candidateRequest.candidate.job_id !== candidateRequest.job_id) {
        return {
          result: "rejected",
          failure_code: "CANDIDATE_JOB_MISMATCH",
          safety: safety(),
        };
      }
      const saved = this.queue.saveCandidate({
        authenticated_worker_id: input.worker_id,
        value: candidateRequest.candidate,
        now: input.received_at,
      });
      if (saved.status !== "candidate_saved") {
        lease.result_hash = resultHash;
        lease.result_kind = kind;
        return {
          result: "rejected",
          failure_code: "CANDIDATE_REJECTED",
          safety: safety(),
        };
      }
      lease.result_hash = resultHash;
      lease.result_kind = kind;
      return { result: "accepted", safety: safety() };
    }
    const failureRequest = input.request as Extract<
      FarmOsRtxBridgeRequest,
      { failure_code: string }
    >;
    const failed = this.queue.reportFailure({
      authenticated_worker_id: input.worker_id,
      job_id: failureRequest.job_id,
      now: input.received_at,
      failure_code: failureRequest.failure_code,
      retryable: failureRequest.retryable,
    });
    if (failed.status !== "failure_recorded") {
      return { result: "rejected", safety: safety() };
    }
    lease.result_hash = resultHash;
    lease.result_kind = kind;
    return { result: "failure_recorded", safety: safety() };
  }
}
