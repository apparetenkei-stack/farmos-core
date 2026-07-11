import {
  HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  HERMES_RTX_DEFAULT_CAPABILITIES,
  createHermesWorkerAdvertisement,
} from "./worker_runtime/hermes_worker_protocol";

const nowIso = new Date().toISOString();
const workers = [
  createHermesWorkerAdvertisement({
    workerId: "mac-mini-preview",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso,
  }),
  createHermesWorkerAdvertisement({
    workerId: "rtx-preview",
    workerType: "rtx",
    capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
    health: "unknown",
    runtimeAvailable: false,
    draining: false,
    nowIso,
  }),
];

console.log(JSON.stringify({
  preview: "hermes_worker_protocol",
  workers,
  persistent_registry_write_performed: false,
  worker_execution_performed: false,
  model_execution_performed: false,
  db_write_performed: false,
}, null, 2));
