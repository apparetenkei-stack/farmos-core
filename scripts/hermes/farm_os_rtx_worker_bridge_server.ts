import type { Server } from "node:http";

import {
  FarmOsRtxWorkerBridgeHttpAdapter,
  listenFarmOsRtxWorkerBridgeLoopback,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_http_adapter";
import {
  FarmOsRtxWorkerBridgePostgresRepository,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_postgres_repository";

const LOCAL_POSTGRES_HOST = "127.0.0.1";
const LOCAL_POSTGRES_PORT = 5432;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("RTX_BRIDGE_RUNTIME_CONFIGURATION_UNAVAILABLE");
  }
  return value;
}

function validateRuntimeEnvironment(): {
  database: string;
  user: string;
  password: string;
  hmacKey: string;
} {
  if (process.env.FARMOS_RTX_WORKER_BRIDGE_ENABLED !== "true") {
    throw new Error("RTX_BRIDGE_RUNTIME_CONFIGURATION_UNAVAILABLE");
  }
  const configuredHost = process.env.PGHOST ?? LOCAL_POSTGRES_HOST;
  const configuredPort = Number(process.env.PGPORT ?? LOCAL_POSTGRES_PORT);
  if (
    configuredHost !== LOCAL_POSTGRES_HOST ||
    configuredPort !== LOCAL_POSTGRES_PORT
  ) {
    throw new Error("RTX_BRIDGE_RUNTIME_DATABASE_NOT_LOCAL");
  }
  return {
    database: requiredEnvironment("POSTGRES_DB"),
    user: requiredEnvironment("POSTGRES_USER"),
    password: requiredEnvironment("POSTGRES_PASSWORD"),
    hmacKey: requiredEnvironment("FARMOS_RTX_BRIDGE_HMAC_KEY"),
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function main(): Promise<void> {
  const runtime = validateRuntimeEnvironment();
  const repository = new FarmOsRtxWorkerBridgePostgresRepository({
    poolConfig: {
      host: LOCAL_POSTGRES_HOST,
      port: LOCAL_POSTGRES_PORT,
      database: runtime.database,
      user: runtime.user,
      password: runtime.password,
      ssl: false,
      max: 2,
      connectionTimeoutMillis: 2_000,
    },
    feature_enabled: true,
  });
  const adapter = new FarmOsRtxWorkerBridgeHttpAdapter({
    repository,
    environment: {
      FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true",
      FARMOS_RTX_BRIDGE_HMAC_KEY: runtime.hmacKey,
    },
    transport_source: "loopback_private_proxy",
  });

  let server: Server | null = null;
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    try {
      if (server !== null) await closeServer(server);
    } finally {
      await repository.close();
    }
  };

  try {
    server = await listenFarmOsRtxWorkerBridgeLoopback({ adapter });
    process.stdout.write(JSON.stringify({
      event: "rtx_worker_bridge_started",
      listener: "127.0.0.1:18746",
      fixture_only: true,
    }) + "\n");
  } catch {
    await repository.close();
    throw new Error("RTX_BRIDGE_RUNTIME_START_FAILED");
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
  }
}

main().catch(() => {
  process.stderr.write("RTX_BRIDGE_RUNTIME_UNAVAILABLE\n");
  process.exitCode = 1;
});
