import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  type FarmOsStableChangesPage,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY,
  FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT,
  FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES,
  FarmOsStableChangesHttpConsumer,
  FarmOsStableChangesHttpConsumerError,
  loadFarmOsStableChangesHttpConsumerConfig,
  type FarmOsStableChangesHttpConsumerConfig,
  type FarmOsStableChangesHttpObservation,
} from "../../src/lib/hermes/farm_os_stable_changes_http_consumer";
import {
  createFarmOsStableChangesScopeId,
  FarmOsStableChangesPersistenceError,
  type FarmOsStableChangesCheckpoint,
  type FarmOsStableChangesCommitPageInput,
  type FarmOsStableChangesCommitPageResult,
  type FarmOsStableChangesPersistenceRepository,
  type FarmOsStableChangesScope,
} from "../../src/lib/hermes/farm_os_stable_changes_persistence";
import {
  stableChange,
  stablePage,
} from "./lib/farm_os_stable_changes_consumer_fixture";

const TOKEN = "fixture-only-stable-changes-http-token";
const OBSERVED_AT = "2026-08-08T00:00:00.000001Z";

function environment(baseUrl: string): Record<string, string> {
  return {
    FARMOS_STABLE_CHANGES_HTTP_BASE_URL: baseUrl,
    FARMOS_STABLE_CHANGES_HTTP_BEARER: TOKEN,
    FARMOS_STABLE_CHANGES_CONTRACT_VERSION:
      FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    FARMOS_STABLE_CHANGES_FROM_BUSINESS_DATE: "2026-08-01",
    FARMOS_STABLE_CHANGES_TO_BUSINESS_DATE: "2026-08-07",
    FARMOS_STABLE_CHANGES_PAGE_SIZE: "100",
    FARMOS_STABLE_CHANGES_TIMEOUT_MS: "8000",
    FARMOS_INSTALLATION_ID: "installation_fixture_01",
    FARMOS_AUTHORIZED_FARM_SCOPE: "farm_fixture_01",
    FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
  };
}

function checkpoint(
  scope: FarmOsStableChangesScope,
  input: Partial<FarmOsStableChangesCheckpoint> = {},
): FarmOsStableChangesCheckpoint {
  return {
    stable_changes_scope_id: createFarmOsStableChangesScopeId(scope),
    cursor: null,
    generation: "0",
    last_source_updated_at: null,
    last_change_sequence: null,
    last_successful_page_at: null,
    last_returned_count: null,
    last_accepted_count: null,
    last_duplicate_count: null,
    last_has_more: null,
    last_page_fingerprint: null,
    created_at: OBSERVED_AT,
    updated_at: OBSERVED_AT,
    ...input,
  };
}

class MemoryRepository implements FarmOsStableChangesPersistenceRepository {
  current: FarmOsStableChangesCheckpoint;
  loads = 0;
  commits = 0;
  mode: "normal" | "conflict" | "already_committed" = "normal";
  constructor(readonly scope: FarmOsStableChangesScope) {
    this.current = checkpoint(scope);
  }
  async loadCheckpoint(scope: FarmOsStableChangesScope) {
    assert.deepEqual(scope, this.scope);
    this.loads += 1;
    return this.current;
  }
  async commitPage(
    input: FarmOsStableChangesCommitPageInput,
  ): Promise<FarmOsStableChangesCommitPageResult> {
    this.commits += 1;
    if (this.mode === "conflict") {
      throw new FarmOsStableChangesPersistenceError("CHECKPOINT_CONFLICT");
    }
    assert.equal(input.expectedGeneration, this.current.generation);
    assert.equal(input.requestCursor, this.current.cursor);
    const last = input.validatedPage.changes.at(-1);
    this.current = checkpoint(this.scope, {
      cursor: input.validatedPage.next_cursor,
      generation: String(Number(this.current.generation) + 1),
      last_source_updated_at: last?.source_updated_at ??
        this.current.last_source_updated_at,
      last_change_sequence: last?.change_sequence ?? this.current.last_change_sequence,
      last_successful_page_at: input.observedAt,
      last_returned_count: input.validatedPage.changes.length,
      last_accepted_count: input.validatedPage.changes.length,
      last_duplicate_count: 0,
      last_has_more: input.validatedPage.has_more,
    });
    return {
      result: this.mode === "already_committed" ? "already_committed" : "committed",
      checkpoint: this.current,
    };
  }
}

