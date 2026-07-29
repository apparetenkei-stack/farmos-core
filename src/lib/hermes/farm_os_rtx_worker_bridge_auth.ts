import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  FARM_OS_RTX_BRIDGE_TIMESTAMP_TOLERANCE_SECONDS,
  FARM_OS_RTX_WORKER_ID,
  farmOsRtxBridgeOperationForPath,
  type FarmOsRtxBridgeOperation,
} from "./farm_os_rtx_worker_bridge_contract";

export const FARM_OS_RTX_BRIDGE_HEADER_NAMES = [
  "x-farmos-worker-id",
  "x-farmos-timestamp",
  "x-farmos-nonce",
  "x-farmos-content-sha256",
  "x-farmos-signature",
] as const;

export type FarmOsRtxBridgeAuthResult =
  | {
    authenticated: true;
    worker_id: typeof FARM_OS_RTX_WORKER_ID;
    operation: FarmOsRtxBridgeOperation;
    nonce: string;
    body_sha256: string;
  }
  | {
    authenticated: false;
    failure_code:
      | "AUTH_HEADER_INVALID"
      | "AUTH_WORKER_REJECTED"
      | "AUTH_TIMESTAMP_REJECTED"
      | "AUTH_BODY_HASH_MISMATCH"
      | "AUTH_SIGNATURE_REJECTED"
      | "AUTH_OPERATION_REJECTED";
  };

const HEX_64 = /^[0-9a-f]{64}$/u;
const NONCE = /^[A-Za-z0-9_-]{16,96}$/u;
const TIMESTAMP = /^\d{10}$/u;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(input: {
  method: string;
  path: string;
  worker_id: string;
  timestamp: string;
  nonce: string;
  body_sha256: string;
}): string {
  return [
    input.method,
    input.path,
    input.worker_id,
    input.timestamp,
    input.nonce,
    input.body_sha256,
  ].join("\n");
}

export function signFarmOsRtxBridgeRequest(input: {
  hmac_key: string;
  method: string;
  path: string;
  worker_id: string;
  timestamp: string;
  nonce: string;
  raw_body: string;
}): Record<typeof FARM_OS_RTX_BRIDGE_HEADER_NAMES[number], string> {
  const bodyHash = sha256(input.raw_body);
  const signature = createHmac("sha256", input.hmac_key)
    .update(canonical({ ...input, body_sha256: bodyHash }), "utf8")
    .digest("hex");
  return {
    "x-farmos-worker-id": input.worker_id,
    "x-farmos-timestamp": input.timestamp,
    "x-farmos-nonce": input.nonce,
    "x-farmos-content-sha256": bodyHash,
    "x-farmos-signature": signature,
  };
}

export function authenticateFarmOsRtxBridgeRequest(input: {
  hmac_key: string;
  method: string;
  path: string;
  headers: Readonly<Record<string, string | undefined>>;
  raw_body: string;
  now_epoch_seconds: number;
}): FarmOsRtxBridgeAuthResult {
  const operation = farmOsRtxBridgeOperationForPath(input.method, input.path);
  if (operation === null) {
    return { authenticated: false, failure_code: "AUTH_OPERATION_REJECTED" };
  }
  const workerId = input.headers["x-farmos-worker-id"];
  const timestamp = input.headers["x-farmos-timestamp"];
  const nonce = input.headers["x-farmos-nonce"];
  const bodyHash = input.headers["x-farmos-content-sha256"];
  const signature = input.headers["x-farmos-signature"];
  if (
    typeof workerId !== "string" ||
    typeof timestamp !== "string" ||
    typeof nonce !== "string" ||
    typeof bodyHash !== "string" ||
    typeof signature !== "string" ||
    !TIMESTAMP.test(timestamp) ||
    !NONCE.test(nonce) ||
    !HEX_64.test(bodyHash) ||
    !HEX_64.test(signature) ||
    input.hmac_key.length < 32
  ) return { authenticated: false, failure_code: "AUTH_HEADER_INVALID" };
  if (workerId !== FARM_OS_RTX_WORKER_ID) {
    return { authenticated: false, failure_code: "AUTH_WORKER_REJECTED" };
  }
  const timestampNumber = Number(timestamp);
  if (
    !Number.isSafeInteger(input.now_epoch_seconds) ||
    Math.abs(input.now_epoch_seconds - timestampNumber) >
      FARM_OS_RTX_BRIDGE_TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return { authenticated: false, failure_code: "AUTH_TIMESTAMP_REJECTED" };
  }
  const calculatedBodyHash = sha256(input.raw_body);
  if (
    !timingSafeEqual(
      Buffer.from(bodyHash, "hex"),
      Buffer.from(calculatedBodyHash, "hex"),
    )
  ) {
    return {
      authenticated: false,
      failure_code: "AUTH_BODY_HASH_MISMATCH",
    };
  }
  const calculatedSignature = createHmac("sha256", input.hmac_key)
    .update(canonical({
      method: input.method,
      path: input.path,
      worker_id: workerId,
      timestamp,
      nonce,
      body_sha256: bodyHash,
    }), "utf8")
    .digest();
  const suppliedSignature = Buffer.from(signature, "hex");
  if (
    calculatedSignature.length !== suppliedSignature.length ||
    !timingSafeEqual(calculatedSignature, suppliedSignature)
  ) {
    return {
      authenticated: false,
      failure_code: "AUTH_SIGNATURE_REJECTED",
    };
  }
  return {
    authenticated: true,
    worker_id: FARM_OS_RTX_WORKER_ID,
    operation,
    nonce,
    body_sha256: bodyHash,
  };
}
