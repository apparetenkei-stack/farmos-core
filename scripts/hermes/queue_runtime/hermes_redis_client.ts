import { createClient, type RedisClientType } from "redis";

export type HermesRedisQueueStore = {
  enqueueAtomic: (input: {
    dedupeKey: string;
    jobKey: string;
    pendingKey: string;
    jobId: string;
    serializedRecord: string;
    ttlSeconds: number;
  }) => Promise<"enqueued" | "duplicate">;
  movePendingToProcessing: (
    pendingKey: string,
    processingKey: string,
  ) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  setWithTtl: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  setKeepingTtl: (key: string, value: string) => Promise<boolean>;
  removeFromList: (key: string, value: string) => Promise<void>;
  pushToList: (key: string, value: string) => Promise<void>;
  deleteKeys: (keys: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
};

export type HermesRedisClientConfig = {
  url: string;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
};

const ATOMIC_ENQUEUE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 0
end
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
redis.call('LPUSH', KEYS[3], ARGV[2])
redis.call('SET', KEYS[1], '1', 'EX', ARGV[3])
return 1
`;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("redis_command_timeout")),
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

export async function createHermesRedisQueueStore(
  config: HermesRedisClientConfig,
): Promise<HermesRedisQueueStore> {
  const client: RedisClientType = createClient({
    url: config.url,
    socket: { connectTimeout: config.connectTimeoutMs },
  });
  client.on("error", () => undefined);
  await withTimeout(client.connect(), config.connectTimeoutMs);

  const command = <T>(operation: Promise<T>) =>
    withTimeout(operation, config.commandTimeoutMs);

  return {
    async enqueueAtomic(input) {
      const result = await command(client.eval(ATOMIC_ENQUEUE_SCRIPT, {
        keys: [input.dedupeKey, input.jobKey, input.pendingKey],
        arguments: [
          input.serializedRecord,
          input.jobId,
          String(input.ttlSeconds),
        ],
      }));
      return Number(result) === 1 ? "enqueued" : "duplicate";
    },
    async movePendingToProcessing(pendingKey, processingKey) {
      return command(client.lMove(pendingKey, processingKey, "RIGHT", "LEFT"));
    },
    async get(key) {
      return command(client.get(key));
    },
    async setWithTtl(key, value, ttlSeconds) {
      await command(client.set(key, value, { EX: ttlSeconds }));
    },
    async setKeepingTtl(key, value) {
      const result = await command(client.set(key, value, {
        XX: true,
        KEEPTTL: true,
      }));
      return result === "OK";
    },
    async removeFromList(key, value) {
      await command(client.lRem(key, 0, value));
    },
    async pushToList(key, value) {
      await command(client.lPush(key, value));
    },
    async deleteKeys(keys) {
      if (keys.length > 0) await command(client.del(keys));
    },
    async disconnect() {
      if (client.isOpen) await client.quit();
    },
  };
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readHermesRedisClientConfig(
  env: Record<string, string | undefined> = process.env,
): { enabled: boolean; config: HermesRedisClientConfig | null } {
  const enabled = env.HERMES_REDIS_QUEUE_ENABLED === "true";
  if (!enabled || !env.HERMES_REDIS_URL) return { enabled, config: null };
  return {
    enabled,
    config: {
      url: env.HERMES_REDIS_URL,
      connectTimeoutMs: readPositiveInteger(
        env.HERMES_REDIS_CONNECT_TIMEOUT_MS,
        2000,
      ),
      commandTimeoutMs: readPositiveInteger(
        env.HERMES_REDIS_COMMAND_TIMEOUT_MS,
        2000,
      ),
    },
  };
}