function writeJson(
  response: ServerResponse,
  status: number,
  value: unknown,
  headers: Record<string, string> = {},
): void {
  const body = typeof value === "string" ? value : JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(body)),
    ...headers,
  });
  response.end(body);
}

async function withServer<T>(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  action: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  try {
    return await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function consumer(input: {
  config: FarmOsStableChangesHttpConsumerConfig;
  repository: MemoryRepository;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  observations?: FarmOsStableChangesHttpObservation[];
  limits?: { max_pages: number; max_changes: number };
}) {
  return new FarmOsStableChangesHttpConsumer({
    config: input.config,
    repository: input.repository,
    fetchImpl: input.fetchImpl,
    sleep: input.sleep,
    observedAt: () => OBSERVED_AT,
    now: () => 1_000,
    onObservation: (value) => input.observations?.push(value),
    limits: input.limits,
  });
}

async function expectCode(
  action: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof FarmOsStableChangesHttpConsumerError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    return true;
  });
}

assert.throws(() => loadFarmOsStableChangesHttpConsumerConfig({}),
  /CONFIGURATION_ERROR/u);
assert.throws(() => loadFarmOsStableChangesHttpConsumerConfig(
  environment("http://example.com"),
), /CONFIGURATION_ERROR/u);
assert.doesNotThrow(() => loadFarmOsStableChangesHttpConsumerConfig(
  environment("https://example.com"),
));
assert.throws(() => loadFarmOsStableChangesHttpConsumerConfig({
  ...environment("http://127.0.0.1:1"),
  FARMOS_STABLE_CHANGES_CONTRACT_VERSION: "wrong",
}), /CONFIGURATION_ERROR/u);
assert.equal(Object.keys(environment("http://127.0.0.1:1"))
  .some((key) => key.startsWith("NEXT_PUBLIC_")), false);
{
  const valid = loadFarmOsStableChangesHttpConsumerConfig(
    environment("http://127.0.0.1:1"),
  );
  assert.throws(() => new FarmOsStableChangesHttpConsumer({
    config: { ...valid, base_url: "http://127.0.0.1:1/unapproved" },
    repository: new MemoryRepository(valid.scope),
  }), /CONFIGURATION_ERROR/u);
  assert.throws(() => new FarmOsStableChangesHttpConsumer({
    config: { ...valid, bearer: `${TOKEN}\nforbidden` },
    repository: new MemoryRepository(valid.scope),
  }), /CONFIGURATION_ERROR/u);
}

const captured: Array<{ url: URL; headers: Headers }> = [];
await withServer((request, response) => {
  captured.push({
    url: new URL(request.url ?? "", "http://loopback"),
    headers: new Headers(request.headers as Record<string, string>),
  });
  const cursor = captured.at(-1)!.url.searchParams.get("cursor");
  writeJson(response, 200, cursor === null
    ? stablePage({
        changes: [stableChange({ change_sequence: "1" })],
        has_more: true,
        next_cursor: "cursor_page_2",
      })
    : stablePage({
        changes: [stableChange({
          change_sequence: "2",
          source_updated_at: "2026-08-01T09:01:00.000001+09:00",
        })],
      }));
}, async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  const repository = new MemoryRepository(config.scope);
  const result = await consumer({
    config,
    repository,
    fetchImpl: async (url, init) => {
      assert.equal(init?.redirect, "manual");
      return fetch(url, init);
    },
  }).run();
  assert.deepEqual({
    result: result.result,
    page_count: result.page_count,
    change_count: result.change_count,
    generation: result.checkpoint_generation,
    has_more: result.has_more,
  }, {
    result: "complete", page_count: 2, change_count: 2,
    generation: "2", has_more: false,
  });
  assert.equal(repository.loads, 2);
  assert.equal(repository.commits, 2);
});
assert.equal(captured.length, 2);
assert.equal(captured[0]!.url.pathname, FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT);
assert.equal(captured[0]!.url.searchParams.has("cursor"), false);
assert.equal(captured[1]!.url.searchParams.get("cursor"), "cursor_page_2");
for (const request of captured) {
  assert.equal(request.headers.get("authorization"), `Bearer ${TOKEN}`);
  assert.equal(request.headers.get("x-farmos-capability"),
    FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY);
  assert.equal(request.headers.get("x-farmos-installation-id"),
    "installation_fixture_01");
  assert.equal(request.headers.get("x-farm-id"), "farm_fixture_01");
  assert.equal(request.url.searchParams.get("contract_version"),
    FARM_OS_STABLE_CHANGES_CONTRACT_ID);
  assert.equal(request.url.searchParams.get("from_business_date"), "2026-08-01");
  assert.equal(request.url.searchParams.get("to_business_date"), "2026-08-07");
  assert.equal(request.url.searchParams.get("limit"), "100");
}

