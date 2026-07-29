import { randomBytes } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, win32 } from "node:path";

import { signFarmOsRtxBridgeRequest } from "./farm_os_rtx_worker_bridge_auth";
import {
  FARM_OS_RTX_BRIDGE_PATHS,
  FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS,
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  FARM_OS_RTX_WORKER_ID,
  type FarmOsRtxBridgeCandidateRequest,
  type FarmOsRtxBridgeFailureRequest,
  type FarmOsRtxBridgeHeartbeatRequest,
  type FarmOsRtxBridgeOperation,
  type FarmOsRtxBridgeRequest,
} from "./farm_os_rtx_worker_bridge_contract";
import {
  parseFarmOsRtxStructuringJob,
  type FarmOsRtxStructuringJob,
} from "./farm_os_rtx_structuring_contract";

export const FARM_OS_RTX_BRIDGE_CLIENT_ENV = {
  url: "FARMOS_RTX_BRIDGE_URL",
  hmacKeyFile: "FARMOS_RTX_BRIDGE_HMAC_KEY_FILE",
  workerId: "FARMOS_RTX_WORKER_ID",
  pollIntervalMs: "FARMOS_RTX_WORKER_POLL_INTERVAL_MS",
  requestTimeoutMs: "FARMOS_RTX_REQUEST_TIMEOUT_MS",
} as const;
export const FARM_OS_RTX_BRIDGE_DEFAULT_POLL_INTERVAL_MS = 5_000;
export const FARM_OS_RTX_BRIDGE_DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const FARM_OS_RTX_BRIDGE_MAXIMUM_BACKOFF_MS = 60_000;

export type FarmOsRtxBridgeWorkerClientConfig = {
  bridgeUrl: string;
  hmacKeyFile: string;
  workerId: typeof FARM_OS_RTX_WORKER_ID;
  pollIntervalMs: number;
  requestTimeoutMs: number;
};

export type FarmOsRtxBridgeLease = {
  job: FarmOsRtxStructuringJob;
  leaseReceipt: string;
  leaseExpiresAt: string;
  workerId: typeof FARM_OS_RTX_WORKER_ID;
};

export type FarmOsRtxBridgeClaimResult =
  | { result: "no_jobs" }
  | { result: "leased"; lease: FarmOsRtxBridgeLease };

export type FarmOsRtxBridgeClientErrorCode =
  | "BRIDGE_CONFIG_INVALID"
  | "BRIDGE_SECRET_FILE_INVALID"
  | "BRIDGE_UNREACHABLE"
  | "BRIDGE_UNAUTHORIZED"
  | "BRIDGE_FORBIDDEN"
  | "BRIDGE_RESPONSE_TOO_LARGE"
  | "BRIDGE_RESPONSE_INVALID"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_OPERATION_REJECTED";

export class FarmOsRtxBridgeClientError extends Error {
  readonly code: FarmOsRtxBridgeClientErrorCode;
  readonly retryable: boolean;

  constructor(code: FarmOsRtxBridgeClientErrorCode, retryable = false) {
    super(code);
    this.name = "FarmOsRtxBridgeClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;
type ClientDependencies = {
  fetchImpl?: FetchLike;
  now?: () => Date;
  nonceFactory?: () => string;
};

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function integerSetting(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/u.test(value)) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  return parsed;
}

function validateBridgeUrl(value: string | undefined): string {
  if (!value) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.port !== "8443" ||
    !parsed.hostname.endsWith(".ts.net") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  return parsed.origin;
}

export function loadFarmOsRtxBridgeWorkerClientConfig(
  environment: Readonly<Record<string, string | undefined>>,
): FarmOsRtxBridgeWorkerClientConfig {
  const hmacKeyFile = environment[FARM_OS_RTX_BRIDGE_CLIENT_ENV.hmacKeyFile];
  const workerId = environment[FARM_OS_RTX_BRIDGE_CLIENT_ENV.workerId];
  if (
    !hmacKeyFile ||
    !(isAbsolute(hmacKeyFile) || win32.isAbsolute(hmacKeyFile)) ||
    workerId !== FARM_OS_RTX_WORKER_ID
  ) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_CONFIG_INVALID");
  }
  return {
    bridgeUrl: validateBridgeUrl(
      environment[FARM_OS_RTX_BRIDGE_CLIENT_ENV.url],
    ),
    hmacKeyFile,
    workerId: FARM_OS_RTX_WORKER_ID,
    pollIntervalMs: integerSetting(
      environment[FARM_OS_RTX_BRIDGE_CLIENT_ENV.pollIntervalMs],
      FARM_OS_RTX_BRIDGE_DEFAULT_POLL_INTERVAL_MS,
      1_000,
      300_000,
    ),
    requestTimeoutMs: integerSetting(
      environment[FARM_OS_RTX_BRIDGE_CLIENT_ENV.requestTimeoutMs],
      FARM_OS_RTX_BRIDGE_DEFAULT_REQUEST_TIMEOUT_MS,
      1_000,
      120_000,
    ),
  };
}

