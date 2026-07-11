import {
  assertHermesWorkerId,
  type HermesWorkerAdvertisement,
} from "./hermes_worker_protocol";

export const HERMES_WORKER_REGISTRY_PREFIX = "farmos:hermes";
export const HERMES_WORKER_REGISTRY_KEY = "farmos:hermes:workers";
export const HERMES_WORKER_REGISTRY_TTL_SECONDS = 90;

export type HermesWorkerRegistryKeys = {
  prefix: string;
  workers: string;
  worker: (workerId: string) => string;
  claim: (jobId: string) => string;
};

export type HermesWorkerRegistryRecord = {
  schema_version: "hermes.worker.registry.v1";
  worker: HermesWorkerAdvertisement;
  registry: {
    registered: true;
    heartbeat_count: number;
    last_registered_at: string;
    last_updated_at: string;
  };
  safety: {
    redis_write_performed: boolean;
    db_write_performed: false;
    worker_execution_performed: false;
    model_execution_performed: false;
    fail_closed: true;
  };
};

export type HermesWorkerStatusSummary = Pick<
  HermesWorkerAdvertisement,
  | "schema_version"
  | "worker_id"
  | "worker_type"
  | "capabilities"
  | "health"
  | "readiness"
  | "runtime_available"
  | "draining"
  | "registered_at"
  | "last_heartbeat_at"
  | "heartbeat_interval_ms"
  | "heartbeat_timeout_ms"
  | "safety"
>;

export type HermesWorkerRegistrySummary = HermesWorkerStatusSummary & {
  registry_schema_version: "hermes.worker.registry.v1";
  heartbeat_count: number;
  last_registered_at: string;
  last_updated_at: string;
};

export function createHermesWorkerRegistryKeys(
  prefix = HERMES_WORKER_REGISTRY_PREFIX,
): HermesWorkerRegistryKeys {
  if (!/^[0-9a-z:-]+$/iu.test(prefix)) throw new Error("worker_registry_prefix_invalid");
  return {
    prefix,
    workers: `${prefix}:workers`,
    worker: (workerId) => {
      assertHermesWorkerId(workerId);
      return `${prefix}:worker:${workerId}`;
    },
    claim: (jobId) => {
      if (!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(jobId)) {
        throw new Error("worker_claim_job_id_invalid");
      }
      return `${prefix}:claim:${jobId}`;
    },
  };
}

export function createHermesWorkerStatusSummary(
  worker: HermesWorkerAdvertisement,
): HermesWorkerStatusSummary {
  return { ...worker };
}

export function createHermesWorkerRegistrySummary(
  record: HermesWorkerRegistryRecord,
): HermesWorkerRegistrySummary {
  return {
    ...createHermesWorkerStatusSummary(record.worker),
    registry_schema_version: record.schema_version,
    heartbeat_count: record.registry.heartbeat_count,
    last_registered_at: record.registry.last_registered_at,
    last_updated_at: record.registry.last_updated_at,
  };
}