let redirectTargetCalls = 0;
await withServer((_request, response) => {
  redirectTargetCalls += 1;
  writeJson(response, 200, stablePage({
    changes: [stableChange({ change_sequence: "1" })],
  }));
}, async (targetBaseUrl) => {
  let redirectOriginCalls = 0;
  await withServer((_request, response) => {
    redirectOriginCalls += 1;
    response.writeHead(302, { location: targetBaseUrl });
    response.end();
  }, async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    await expectCode(() => consumer({
      config,
      repository: new MemoryRepository(config.scope),
    }).run(), "NON_RETRYABLE_HTTP");
  });
  assert.equal(redirectOriginCalls, 1);
});
assert.equal(redirectTargetCalls, 0);

for (const input of [
  { statuses: [429, 200], retryAfter: "2", expectedDelay: 2_000 },
  { statuses: [503, 200], retryAfter: null, expectedDelay: 250 },
] as const) {
  let calls = 0;
  const cursors: Array<string | null> = [];
  const delays: number[] = [];
  await withServer((request, response) => {
    const url = new URL(request.url ?? "", "http://loopback");
    cursors.push(url.searchParams.get("cursor"));
    const status = input.statuses[Math.min(calls, input.statuses.length - 1)]!;
    calls += 1;
    writeJson(response, status,
      status === 200 ? stablePage({ changes: [stableChange({ change_sequence: "1" })] }) : {},
      input.retryAfter === null ? {} : { "retry-after": input.retryAfter });
  }, async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    const result = await consumer({
      config,
      repository: new MemoryRepository(config.scope),
      sleep: async (value) => { delays.push(value); },
    }).run();
    assert.equal(result.retry_count, 1);
  });
  assert.deepEqual(cursors, [null, null]);
  assert.deepEqual(delays, [input.expectedDelay]);
}

{
  let calls = 0;
  const config = loadFarmOsStableChangesHttpConsumerConfig(
    environment("http://127.0.0.1:1"),
  );
  await expectCode(() => consumer({
    config,
    repository: new MemoryRepository(config.scope),
    fetchImpl: async () => {
      calls += 1;
      throw new Error("fixture-network-secret-must-not-escape");
    },
    sleep: async () => undefined,
  }).run(), "TRANSPORT_UNAVAILABLE");
  assert.equal(calls, 3);
}

{
  let calls = 0;
  const cursors: Array<string | null> = [];
  const delays: number[] = [];
  await withServer((request, response) => {
    calls += 1;
    cursors.push(new URL(request.url ?? "", "http://loopback")
      .searchParams.get("cursor"));
    const body = JSON.stringify(stablePage({
      changes: [stableChange({ change_sequence: "1" })],
    }));
    if (calls === 1) {
      response.writeHead(200, {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
      });
      response.flushHeaders();
      response.write(body.slice(0, Math.floor(body.length / 2)));
      response.destroy();
      return;
    }
    writeJson(response, 200, body);
  }, async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    const result = await consumer({
      config,
      repository: new MemoryRepository(config.scope),
      sleep: async (value) => { delays.push(value); },
    }).run();
    assert.equal(result.result, "complete");
    assert.equal(result.retry_count, 1);
  });
  assert.equal(calls, 2);
  assert.deepEqual(cursors, [null, null]);
  assert.deepEqual(delays, [250]);
}

