import { createClient, type RedisClientType } from "redis";

import type { HermesRedisClientConfig } from "../queue_runtime/hermes_redis_client";
import {
  assertHermesWorkerId,
  applyHermesWorkerHeartbeat,
  createHermesWorkerJobClaim,
  evaluateHermesWorkerAt,
  type HermesWorkerAdvertisement,
  type HermesWorkerCapability,
  type HermesWorkerHealth,
  type HermesWorkerJobClaim,
} from "./hermes_worker_protocol";
import type { HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";
import {
  HERMES_WORKER_REGISTRY_TTL_SECONDS,
  createHermesWorkerRegistryKeys,
  createHermesWorkerRegistrySummary,
  type HermesWorkerRegistryRecord,
  type HermesWorkerRegistryKeys,
  type HermesWorkerRegistrySummary,
} from "./hermes_worker_registry_contract";

export type HermesWorkerRegistryStore = {
  get: (key: string) => Promise<string | null>;
  setWithTtl: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  setExistingWithTtl: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Promise<boolean>;
  setIfAbsentWithTtl: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Promise<boolean>;
  claimJobAtomic: (input: {
    workerKey: string;
    claimKey: string;
    expectedWorkerId: string;
    jobId: string;
    serializedClaim: string;
    claimTtlSeconds: number;
    workerRecordTtlSeconds: number;
    claimedAt: string;
  }) => Promise<{
    status:
      | "claimed"
      | "claim_conflict"
      | "worker_missing"
      | "worker_capacity_full"
      | "worker_not_ready"
      | "worker_record_invalid";
    serializedWorkerRecord: string | null;
  }>;
  addToSet: (key: string, value: string) => Promise<void>;
  getSetMembers: (key: string) => Promise<string[]>;
  removeFromSet: (key: string, value: string) => Promise<void>;
  deleteKeys: (keys: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
};

type RegistryContext = {
  enabled: boolean;
  storeFactory: () => Promise<HermesWorkerRegistryStore>;
  keys?: HermesWorkerRegistryKeys;
  nowIsoFactory?: () => string;
};

type RegistryFailure = {
  ok: false;
  status: "disabled" | "not_ready" | "failed";
  error_code: string;
  registry_write_performed: false;
  fail_closed: true;
};

export type HermesWorkerRegisterResult =
  | {
      ok: true;
      status: "registered" | "re_registered";
      worker: HermesWorkerRegistrySummary;
      registry_write_performed: true;
    }
  | RegistryFailure;

export type HermesWorkerHeartbeatResult =
  | {
      ok: true;
      status: "heartbeat_recorded";
      worker: HermesWorkerRegistrySummary;
      registry_write_performed: true;
    }
  | RegistryFailure;

export type HermesWorkerStatusResult =
  | { ok: true; status: "found"; worker: HermesWorkerRegistrySummary }
  | { ok: true; status: "not_found"; worker: null }
  | (RegistryFailure & { worker: null });

export type HermesWorkerListResult =
  | { ok: true; status: "listed"; workers: HermesWorkerRegistrySummary[] }
  | (RegistryFailure & { workers: [] });

export type HermesWorkerClaimStoreResult =
  | {
      ok: true;
      status: "claimed";
      claim: HermesWorkerJobClaim;
      worker: HermesWorkerRegistrySummary;
      claim_ttl_seconds: number;
      registry_write_performed: true;
    }
  | (RegistryFailure & { claim: null });

function failure(
  status: RegistryFailure["status"],
  errorCode: string,
): RegistryFailure {
  return {
    ok: false,
    status,
    error_code: errorCode,
    registry_write_performed: false,
    fail_closed: true,
  };
}

function nowIso(context: RegistryContext): string {
  return (context.nowIsoFactory ?? (() => new Date().toISOString()))();
}

function parseRegistryRecord(serialized: string): HermesWorkerRegistryRecord {
  const record = JSON.parse(serialized) as HermesWorkerRegistryRecord;
  const worker = record?.worker;
  if (
    record?.schema_version !== "hermes.worker.registry.v1" ||
    worker?.schema_version !== "hermes.worker.v1" ||
    (worker.worker_type !== "mac_mini" && worker.worker_type !== "rtx") ||
    !Array.isArray(worker.capabilities) ||
    worker.safety?.secret_stored !== false ||
    worker.safety?.credentials_stored !== false ||
    worker.safety?.fail_closed !== true ||
    record.registry?.registered !== true ||
    !Number.isInteger(record.registry?.heartbeat_count) ||
    record.registry.heartbeat_count < 0 ||
    record.safety?.fail_closed !== true
  ) {
    throw new Error("worker_registry_record_invalid");
  }
  assertHermesWorkerId(worker.worker_id);
  return record;
}

function capabilitiesEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function useStore<T>(
  context: RegistryContext,
  operation: (
    store: HermesWorkerRegistryStore,
    keys: HermesWorkerRegistryKeys,
  ) => Promise<T>,
): Promise<T> {
  const store = await context.storeFactory();
  try {
    return await operation(
      store,
      context.keys ?? createHermesWorkerRegistryKeys(),
    );
  } finally {
    await store.disconnect().catch(() => undefined);
  }
}

export async function registerHermesWorker(
  worker: HermesWorkerAdvertisement,
  context: RegistryContext,
): Promise<HermesWorkerRegisterResult> {
  if (!context.enabled) return failure("disabled", "worker_registry_disabled");
  assertHermesWorkerId(worker.worker_id);
  const now = nowIso(context);
  try {
    return await useStore(context, async (store, keys) => {
      const key = keys.worker(worker.worker_id);
      const existing = await store.get(key);
      const existingRecord = existing === null ? null : parseRegistryRecord(existing);
      if (existingRecord && existingRecord.worker.worker_type !== worker.worker_type) {
        return failure("failed", "worker_type_change_not_allowed");
      }
      if (existingRecord && !capabilitiesEqual(
        existingRecord.worker.capabilities,
        worker.capabilities,
      )) {
        return failure("failed", "worker_capability_change_not_allowed");
      }
      const registered = existingRecord === null
        ? worker
        : { ...worker, registered_at: existingRecord.worker.registered_at };
      const record: HermesWorkerRegistryRecord = {
        schema_version: "hermes.worker.registry.v1",
        worker: registered,
        registry: {
          registered: true,
          heartbeat_count: existingRecord?.registry.heartbeat_count ?? 0,
          last_registered_at: now,
          last_updated_at: now,
        },
        safety: {
          redis_write_performed: true,
          db_write_performed: false,
          worker_execution_performed: false,
          model_execution_performed: false,
          fail_closed: true,
        },
      };
      await store.setWithTtl(
        key,
        JSON.stringify(record),
        HERMES_WORKER_REGISTRY_TTL_SECONDS,
      );
      await store.addToSet(keys.workers, worker.worker_id);
      return {
        ok: true,
        status: existing === null ? "registered" : "re_registered",
        worker: createHermesWorkerRegistrySummary(record),
        registry_write_performed: true,
      };
    });
  } catch {
    return failure("not_ready", "worker_registry_unavailable");
  }
}

export async function heartbeatHermesWorker(
  workerId: string,
  heartbeat: {
    health: HermesWorkerHealth;
    runtimeAvailable: boolean;
    draining: boolean;
  },
  context: RegistryContext,
): Promise<HermesWorkerHeartbeatResult> {
  if (!context.enabled) return failure("disabled", "worker_registry_disabled");
  assertHermesWorkerId(workerId);
  try {
    return await useStore(context, async (store, keys) => {
      const key = keys.worker(workerId);
      const serialized = await store.get(key);
      if (serialized === null) return failure("failed", "worker_not_registered");
      const record = parseRegistryRecord(serialized);
      const updated = applyHermesWorkerHeartbeat(record.worker, {
        ...heartbeat,
        nowIso: nowIso(context),
      });
      const updatedRecord: HermesWorkerRegistryRecord = {
        ...record,
        worker: updated,
        registry: {
          ...record.registry,
          heartbeat_count: record.registry.heartbeat_count + 1,
          last_updated_at: updated.last_heartbeat_at,
        },
        safety: { ...record.safety, redis_write_performed: true },
      };
      const written = await store.setExistingWithTtl(
        key,
        JSON.stringify(updatedRecord),
        HERMES_WORKER_REGISTRY_TTL_SECONDS,
      );
      if (!written) return failure("failed", "worker_not_registered");
      return {
        ok: true,
        status: "heartbeat_recorded",
        worker: createHermesWorkerRegistrySummary(updatedRecord),
        registry_write_performed: true,
      };
    });
  } catch {
    return failure("not_ready", "worker_registry_unavailable");
  }
}

export async function getHermesWorkerStatus(
  workerId: string,
  context: RegistryContext,
): Promise<HermesWorkerStatusResult> {
  if (!context.enabled) {
    return { ...failure("disabled", "worker_registry_disabled"), worker: null };
  }
  assertHermesWorkerId(workerId);
  try {
    return await useStore(context, async (store, keys) => {
      const serialized = await store.get(keys.worker(workerId));
      if (serialized === null) return { ok: true, status: "not_found", worker: null };
      const record = parseRegistryRecord(serialized);
      const worker = evaluateHermesWorkerAt(record.worker, nowIso(context));
      return {
        ok: true,
        status: "found",
        worker: createHermesWorkerRegistrySummary({ ...record, worker }),
      };
    });
  } catch {
    return {
      ...failure("not_ready", "worker_registry_unavailable"),
      worker: null,
    };
  }
}

export async function listHermesWorkers(
  context: RegistryContext,
): Promise<HermesWorkerListResult> {
  if (!context.enabled) {
    return { ...failure("disabled", "worker_registry_disabled"), workers: [] };
  }
  try {
    return await useStore(context, async (store, keys) => {
      const members = await store.getSetMembers(keys.workers);
      const workers: HermesWorkerRegistrySummary[] = [];
      for (const workerId of members) {
        const serialized = await store.get(keys.worker(workerId));
        if (serialized === null) {
          await store.removeFromSet(keys.workers, workerId);
          continue;
        }
        const record = parseRegistryRecord(serialized);
        workers.push(createHermesWorkerRegistrySummary({
          ...record,
          worker: evaluateHermesWorkerAt(record.worker, nowIso(context)),
        }));
      }
      return { ok: true, status: "listed", workers };
    });
  } catch {
    return {
      ...failure("not_ready", "worker_registry_unavailable"),
      workers: [],
    };
  }
}

export async function claimHermesJobForWorker(input: {
  worker: HermesWorkerAdvertisement;
  job: HermesQueuedJobRecord;
  requiredCapability: HermesWorkerCapability;
  claimIdFactory?: () => string;
  context: RegistryContext;
}): Promise<HermesWorkerClaimStoreResult> {
  if (!input.context.enabled) {
    return { ...failure("disabled", "worker_registry_disabled"), claim: null };
  }
  const now = nowIso(input.context);
  assertHermesWorkerId(input.worker.worker_id);
  const remainingMs = Date.parse(input.job.job.runtime.expires_at) - Date.parse(now);
  const ttlSeconds = Math.ceil(remainingMs / 1000);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return { ...failure("failed", "worker_claim_record_missing"), claim: null };
  }
  try {
    return await useStore(input.context, async (store, keys) => {
      const existingClaim = await store.get(
        keys.claim(input.job.job.runtime.job_id),
      );
      if (existingClaim !== null) {
        return { ...failure("failed", "worker_claim_conflict"), claim: null };
      }
      const workerRecord = await store.get(keys.worker(input.worker.worker_id));
      if (workerRecord === null) {
        return { ...failure("failed", "worker_claim_record_missing"), claim: null };
      }
      let claim: HermesWorkerJobClaim;
      try {
        claim = createHermesWorkerJobClaim({
          worker: parseRegistryRecord(workerRecord).worker,
          job: input.job,
          requiredCapability: input.requiredCapability,
          nowIso: now,
          claimIdFactory: input.claimIdFactory,
        });
      } catch (error) {
        const errorCode = error instanceof Error &&
          error.message === "worker_capacity_full"
          ? "worker_capacity_full"
          : error instanceof Error && error.message === "worker_not_ready"
            ? "worker_not_ready"
            : "worker_claim_record_missing";
        return { ...failure("failed", errorCode), claim: null };
      }
      const atomic = await store.claimJobAtomic({
        workerKey: keys.worker(input.worker.worker_id),
        claimKey: keys.claim(claim.job_id),
        expectedWorkerId: input.worker.worker_id,
        jobId: claim.job_id,
        serializedClaim: JSON.stringify(claim),
        claimTtlSeconds: ttlSeconds,
        workerRecordTtlSeconds: HERMES_WORKER_REGISTRY_TTL_SECONDS,
        claimedAt: claim.claimed_at,
      });
      if (atomic.status !== "claimed" || atomic.serializedWorkerRecord === null) {
        const errorCode = atomic.status === "claim_conflict"
          ? "worker_claim_conflict"
          : atomic.status === "worker_capacity_full"
            ? "worker_capacity_full"
            : atomic.status === "worker_not_ready"
              ? "worker_not_ready"
              : "worker_claim_record_missing";
        return { ...failure("failed", errorCode), claim: null };
      }
      const updatedWorker = parseRegistryRecord(atomic.serializedWorkerRecord);
      return {
        ok: true,
        status: "claimed",
        claim,
        worker: createHermesWorkerRegistrySummary(updatedWorker),
        claim_ttl_seconds: ttlSeconds,
        registry_write_performed: true,
      };
    });
  } catch {
    return {
      ...failure("not_ready", "worker_claim_registry_unavailable"),
      claim: null,
    };
  }
}

const ATOMIC_WORKER_CLAIM_SCRIPT = `
local worker_json = redis.call('GET', KEYS[1])
if not worker_json then
  return {'worker_missing', ''}
end
if redis.call('EXISTS', KEYS[2]) == 1 then
  return {'claim_conflict', ''}
end
local decode_ok, record = pcall(cjson.decode, worker_json)
if not decode_ok or record['schema_version'] ~= 'hermes.worker.registry.v1' or
   not record['worker'] or record['worker']['worker_id'] ~= ARGV[1] or
   not record['registry'] then
  return {'worker_record_invalid', ''}
end
local worker = record['worker']
if worker['readiness'] ~= 'ready' or worker['runtime_available'] ~= true or
   worker['draining'] ~= false or worker['health'] == 'unhealthy' then
  return {'worker_not_ready', ''}
end
local active = tonumber(worker['active_job_count'])
local maximum = tonumber(worker['max_concurrency'])
if not active or not maximum or active < 0 or maximum < 1 then
  return {'worker_record_invalid', ''}
end
if active >= maximum then
  return {'worker_capacity_full', ''}
end
worker['current_job_id'] = ARGV[2]
worker['active_job_count'] = active + 1
record['registry']['last_updated_at'] = ARGV[6]
record['safety']['redis_write_performed'] = true
local updated_json = cjson.encode(record)
redis.call('SET', KEYS[2], ARGV[3], 'NX', 'EX', ARGV[4])
redis.call('SET', KEYS[1], updated_json, 'EX', ARGV[5])
return {'claimed', updated_json}
`;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("worker_registry_command_timeout")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function createHermesWorkerRegistryStore(
  config: HermesRedisClientConfig,
): Promise<HermesWorkerRegistryStore> {
  const client: RedisClientType = createClient({
    url: config.url,
    socket: { connectTimeout: config.connectTimeoutMs },
  });
  client.on("error", () => undefined);
  await withTimeout(client.connect(), config.connectTimeoutMs);
  const command = <T>(operation: Promise<T>) =>
    withTimeout(operation, config.commandTimeoutMs);

  return {
    async get(key) {
      return command(client.get(key));
    },
    async setWithTtl(key, value, ttlSeconds) {
      await command(client.set(key, value, { EX: ttlSeconds }));
    },
    async setExistingWithTtl(key, value, ttlSeconds) {
      const result = await command(client.set(key, value, {
        XX: true,
        EX: ttlSeconds,
      }));
      return result === "OK";
    },
    async setIfAbsentWithTtl(key, value, ttlSeconds) {
      const result = await command(client.set(key, value, {
        NX: true,
        EX: ttlSeconds,
      }));
      return result === "OK";
    },
    async claimJobAtomic(input) {
      const result = await command(client.eval(ATOMIC_WORKER_CLAIM_SCRIPT, {
        keys: [input.workerKey, input.claimKey],
        arguments: [
          input.expectedWorkerId,
          input.jobId,
          input.serializedClaim,
          String(input.claimTtlSeconds),
          String(input.workerRecordTtlSeconds),
          input.claimedAt,
        ],
      })) as unknown[];
      const status = String(result[0]) as
        | "claimed"
        | "claim_conflict"
        | "worker_missing"
        | "worker_capacity_full"
        | "worker_not_ready"
        | "worker_record_invalid";
      return {
        status,
        serializedWorkerRecord:
          status === "claimed" ? String(result[1]) : null,
      };
    },
    async addToSet(key, value) {
      await command(client.sAdd(key, value));
    },
    async getSetMembers(key) {
      return command(client.sMembers(key));
    },
    async removeFromSet(key, value) {
      await command(client.sRem(key, value));
    },
    async deleteKeys(keys) {
      if (keys.length > 0) await command(client.del(keys));
    },
    async disconnect() {
      if (client.isOpen) await client.quit();
    },
  };
}
