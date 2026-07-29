import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { TextDecoder } from "node:util";

import {
  FARM_OS_RTX_BRIDGE_HEADER_NAMES,
} from "./farm_os_rtx_worker_bridge_auth";
import {
  FARM_OS_RTX_BRIDGE_NETWORK_POLICY,
  FARM_OS_RTX_BRIDGE_REQUEST_LIMITS,
  FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS,
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  farmOsRtxBridgeOperationForPath,
  farmOsRtxWorkerBridgeEnabled,
  type FarmOsRtxBridgeOperation,
} from "./farm_os_rtx_worker_bridge_contract";
import type {
  FarmOsRtxBridgeServiceResponse,
  FarmOsRtxWorkerBridgeRepository,
} from "./farm_os_rtx_worker_bridge_service";
import {
  FarmOsRtxWorkerBridgeService,
} from "./farm_os_rtx_worker_bridge_service";

export const FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS = 15_000 as const;
export const FARM_OS_RTX_BRIDGE_REPOSITORY_DEADLINE_MS = 12_000 as const;
export const FARM_OS_RTX_BRIDGE_PRIVATE_SERVE_DRY_RUN = [
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
  "serve",
  "--bg",
  "--https=8443",
  "http://127.0.0.1:18746",
] as const;

type TransportSource = "tailscale_private" | "loopback_private_proxy";
type AdapterResponse = {
  status: number;
  headers: { "content-type": "application/json" };
  body: string;
};

const decoder = new TextDecoder("utf-8", { fatal: true });
const allowedHeaderNames = new Set<string>(FARM_OS_RTX_BRIDGE_HEADER_NAMES);

function unavailable(): FarmOsRtxBridgeServiceResponse {
  return {
    http_status: 503,
    body: {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      result: "unavailable",
    },
  };
}
function invalidRequest(status: 400 | 401 | 413 = 400): AdapterResponse {
  const result = status === 401
    ? "unauthorized"
    : status === 413
    ? "payload_too_large"
    : "invalid_request";
  return serialize({
    http_status: status,
    body: {
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      result,
    },
  }, "ordinary");
}
function serialize(
  response: FarmOsRtxBridgeServiceResponse,
  responseClass: "claim" | "ordinary",
): AdapterResponse {
  const body = JSON.stringify(response.body);
  const maximum = responseClass === "claim"
    ? FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.claim
    : FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS.ordinary;
  if (Buffer.byteLength(body, "utf8") > maximum) {
    const fallback = JSON.stringify(unavailable().body);
    return {
      status: 503,
      headers: { "content-type": "application/json" },
      body: fallback,
    };
  }
  return {
    status: response.http_status,
    headers: { "content-type": "application/json" },
    body,
  };
}

export function normalizeFarmOsRtxBridgeHeaders(
  rawHeaders: readonly string[],
): Readonly<Record<string, string | undefined>> | null {
  if (rawHeaders.length % 2 !== 0) return null;
  const normalized: Record<string, string> = {};
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index]?.toLowerCase();
    const value = rawHeaders[index + 1];
    if (!name || value === undefined || !allowedHeaderNames.has(name)) continue;
    if (Object.hasOwn(normalized, name)) return null;
    normalized[name] = value;
  }
  return normalized;
}

export function readFarmOsRtxBridgeStartupEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
):
  | { enabled: false; hmac_key: null }
  | { enabled: true; hmac_key: string }
  | null {
  const enabled = farmOsRtxWorkerBridgeEnabled(environment);
  const key = environment.FARMOS_RTX_BRIDGE_HMAC_KEY;
  if (!enabled) return { enabled: false, hmac_key: null };
  if (typeof key !== "string" || key.length < 32) return null;
  return { enabled: true, hmac_key: key };
}

export class FarmOsRtxWorkerBridgeHttpAdapter {
  private readonly service: FarmOsRtxWorkerBridgeService;
  private readonly startup:
    | { enabled: false; hmac_key: null }
    | { enabled: true; hmac_key: string }
    | null;
  constructor(private readonly dependencies: {
    repository: FarmOsRtxWorkerBridgeRepository;
    environment: Readonly<Record<string, string | undefined>>;
    clock?: () => Date;
    transport_source: TransportSource;
  }) {
    this.startup = readFarmOsRtxBridgeStartupEnvironment(
      dependencies.environment,
    );
    this.service = new FarmOsRtxWorkerBridgeService({
      repository: dependencies.repository,
      hmac_key: this.startup?.enabled
        ? this.startup.hmac_key
        : "disabled-bridge-key-not-used-000000",
      environment: dependencies.environment,
      clock: dependencies.clock,
    });
  }

  startupReady(): boolean {
    return this.startup !== null;
  }