{
  let cancelled = false;
  let calls = 0;
  const config = loadFarmOsStableChangesHttpConsumerConfig(
    environment("http://127.0.0.1:1"),
  );
  const repository = new MemoryRepository(config.scope);
  await expectCode(() => consumer({
    config,
    repository,
    fetchImpl: async () => {
      calls += 1;
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(Uint8Array.of(0xc3, 0x28));
        },
        cancel() {
          cancelled = true;
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  }).run(), "CONTRACT_INVALID");
  assert.equal(calls, 1);
  assert.equal(cancelled, true);
  assert.equal(repository.commits, 0);
}

for (const declaredLength of [
  "invalid",
  String(FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES + 1),
]) {
  let cancelled = false;
  const config = loadFarmOsStableChangesHttpConsumerConfig(
    environment("http://127.0.0.1:1"),
  );
  const repository = new MemoryRepository(config.scope);
  await expectCode(() => consumer({
    config,
    repository,
    fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": declaredLength,
      },
    }),
  }).run(), "CONTRACT_INVALID");
  assert.equal(cancelled, true);
  assert.equal(repository.commits, 0);
}

{
  let cancelCount = 0;
  let fetchCount = 0;
  const retryDelays: number[] = [];
  const config = loadFarmOsStableChangesHttpConsumerConfig(
    environment("http://127.0.0.1:1"),
  );
  const repository = new MemoryRepository(config.scope);
  await expectCode(() => consumer({
    config,
    repository,
    sleep: async (milliseconds) => { retryDelays.push(milliseconds); },
    fetchImpl: async () => {
      fetchCount += 1;
      const halfLimit = FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES / 2;
      const response = new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(halfLimit));
          controller.enqueue(new Uint8Array(halfLimit));
          controller.enqueue(new Uint8Array(1));
        },
        cancel() {
          cancelCount += 1;
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
      assert.equal(response.headers.has("content-length"), false);
      return response;
    },
  }).run(), "CONTRACT_INVALID");
  assert.equal(fetchCount, 1);
  assert.equal(cancelCount, 1);
  assert.deepEqual(retryDelays, []);
  assert.equal(repository.loads, 1);
  assert.equal(repository.commits, 0);
  assert.equal(repository.current.generation, "0");
}

for (const status of [400, 401, 403, 404]) {
  let calls = 0;
  await withServer((_request, response) => {
    calls += 1;
    writeJson(response, status, { restricted: "body-must-not-escape" });
  }, async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    await expectCode(() => consumer({
      config,
      repository: new MemoryRepository(config.scope),
    }).run(), "NON_RETRYABLE_HTTP");
  });
  assert.equal(calls, 1);
}

for (const invalid of [
  { ...stablePage({ changes: [stableChange({ change_sequence: "1" })] }), extra: true },
  stablePage({ changes: [{
    ...stableChange({ change_sequence: "1" }), source_record_id: 123,
  } as unknown as ReturnType<typeof stableChange>] }),
] as unknown[]) {
  await withServer((_request, response) => writeJson(response, 200, invalid),
    async (baseUrl) => {
      const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
      await expectCode(() => consumer({
        config,
        repository: new MemoryRepository(config.scope),
      }).run(), "CONTRACT_INVALID");
    });
}

await withServer((_request, response) => writeJson(
  response,
  200,
  "x".repeat(FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES + 1),
), async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  await expectCode(() => consumer({
    config,
    repository: new MemoryRepository(config.scope),
  }).run(), "CONTRACT_INVALID");
});

await withServer((_request, response) => {
  setTimeout(() => writeJson(response, 200,
    stablePage({ changes: [stableChange({ change_sequence: "1" })] })), 100);
}, async (baseUrl) => {
  const config = {
    ...loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl)),
    timeout_ms: 50,
  };
  await expectCode(() => consumer({
    config,
    repository: new MemoryRepository(config.scope),
    sleep: async () => undefined,
  }).run(), "TRANSPORT_UNAVAILABLE");
});

await withServer((_request, response) => {
  const body = JSON.stringify(stablePage({
    changes: [stableChange({ change_sequence: "1" })],
  }));
  response.writeHead(200, {
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(body)),
  });
  response.flushHeaders();
  setTimeout(() => response.end(body), 100);
}, async (baseUrl) => {
  const config = {
    ...loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl)),
    timeout_ms: 50,
  };
  await expectCode(() => consumer({
    config,
    repository: new MemoryRepository(config.scope),
    sleep: async () => undefined,
  }).run(), "TRANSPORT_UNAVAILABLE");
});