export function loadFarmOsRtxBridgeHmacKey(filePath: string): string {
  try {
    const metadata = lstatSync(filePath);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size < 32 ||
      metadata.size > 4_096
    ) {
      throw new Error("unsafe");
    }
    const raw = readFileSync(filePath, "utf8");
    const value = raw.replace(/\r?\n$/u, "");
    if (
      value.length < 32 ||
      value.length > 512 ||
      value.includes("\n") ||
      value.includes("\r") ||
      value.trim() !== value
    ) {
      throw new Error("invalid");
    }
    return value;
  } catch {
    throw new FarmOsRtxBridgeClientError("BRIDGE_SECRET_FILE_INVALID");
  }
}

function parseIsoOffset(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u
      .test(value) ||
    !Number.isFinite(Date.parse(value))
  ) return null;
  return value;
}

async function boundedJson(
  response: Response,
  maximumBytes: number,
): Promise<unknown> {
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > maximumBytes) {
    throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_TOO_LARGE");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
  }
}

export class FarmOsRtxBridgeWorkerClient {
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;
  private readonly nonceFactory: () => string;
  private readonly hmacKey: string;

  constructor(
    readonly config: FarmOsRtxBridgeWorkerClientConfig,
    dependencies: ClientDependencies = {},
  ) {
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
    this.now = dependencies.now ?? (() => new Date());
    this.nonceFactory = dependencies.nonceFactory ??
      (() => randomBytes(24).toString("base64url"));
    this.hmacKey = loadFarmOsRtxBridgeHmacKey(config.hmacKeyFile);
  }

