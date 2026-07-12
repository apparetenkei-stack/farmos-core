import { readHermesRedisClientConfig } from "./queue_runtime/hermes_redis_client";
import { executeHermesApprovedWake } from "./wake_runtime/hermes_wake_execution_gateway";
import { createHermesWakeExecutionStore } from "./wake_runtime/hermes_wake_execution_store";
import { createHermesUdpWakeSignalSender } from "./wake_runtime/hermes_wake_sender";
import { getHermesWakeEnvironmentPresence } from "./wake_runtime/hermes_wake_target_resolver";

const CONFIRMATION = "--confirm-wake-send=SEND_ONE_WAKE_PACKET";

async function main() {
  const env = { ...process.env };
  const presence = getHermesWakeEnvironmentPresence(env);
  const portValid = env.HERMES_RTX_WAKE_PORT !== undefined && Number.isInteger(Number(env.HERMES_RTX_WAKE_PORT)) &&
    Number(env.HERMES_RTX_WAKE_PORT) >= 1 && Number(env.HERMES_RTX_WAKE_PORT) <= 65535;
  const configuration = {
    wake_feature_enabled: env.HERMES_RTX_WAKE_ENABLED === "true",
    target_configured: presence.worker_id_present,
    mac_configured: presence.mac_present,
    broadcast_configured: presence.broadcast_present,
    port_configured: presence.port_present && portValid,
  };
  if (!process.argv.includes(CONFIRMATION)) {
    console.log(JSON.stringify({ ...configuration, real_wake_signal_test: "blocked_explicit_confirmation_missing", wake_signal_sent: false }, null, 2));
    return;
  }
  const wakeRequestArg = process.argv.find((value) => value.startsWith("--wake-request-id="));
  const wakeRequestId = wakeRequestArg?.slice("--wake-request-id=".length);
  if (!Object.values(configuration).every(Boolean) || !wakeRequestId) {
    console.log(JSON.stringify({ ...configuration, real_wake_signal_test: "blocked_configuration_missing", wake_signal_sent: false }, null, 2));
    return;
  }
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) env.HERMES_REDIS_URL = `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  env.HERMES_REDIS_QUEUE_ENABLED = "true";
  const config = readHermesRedisClientConfig(env).config;
  if (!config) {
    console.log(JSON.stringify({ ...configuration, real_wake_signal_test: "blocked_configuration_missing", wake_signal_sent: false }, null, 2));
    return;
  }
  const result = await executeHermesApprovedWake({
    wakeRequestId,
    context: { enabled: true, storeFactory: () => createHermesWakeExecutionStore(config) },
    sender: createHermesUdpWakeSignalSender(),
    env,
  });
  if (!result.ok || result.status !== "sent") throw new Error(result.ok ? "wake_signal_failed" : result.error_code);
  console.log(JSON.stringify({ ...configuration, real_wake_signal_test: "sent", wake_signal_sent: true,
    bytes_sent: result.execution.bytes_sent, packet_count: 1 }, null, 2));
}

main().catch(() => {
  console.error("real_wake_signal_test_failed");
  process.exitCode = 1;
});