await withServer((_request, response) => writeJson(response, 200,
  stablePage({ changes: [stableChange({ change_sequence: "1" })] })),
async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  const repository = new MemoryRepository(config.scope);
  repository.mode = "conflict";
  await expectCode(() => consumer({ config, repository }).run(),
    "CHECKPOINT_CONFLICT");
});

for (const mode of ["duplicate_page", "lost_commit"] as const) {
  await withServer((_request, response) => writeJson(response, 200,
    stablePage({ changes: [stableChange({ change_sequence: "1" })] })),
  async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    const repository = new MemoryRepository(config.scope);
    repository.mode = "already_committed";
    const result = await consumer({ config, repository }).run();
    assert.equal(result.result, "complete", mode);
    assert.equal(result.checkpoint_generation, "1", mode);
  });
}

await withServer((request, response) => {
  const cursor = new URL(request.url ?? "", "http://loopback")
    .searchParams.get("cursor");
  writeJson(response, 200, stablePage({
    changes: [stableChange({
      change_sequence: cursor === null ? "1" : "2",
      source_updated_at: cursor === null
        ? "2026-08-01T09:00:00.000001+09:00"
        : "2026-08-01T09:01:00.000001+09:00",
    })],
    has_more: true,
    next_cursor: cursor === null ? "bounded_cursor_1" : "bounded_cursor_2",
  }));
}, async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  const repository = new MemoryRepository(config.scope);
  const result = await consumer({
    config, repository, limits: { max_pages: 1, max_changes: 100 },
  }).run();
  assert.equal(result.result, "partial_bounded_completion");
  assert.equal(result.page_count, 1);
  assert.equal(repository.commits, 1);
});

await withServer((_request, response) => writeJson(response, 200, stablePage({
  changes: [
    stableChange({ change_sequence: "1" }),
    stableChange({
      change_sequence: "2",
      source_record_id: "work_fixture_02",
      source_updated_at: "2026-08-01T09:01:00.000001+09:00",
    }),
  ],
})), async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  const repository = new MemoryRepository(config.scope);
  const result = await consumer({
    config, repository, limits: { max_pages: 10, max_changes: 1 },
  }).run();
  assert.equal(result.result, "partial_bounded_completion");
  assert.equal(result.page_count, 0);
  assert.equal(repository.commits, 0);
});

{
  const observations: FarmOsStableChangesHttpObservation[] = [];
  await withServer((_request, response) => writeJson(response, 200,
    stablePage({ changes: [stableChange({ change_sequence: "1" })] })),
  async (baseUrl) => {
    const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
    const result = await consumer({
      config,
      repository: new MemoryRepository(config.scope),
      observations,
    }).run();
    assert.equal(result.downstream_snapshot_write_performed, false);
    assert.equal(result.candidate_generation_performed, false);
    assert.equal(result.projection_generation_performed, false);
    assert.equal(result.promotion_performed, false);
    assert.equal(result.active_write_performed, false);
    assert.equal(result.app_writeback_performed, false);
  });
  const serialized = JSON.stringify(observations);
  for (const forbidden of [
    TOKEN, "cursor", "source_record_id", "source_content_hash", "safe_payload",
  ]) assert.equal(serialized.includes(forbidden), false);
}

await withServer((_request, response) => writeJson(response, 200,
  stablePage({ changes: [stableChange({ change_sequence: "1" })] })),
async (baseUrl) => {
  const config = loadFarmOsStableChangesHttpConsumerConfig(environment(baseUrl));
  const repository = new MemoryRepository(config.scope);
  const result = await new FarmOsStableChangesHttpConsumer({
    config,
    repository,
    observedAt: () => OBSERVED_AT,
    onObservation: () => { throw new Error("telemetry-failure"); },
  }).run();
  assert.equal(result.result, "complete");
  assert.equal(repository.commits, 1);
});

console.log("farm_os_stable_changes_http_consumer_loopback: PASS");