  async handle(input: {
    method: string;
    path: string;
    raw_headers: readonly string[];
    raw_body: string;
  }): Promise<AdapterResponse> {
    if (this.startup?.enabled === false) {
      return serialize(unavailable(), "ordinary");
    }
    if (this.startup === null) {
      return serialize(unavailable(), "ordinary");
    }
    if (
      this.dependencies.transport_source !== "tailscale_private" &&
      this.dependencies.transport_source !== "loopback_private_proxy"
    ) return invalidRequest(401);
    const operation = farmOsRtxBridgeOperationForPath(
      input.method,
      input.path,
    );
    if (operation === null) return invalidRequest();
    if (
      Buffer.byteLength(input.raw_body, "utf8") >
        FARM_OS_RTX_BRIDGE_REQUEST_LIMITS[operation]
    ) return invalidRequest(413);
    const headers = normalizeFarmOsRtxBridgeHeaders(input.raw_headers);
    if (headers === null) return invalidRequest(401);
    const controller = new AbortController();
    const repositoryDeadline = setTimeout(
      () => controller.abort(),
      FARM_OS_RTX_BRIDGE_REPOSITORY_DEADLINE_MS,
    );
    let responseDeadline: ReturnType<typeof setTimeout> | undefined;
    const responseTimeout = new Promise<FarmOsRtxBridgeServiceResponse>(
      (resolve) => {
        responseDeadline = setTimeout(
          () => resolve(unavailable()),
          FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS,
        );
      },
    );
    const serviceResponse = this.service.handle({
      method: input.method,
      path: input.path,
      headers,
      raw_body: input.raw_body,
      abort_signal: controller.signal,
      transport_context: {
        source: this.dependencies.transport_source,
        public_request: false,
        ordinary_lan_request: false,
        tls_or_private_overlay_verified: true,
      },
    });
    let response: FarmOsRtxBridgeServiceResponse;
    try {
      response = await Promise.race([serviceResponse, responseTimeout]);
    } finally {
      clearTimeout(repositoryDeadline);
      if (responseDeadline !== undefined) clearTimeout(responseDeadline);
    }
    return serialize(
      response,
      operation === "claim" ? "claim" : "ordinary",
    );
  }

}

type BodyReadResult =
  | { status: "ok"; body: string }
  | { status: "too_large" | "invalid_utf8"; body: null };

async function readBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<BodyReadResult> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const value of request) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    total += chunk.length;
    if (total > maximumBytes) {
      request.resume();
      return { status: "too_large", body: null };
    }
    chunks.push(chunk);
  }
  try {
    return {
      status: "ok",
      body: decoder.decode(Buffer.concat(chunks, total)),
    };
  } catch {
    return { status: "invalid_utf8", body: null };
  }
}

function writeResponse(
  response: ServerResponse,
  value: AdapterResponse,
): void {
  response.statusCode = value.status;
  response.setHeader("content-type", value.headers["content-type"]);
  response.setHeader("cache-control", "no-store");
  response.end(value.body);
}

export function createFarmOsRtxWorkerBridgeLoopbackServer(input: {
  adapter: FarmOsRtxWorkerBridgeHttpAdapter;
}): Server {
  return createServer(async (request, response) => {
    try {
      if (request.socket.localAddress !== "127.0.0.1") {
        writeResponse(response, invalidRequest(401));
        return;
      }
      if (!input.adapter.startupReady()) {
        writeResponse(response, serialize(unavailable(), "ordinary"));
        return;
      }
      const method = request.method ?? "";
      const path = request.url ?? "";
      const operation = farmOsRtxBridgeOperationForPath(method, path);
      if (operation === null) {
        writeResponse(response, invalidRequest());
        return;
      }
      const body = await readBody(
        request,
        FARM_OS_RTX_BRIDGE_REQUEST_LIMITS[operation],
      );
      if (body.status !== "ok") {
        writeResponse(response,
          invalidRequest(body.status === "too_large" ? 413 : 400));
        return;
      }
      writeResponse(response, await input.adapter.handle({
        method,
        path,
        raw_headers: request.rawHeaders,
        raw_body: body.body,
      }));
    } catch {
      writeResponse(response, serialize(unavailable(), "ordinary"));
    }
  });
}

export async function listenFarmOsRtxWorkerBridgeLoopback(input: {
  adapter: FarmOsRtxWorkerBridgeHttpAdapter;
}): Promise<Server> {
  if (!input.adapter.startupReady()) {
    throw new Error("RTX_BRIDGE_STARTUP_UNAVAILABLE");
  }
  const server = createFarmOsRtxWorkerBridgeLoopbackServer(input);
  server.requestTimeout = FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS;
  server.headersTimeout = FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1;
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(
      FARM_OS_RTX_BRIDGE_NETWORK_POLICY.listener_port,
      FARM_OS_RTX_BRIDGE_NETWORK_POLICY.listener_host,
    );
  });
  return server;
}

export function farmOsRtxBridgeRequestLimitForPath(
  method: string,
  path: string,
): number | null {
  const operation: FarmOsRtxBridgeOperation | null =
    farmOsRtxBridgeOperationForPath(method, path);
  return operation === null ? null : FARM_OS_RTX_BRIDGE_REQUEST_LIMITS[operation];
}