  private async post(
    operation: FarmOsRtxBridgeOperation,
    request: FarmOsRtxBridgeRequest,
  ): Promise<{ status: number; value: unknown }> {
    const path = FARM_OS_RTX_BRIDGE_PATHS[operation];
    const rawBody = JSON.stringify(request);
    const timestamp = String(Math.floor(this.now().getTime() / 1_000));
    const headers = signFarmOsRtxBridgeRequest({
      hmac_key: this.hmacKey,
      method: "POST",
      path,
      worker_id: this.config.workerId,
      timestamp,
      nonce: this.nonceFactory(),
      raw_body: rawBody,
    });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    try {
      const response = await this.fetchImpl(`${this.config.bridgeUrl}${path}`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: rawBody,
        signal: controller.signal,
      });
      if (response.status === 401) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_UNAUTHORIZED");
      }
      if (response.status === 403) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_FORBIDDEN");
      }
      const maximum = operation === "claim"
        ? FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.claim
        : FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.ordinary;
      const value = await boundedJson(response, maximum);
      if (response.status >= 500) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_UNREACHABLE", true);
      }
      return { status: response.status, value };
    } catch (error) {
      if (error instanceof FarmOsRtxBridgeClientError) throw error;
      if (controller.signal.aborted) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_REQUEST_TIMEOUT", true);
      }
      throw new FarmOsRtxBridgeClientError("BRIDGE_UNREACHABLE", true);
    } finally {
      clearTimeout(timeout);
    }
  }

  async claim(): Promise<FarmOsRtxBridgeClaimResult> {
    const response = await this.post("claim", {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      worker_capabilities: { night_two_pass: true },
      maximum_jobs: 1,
    });
    if (!record(response.value) ||
      response.value.contract_version !== FARM_OS_RTX_WORKER_BRIDGE_CONTRACT) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    if (
      response.status === 200 &&
      response.value.result === "no_jobs" &&
      exact(response.value, ["contract_version", "result"])
    ) return { result: "no_jobs" };
    if (
      response.status !== 200 ||
      response.value.result !== "leased" ||
      !exact(response.value, [
        "contract_version",
        "result",
        "job",
        "lease_receipt",
        "lease_expires_at",
      ]) ||
      typeof response.value.lease_receipt !== "string" ||
      !/^[A-Za-z0-9_-]{32,128}$/u.test(response.value.lease_receipt)
    ) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    const parsedJob = parseFarmOsRtxStructuringJob(response.value.job);
    const leaseExpiresAt = parseIsoOffset(response.value.lease_expires_at);
    if (!parsedJob.valid || leaseExpiresAt === null) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    return {
      result: "leased",
      lease: {
        job: parsedJob.value,
        leaseReceipt: response.value.lease_receipt,
        leaseExpiresAt,
        workerId: this.config.workerId,
      },
    };
  }

  async heartbeat(
    lease: FarmOsRtxBridgeLease,
  ): Promise<FarmOsRtxBridgeLease> {
    const request: FarmOsRtxBridgeHeartbeatRequest = {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      job_id: lease.job.job_id,
      lease_receipt: lease.leaseReceipt,
    };
    const response = await this.post("heartbeat", request);
    if (
      response.status !== 200 ||
      !record(response.value) ||
      !exact(response.value, [
        "contract_version",
        "result",
        "lease_expires_at",
      ]) ||
      response.value.contract_version !== FARM_OS_RTX_WORKER_BRIDGE_CONTRACT ||
      response.value.result !== "lease_extended"
    ) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    const expiry = parseIsoOffset(response.value.lease_expires_at);
    if (expiry === null || Date.parse(expiry) <= Date.parse(lease.leaseExpiresAt)) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    return { ...lease, leaseExpiresAt: expiry };
  }

  async submitCandidate(
    lease: FarmOsRtxBridgeLease,
    candidate: FarmOsRtxBridgeCandidateRequest["candidate"],
    workerMetrics: FarmOsRtxBridgeCandidateRequest["worker_metrics"],
  ): Promise<"accepted" | "idempotent_replay"> {
    const response = await this.post("submit_candidate", {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      job_id: lease.job.job_id,
      lease_receipt: lease.leaseReceipt,
      candidate,
      worker_metrics: workerMetrics,
    });
    return this.acceptedResult(
      response,
      ["accepted", "idempotent_replay"] as const,
    );
  }

  async submitFailure(
    lease: FarmOsRtxBridgeLease,
    failureCode: FarmOsRtxBridgeFailureRequest["failure_code"],
    retryable: boolean,
    safeMetrics: FarmOsRtxBridgeFailureRequest["safe_metrics"],
  ): Promise<"failure_recorded" | "idempotent_replay"> {
    const response = await this.post("submit_failure", {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      job_id: lease.job.job_id,
      lease_receipt: lease.leaseReceipt,
      failure_code: failureCode,
      retryable,
      safe_metrics: safeMetrics,
    });
    return this.acceptedResult(
      response,
      ["failure_recorded", "idempotent_replay"] as const,
    );
  }

  private acceptedResult<T extends string>(
    response: { status: number; value: unknown },
    allowed: readonly T[],
  ): T {
    if (
      response.status !== 200 ||
      !record(response.value) ||
      !exact(response.value, ["contract_version", "result"]) ||
      response.value.contract_version !== FARM_OS_RTX_WORKER_BRIDGE_CONTRACT ||
      typeof response.value.result !== "string" ||
      !allowed.includes(response.value.result as T)
    ) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    return response.value.result as T;
  }
}
