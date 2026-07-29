import {
  FarmOsRtxBridgeWorkerClient,
  loadFarmOsRtxBridgeWorkerClientConfig,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_client";
import {
  FarmOsRtxBridgeWorkerRuntime,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_runtime";
import {
  loadFarmOsRtxWorkerConfig,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";

async function main(): Promise<void> {
  const bridgeConfig = loadFarmOsRtxBridgeWorkerClientConfig(process.env);
  const modelConfig = loadFarmOsRtxWorkerConfig(process.env);
  const client = new FarmOsRtxBridgeWorkerClient(bridgeConfig);
  const runtime = new FarmOsRtxBridgeWorkerRuntime({
    client,
    modelConfig,
    onEvent: (event) => process.stdout.write(`${event}\n`),
  });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  process.stdout.write("RTX_BRIDGE_WORKER_STARTED\n");
  try {
    await runtime.run(controller.signal);
  } finally {
    process.stdout.write("RTX_BRIDGE_WORKER_STOPPED\n");
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

main().catch((error: unknown) => {
  const code = error instanceof Error &&
      /^[A-Z][A-Z0-9_]{2,63}$/u.test(error.message)
    ? error.message
    : "RTX_BRIDGE_WORKER_FAILED";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
