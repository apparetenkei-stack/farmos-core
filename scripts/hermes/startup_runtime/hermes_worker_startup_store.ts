import { createClient, type RedisClientType } from "redis";
import type { HermesRedisClientConfig } from "../queue_runtime/hermes_redis_client";
import type { HermesRoutingDecisionSummary, HermesRoutingRequirement, HermesRoutingWorkerSummary } from "../router_runtime/hermes_model_router_contract";
import { assertHermesWorkerId } from "../worker_runtime/hermes_worker_protocol";
import { type HermesWorkerStartupKeys, type HermesWorkerWakeRequest, type HermesWorkerWakeRequestResult,
  type HermesWorkerWakeStatusResult } from "./hermes_worker_startup_contract";
import { createHermesWorkerStartupRequirement, createHermesWorkerWakeRequest,
  createHermesWorkerWakeRequestSummary, evaluateHermesWorkerStartupEligibility } from "./hermes_worker_startup_policy";

export type HermesWakeAtomicStatus = "requested" | "already_requested" | "startup_request_duplicate" |
  "startup_cooldown_active" | "startup_record_invalid" | "atomic_transition_failed";
export type HermesWakeAtomicResult = { status: HermesWakeAtomicStatus; serializedWakeRequest: string | null };
export type HermesWorkerStartupStore = {
  get: (key: string) => Promise<string | null>;
  getPttl: (key: string) => Promise<number>;
  persistWakeRequestAtomic: (input: { requestKey: string; activeKey: string; cooldownKey: string;
    decisionKey: string; serializedWakeRequest: string; wakeRequestId: string;
    requestExpiresAtMs: number; cooldownUntilMs: number }) => Promise<HermesWakeAtomicResult>;
  deleteKeys: (keys: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
};
export type HermesWorkerStartupContext = { enabled: boolean; storeFactory: () => Promise<HermesWorkerStartupStore>; keys?: HermesWorkerStartupKeys; nowIsoFactory?: () => string };

function safe(value: string, code: string): string {
  if (!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(value)) throw new Error(code); return value;
}
export function createHermesWorkerStartupKeys(prefix = "farmos:hermes"): HermesWorkerStartupKeys {
  if (!/^[0-9a-z:-]+$/iu.test(prefix)) throw new Error("startup_prefix_invalid");
  return { prefix,
    request: (id) => `${prefix}:wake-request:${safe(id, "wake_request_id_invalid")}`,
    active: (target) => `${prefix}:wake-active:rtx:${safe(target, "wake_target_invalid")}`,
    cooldown: (target) => `${prefix}:wake-cooldown:rtx:${safe(target, "wake_target_invalid")}`,
    decision: (id) => `${prefix}:wake-decision:${safe(id, "routing_decision_id_invalid")}` };
}

function failure(errorCode: string): HermesWorkerWakeRequestResult {
  return { ok: false, status: errorCode === "startup_disabled" ? "disabled" : errorCode === "startup_store_unavailable" ? "not_ready" : "failed",
    error_code: errorCode, startup_write_performed: false, fail_closed: true };
}

export function parseHermesWorkerWakeRequest(value: string): HermesWorkerWakeRequest | null {
  try {
    const r = JSON.parse(value) as HermesWorkerWakeRequest;
    const requested = Date.parse(r?.requested_at); const expires = Date.parse(r?.expires_at); const cooldown = Date.parse(r?.cooldown_until);
    if (r?.schema_version !== "hermes.worker.wake.request.v1" || !/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(r.wake_request_id) ||
      r.worker_type !== "rtx" || (r.target_worker_id !== null && (() => { try { assertHermesWorkerId(r.target_worker_id!); return false; } catch { return true; } })()) ||
      !/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(r.routing_decision_id) || !(["heavy_reasoning", "large_context", "gpu_inference"] as unknown[]).includes(r.required_capability) ||
      !(["required_worker_offline", "required_worker_not_ready", "required_worker_runtime_unavailable", "required_worker_missing"] as unknown[]).includes(r.reason_code) ||
      !Number.isFinite(requested) || new Date(requested).toISOString() !== r.requested_at || expires - requested !== 300000 || cooldown - requested !== 600000 ||
      !(["requested", "acknowledged", "expired", "cancelled"] as unknown[]).includes(r.status) || r.requested_by !== "server_policy" || r.safety?.wol_packet_sent !== false ||
      r.safety.ssh_connection_performed !== false || r.safety.gpu_detection_performed !== false || r.safety.worker_execution_performed !== false ||
      r.safety.model_execution_performed !== false || r.safety.secret_stored !== false || r.safety.db_write_performed !== false || r.safety.fail_closed !== true) return null;
    return r;
  } catch { return null; }
}

async function useStore<T>(context: HermesWorkerStartupContext, operation: (store: HermesWorkerStartupStore, keys: HermesWorkerStartupKeys) => Promise<T>): Promise<T> {
  const store = await context.storeFactory(); try { return await operation(store, context.keys ?? createHermesWorkerStartupKeys()); }
  finally { await store.disconnect().catch(() => undefined); }
}

export async function requestHermesWorkerWake(input: { routingRequirement: HermesRoutingRequirement; routingDecision: HermesRoutingDecisionSummary;
  workers: HermesRoutingWorkerSummary[]; context: HermesWorkerStartupContext; wakeRequestIdFactory?: () => string }): Promise<HermesWorkerWakeRequestResult> {
  if (!input.context.enabled) return failure("startup_disabled");
  const nowIso = (input.context.nowIsoFactory ?? (() => new Date().toISOString()))();
  const eligibility = evaluateHermesWorkerStartupEligibility({ routingRequirement: input.routingRequirement,
    routingDecision: input.routingDecision, workers: input.workers, nowIso });
  if (!eligibility.eligible) return failure(eligibility.reason_code);
  try {
    const requirement = createHermesWorkerStartupRequirement({ routingRequirement: input.routingRequirement,
      routingDecision: input.routingDecision, eligibility });
    const request = createHermesWorkerWakeRequest({ requirement, targetWorkerId: eligibility.target_worker_id,
      nowIso, wakeRequestIdFactory: input.wakeRequestIdFactory });
    return await useStore(input.context, async (store, keys) => {
      const target = request.target_worker_id ?? "missing";
      const atomic = await store.persistWakeRequestAtomic({ requestKey: keys.request(request.wake_request_id),
        activeKey: keys.active(target), cooldownKey: keys.cooldown(target), decisionKey: keys.decision(request.routing_decision_id),
        serializedWakeRequest: JSON.stringify(request), wakeRequestId: request.wake_request_id,
        requestExpiresAtMs: Date.parse(request.expires_at), cooldownUntilMs: Date.parse(request.cooldown_until) });
      if (atomic.status !== "requested" && atomic.status !== "already_requested") return failure(atomic.status);
      if (atomic.serializedWakeRequest === null) return failure("startup_record_invalid");
      const canonical = parseHermesWorkerWakeRequest(atomic.serializedWakeRequest);
      if (!canonical || canonical.routing_decision_id !== request.routing_decision_id || canonical.required_capability !== request.required_capability ||
        canonical.target_worker_id !== request.target_worker_id) return failure("startup_record_invalid");
      return { ok: true, status: atomic.status, wake_request: canonical, startup_write_performed: true };
    });
  } catch { return failure("startup_store_unavailable"); }
}

export async function getHermesWorkerWakeRequestStatus(wakeRequestId: string, context: HermesWorkerStartupContext): Promise<HermesWorkerWakeStatusResult> {
  if (!context.enabled) return failure("startup_disabled");
  try { return await useStore(context, async (store, keys) => {
    const serialized = await store.get(keys.request(wakeRequestId)); if (serialized === null) return { ok: true, status: "not_found", wake_request: null };
    const request = parseHermesWorkerWakeRequest(serialized); if (!request) return failure("startup_record_invalid");
    return { ok: true, status: "found", wake_request: createHermesWorkerWakeRequestSummary(request) };
  }); } catch { return failure("startup_store_unavailable"); }
}

const ATOMIC_WAKE_REQUEST = `
local existing = redis.call('GET', KEYS[4])
if existing then
  local eok, saved = pcall(cjson.decode, existing)
  local nok, requested = pcall(cjson.decode, ARGV[1])
  if not eok or not nok or saved['schema_version'] ~= 'hermes.worker.wake.request.v1' or saved['routing_decision_id'] ~= requested['routing_decision_id'] or saved['required_capability'] ~= requested['required_capability'] or saved['target_worker_id'] ~= requested['target_worker_id'] then return {'startup_record_invalid', ''} end
  return {'already_requested', existing}
end
if redis.call('EXISTS', KEYS[2]) == 1 then return {'startup_request_duplicate', ''} end
if redis.call('EXISTS', KEYS[3]) == 1 then return {'startup_cooldown_active', ''} end
if tonumber(ARGV[3]) >= tonumber(ARGV[4]) or tonumber(ARGV[3]) <= 0 then return {'startup_record_invalid', ''} end
redis.call('SET', KEYS[1], ARGV[1], 'PXAT', ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'PXAT', ARGV[3])
redis.call('SET', KEYS[3], '1', 'PXAT', ARGV[4])
redis.call('SET', KEYS[4], ARGV[1], 'PXAT', ARGV[3])
return {'requested', ARGV[1]}
`;
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> { return new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("startup_store_timeout")), timeoutMs);
  promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); }); }); }

export async function createHermesWorkerStartupStore(config: HermesRedisClientConfig): Promise<HermesWorkerStartupStore> {
  const client: RedisClientType = createClient({ url: config.url, socket: { connectTimeout: config.connectTimeoutMs } });
  client.on("error", () => undefined); await withTimeout(client.connect(), config.connectTimeoutMs);
  const command = <T>(p: Promise<T>) => withTimeout(p, config.commandTimeoutMs);
  return { get: (key) => command(client.get(key)), getPttl: (key) => command(client.pTTL(key)),
    async persistWakeRequestAtomic(input) {
      const result = await command(client.eval(ATOMIC_WAKE_REQUEST, { keys: [input.requestKey, input.activeKey, input.cooldownKey, input.decisionKey],
        arguments: [input.serializedWakeRequest, input.wakeRequestId, String(input.requestExpiresAtMs), String(input.cooldownUntilMs)] })) as unknown[];
      return { status: String(result[0]) as HermesWakeAtomicStatus, serializedWakeRequest: String(result[1] ?? "") || null };
    },
    async deleteKeys(keys) { if (keys.length > 0) await command(client.del(keys)); },
    async disconnect() { if (client.isOpen) await client.quit(); } };
}
