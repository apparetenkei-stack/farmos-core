import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  type FarmOsOperationalMemoryState,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  createFarmOsProjectionFirstAuthorizationAdapter,
  createFarmOsProjectionFirstAuthorizationContext,
} from "../../src/lib/hermes/farm_os_projection_first_authorization";
import {
  createFarmOsProjectionFirstRequest,
} from "../../src/lib/hermes/farm_os_projection_first_contract";
import {
  FARM_OS_PROJECTION_FIRST_INSTALLATION_BINDING_ERROR,
  loadFarmOsProjectionFirstInstallationBinding,
  parseFarmOsProjectionFirstInstallationBinding,
} from "../../src/lib/hermes/farm_os_projection_first_installation_binding";
import {
  FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL,
  FarmOsProjectionFirstPostgresReadAdapter,
  type FarmOsProjectionFirstPostgresPool,
} from "../../src/lib/hermes/farm_os_projection_first_postgres_read_adapter";
import {
  FarmOsProjectionFirstRuntime,
  FarmOsProjectionFirstService,
} from "../../src/lib/hermes/farm_os_projection_first_runtime";
import {
  createFarmOsProjectionFirstProductionService,
  FarmOsProjectionFirstProductionService,
} from "../../src/lib/hermes/farm_os_projection_first_production_service";
import {
  adaptFarmOsProjectionFirstSlackBusinessDate,
  mapFarmOsProjectionFirstResponseToSlack,
} from "../../src/lib/hermes/farm_os_projection_first_slack_adapter";
import {
  selectFarmOsProjectionFirstProjection,
} from "../../src/lib/hermes/farm_os_projection_first_selector";
import {
  createHermesSlackIntegration,
  type HermesSlackSlashCommand,
} from "../../src/lib/slack/hermes_slack_socket_mode";

type Fixture = { fixture_id: string; input_changes: unknown[] };
type QueryRecord = { text: string; values: unknown[] };

const fixtures = (JSON.parse(readFileSync(
  new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
  "utf8",
)) as { fixtures: Fixture[] }).fixtures;
const businessDate = "2026-07-28";
const installationId = "installation_fixture_01";
const farmScope = "farm_fixture_01";
const binding = loadFarmOsProjectionFirstInstallationBinding({
  FARMOS_INSTALLATION_ID: installationId,
  FARMOS_AUTHORIZED_FARM_SCOPE: farmScope,
  FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
});

function buildState(): FarmOsOperationalMemoryState {
  const selected = fixtures.find((entry) =>
    entry.fixture_id === "valid_idempotent"
  );
  assert.ok(selected);
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: {
      contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
      result: "ok",
      next_cursor: null,
      has_more: false,
      changes: selected.input_changes,
    },
    observed_at: "2026-07-28T15:00:00+09:00",
    repository,
  });
  assert.equal(result.result, "success");
  const state = repository.snapshot();
  assert.equal(state.projections.length, 1);
  assert.equal(state.projection_state_events.length, 1);
  assert.equal(state.projection_state_events[0]?.status, "candidate");
  state.projection_state_events = state.projection_state_events.map((event) => ({
    ...event,
    status: "active",
  }));
  return state;
}

function rowState(state: FarmOsOperationalMemoryState) {
  return {
    projections: state.projections.map(({ content, ...projection }) => ({
      ...projection,
      projection_content: content,
    })),
    projectionEvents: structuredClone(state.projection_state_events),
    lineage: structuredClone(state.lineage),
    snapshots: structuredClone(state.snapshots),
    snapshotEvents: structuredClone(state.snapshot_state_events),
  };
}

function fakePool(input: {
  state?: FarmOsOperationalMemoryState;
  lineageRows?: unknown[];
  failOn?: "snapshots";
} = {}): FarmOsProjectionFirstPostgresPool & {
  queries: QueryRecord[];
  connectCount: number;
} {
  const rows = rowState(input.state ?? buildState());
  const evidence = {
    queries: [] as QueryRecord[],
    connectCount: 0,
  };
  return {
    ...evidence,
    get connectCount() {
      return evidence.connectCount;
    },
    get queries() {
      return evidence.queries;
    },
    connect: async () => {
      evidence.connectCount += 1;
      return {
        query: async (query: unknown, values: unknown[] = []) => {
          const text = String(query);
          evidence.queries.push({ text, values: structuredClone(values) });
          if (text.includes("operational_memory_daily_projections")) {
            return { rows: rows.projections };
          }
          if (text.includes("operational_memory_projection_state_events")) {
            return { rows: rows.projectionEvents };
          }
          if (text.includes("operational_memory_projection_lineage")) {
            return { rows: input.lineageRows ?? rows.lineage };
          }
          if (text.includes("operational_memory_source_snapshots")) {
            if (input.failOn === "snapshots") {
              throw new Error("raw_database_error_must_not_escape");
            }
            const ids = new Set((values[1] ?? []) as string[]);
            return {
              rows: rows.snapshots.filter((snapshot) =>
                ids.has(snapshot.snapshot_id)
              ),
            };
          }
          if (text.includes("operational_memory_snapshot_state_events")) {
            const ids = new Set((values[0] ?? []) as string[]);
            return {
              rows: rows.snapshotEvents.filter((event) =>
                ids.has(event.snapshot_id)
              ),
            };
          }
          return { rows: [] };
        },
        release: () => undefined,
      } as never;
    },
    end: async () => undefined,
  };
}

function authorizedScope() {
  return {
    installation_id: installationId,
    farm_scope: farmScope,
    authorization_id: "authorization_evidence_01",
  } as const;
}

const bindingEvents: string[] = [];
assert.deepEqual(binding, {
  installation_id: installationId,
  farm_scope: farmScope,
  timezone: "Asia/Tokyo",
});
const parsedBinding = parseFarmOsProjectionFirstInstallationBinding({
  installation_id: installationId,
  farm_scope: farmScope,
  timezone: "Asia/Tokyo",
});
assert.ok(parsedBinding);
assert.equal(parsedBinding.timezone, "Asia/Tokyo");
for (const environment of [
  {
    FARMOS_AUTHORIZED_FARM_SCOPE: farmScope,
    FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
  },
  {
    FARMOS_INSTALLATION_ID: installationId,
    FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
  },
  {
    FARMOS_INSTALLATION_ID: installationId,
    FARMOS_AUTHORIZED_FARM_SCOPE: farmScope,
    FARMOS_BUSINESS_TIMEZONE: "UTC",
  },
]) {
  assert.throws(
    () => loadFarmOsProjectionFirstInstallationBinding(environment),
    (error: unknown) =>
      error instanceof Error &&
      error.message === FARM_OS_PROJECTION_FIRST_INSTALLATION_BINDING_ERROR,
  );
}
assert.equal(parseFarmOsProjectionFirstInstallationBinding({
  installation_id: installationId,
  farm_scope: farmScope,
  timezone: "Asia/Tokyo",
  client_override: true,
}), null);
assert.equal(bindingEvents.includes(installationId), false);
assert.equal(bindingEvents.includes(farmScope), false);

const authorizationEvents: string[] = [];
const authorization = createFarmOsProjectionFirstAuthorizationAdapter({
  binding,
  onEvent: (event) => authorizationEvents.push(event),
});
const actor = {
  subject_id: "U-authorized",
  channel: "slack",
  actor_authorized: true,
  authorization_evidence_id: "request_fixture_01",
  authentication_method: "slack_allowlist",
} as const;
const context = createFarmOsProjectionFirstAuthorizationContext({
  binding,
  actor,
});
assert.ok(context);
assert.deepEqual(
  await authorization.authorize({
    requested_farm_scope: farmScope,
    context,
  }),
  {
    installation_id: installationId,
    farm_scope: farmScope,
    authorization_id: "request_fixture_01",
  },
);
assert.equal(
  await authorization.authorize({
    requested_farm_scope: "farm_other",
    context,
  }),
  null,
);
assert.equal(createFarmOsProjectionFirstAuthorizationContext({
  binding,
  actor: { ...actor, actor_authorized: false },
}), null);
assert.equal(createFarmOsProjectionFirstAuthorizationContext({
  binding,
  actor: { ...actor, authorization_evidence_id: "" },
}), null);
assert.deepEqual(authorizationEvents, [
  "FARMOS_PROJECTION_FIRST_ACTOR_AUTHORIZED",
  "FARMOS_PROJECTION_FIRST_ACTOR_REJECTED",
]);

let rejectedRepositoryReads = 0;
const authorizationFailureRuntime = new FarmOsProjectionFirstRuntime({
  authorization: {
    authorize: async () => {
      throw new Error("authorization_adapter_failure");
    },
  },
  repository: {
    readProjectionBundle: async () => {
      rejectedRepositoryReads += 1;
      throw new Error("must_not_read");
    },
    readLineageSources: async () => [],
  },
});
const authorizationFailure = await authorizationFailureRuntime.respond({
  request: createFarmOsProjectionFirstRequest({
    query: "作業件数",
    business_date: businessDate,
    farm_scope: farmScope,
    requested_at: "2026-07-28T15:01:00+09:00",
  }),
  authorization_context: context,
});
assert.equal(authorizationFailure.result, "guard_rejected");
assert.deepEqual(authorizationFailure.response_guard.failure_codes, [
  "authorization_failed",
]);
assert.equal(rejectedRepositoryReads, 0);

const pool = fakePool();
const readEvents: string[] = [];
const adapter = new FarmOsProjectionFirstPostgresReadAdapter({
  installation_binding: binding,
  postgres_pool: pool,
  onEvent: (event) => readEvents.push(event),
});
const bundle = await adapter.readProjectionBundle({
  authorized_scope: authorizedScope(),
  business_date: businessDate,
});
assert.equal(bundle.business_date, businessDate);
assert.equal(bundle.full_history_scan_performed, false);
assert.equal(bundle.projections.length, 1);
assert.equal(bundle.lineage.length, 1);
assert.equal(bundle.snapshots.length, 1);
assert.equal(selectFarmOsProjectionFirstProjection({
  authorized_farm_scope: farmScope,
  business_date: businessDate,
  bundle,
}).result, "selected");
assert.equal(pool.queries[0]?.text,
  FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.begin);
assert.equal(pool.queries.at(-1)?.text, "commit");
assert.deepEqual(
  pool.queries.find((query) =>
    query.text.includes("operational_memory_daily_projections")
  )?.values,
  [businessDate],
);
assert.deepEqual(
  pool.queries.find((query) =>
    query.text.includes("operational_memory_projection_lineage")
  )?.values,
  [bundle.projections[0]?.projection_id],
);
assert.equal(
  pool.queries.some((query) =>
    /\b(?:insert|update|delete|call|persist_operational_memory_bundle)\b/iu
      .test(query.text)
  ),
  false,
);
assert.deepEqual(readEvents, [
  "FARMOS_PROJECTION_FIRST_SCOPED_READ_STARTED",
  "FARMOS_PROJECTION_FIRST_SCOPED_READ_COMPLETED",
]);

const sources = await adapter.readLineageSources({
  authorized_scope: authorizedScope(),
  business_date: businessDate,
  snapshot_ids: bundle.lineage.map((entry) => entry.snapshot_id),
  limit: 20,
});
assert.equal(sources.length, 1);
await assert.rejects(adapter.readLineageSources({
  authorized_scope: authorizedScope(),
  business_date: businessDate,
  snapshot_ids: ["snapshot_not_selected"],
  limit: 20,
}), /PROJECTION_FIRST_SCOPED_READ_UNAVAILABLE/u);

const mismatchPool = fakePool();
const mismatchAdapter = new FarmOsProjectionFirstPostgresReadAdapter({
  installation_binding: binding,
  postgres_pool: mismatchPool,
});
await assert.rejects(mismatchAdapter.readProjectionBundle({
  authorized_scope: { ...authorizedScope(), farm_scope: "farm_other" },
  business_date: businessDate,
}), /PROJECTION_FIRST_SCOPED_READ_UNAVAILABLE/u);
assert.equal(mismatchPool.connectCount, 0);

const tooMuchLineage = Array.from({ length: 51 }, (_, index) => ({
  projection_id: buildState().projections[0]?.projection_id,
  snapshot_id: `snapshot_${index}`,
  source_record_id: `record_${index}`,
  source_content_hash: "a".repeat(64),
  relation: "included",
}));
const boundedPool = fakePool({ lineageRows: tooMuchLineage });
const boundedAdapter = new FarmOsProjectionFirstPostgresReadAdapter({
  installation_binding: binding,
  postgres_pool: boundedPool,
});
await assert.rejects(boundedAdapter.readProjectionBundle({
  authorized_scope: authorizedScope(),
  business_date: businessDate,
}), /PROJECTION_FIRST_SCOPED_READ_UNAVAILABLE/u);
assert.equal(boundedPool.queries.at(-1)?.text, "rollback");

const failurePool = fakePool({ failOn: "snapshots" });
const failureAdapter = new FarmOsProjectionFirstPostgresReadAdapter({
  installation_binding: binding,
  postgres_pool: failurePool,
});
await assert.rejects(failureAdapter.readProjectionBundle({
  authorized_scope: authorizedScope(),
  business_date: businessDate,
}), /PROJECTION_FIRST_SCOPED_READ_UNAVAILABLE/u);
assert.equal(failurePool.queries.at(-1)?.text, "rollback");

const runtime = new FarmOsProjectionFirstRuntime({
  authorization,
  repository: adapter,
});
const canonicalService = new FarmOsProjectionFirstService(runtime);
let clock = new Date("2026-07-28T06:00:00.000Z");
const production = new FarmOsProjectionFirstProductionService({
  binding,
  service: canonicalService,
  closeRepository: async () => undefined,
  clock: () => clock,
});
const answered = await production.respondFromSlack({
  query: "今日の作業記録は何件ですか",
  actor,
});
assert.equal(answered.result, "answered");
assert.equal(answered.mode_requested, "fast");
assert.equal(answered.writes_performed, false);
const detailedWording = await production.respondFromSlack({
  query: "今日の作業記録を詳しく分析して",
  actor,
});
assert.equal(detailedWording.mode_requested, "fast");
assert.notEqual(detailedWording.result, "deep_analysis_unavailable");

const readsBeforeAmbiguous = pool.connectCount;
const clarification = await production.respondFromSlack({
  query: "昨日の作業記録を教えて",
  actor,
});
assert.equal(clarification.result, "clarification_required");
assert.equal(pool.connectCount, readsBeforeAmbiguous);
for (const query of [
  "一昨日の作業",
  "明日の予定",
  "先週の記録",
  "先月の記録",
  "2026-07-27の記録",
  "2026/07/27の記録",
  "7月27日の記録",
]) {
  assert.equal(adaptFarmOsProjectionFirstSlackBusinessDate({
    query,
    now: clock,
  }).result, "clarification_required");
}
assert.equal(adaptFarmOsProjectionFirstSlackBusinessDate({
  query: "今日の記録を詳しく分析して",
  now: clock,
}).result, "current_date");
clock = new Date("2026-07-28T14:59:59.000Z");
assert.equal(adaptFarmOsProjectionFirstSlackBusinessDate({
  query: "現在の作業件数",
  now: clock,
}).business_date, "2026-07-28");
clock = new Date("2026-07-28T15:00:00.000Z");
assert.equal(adaptFarmOsProjectionFirstSlackBusinessDate({
  query: "現在の作業件数",
  now: clock,
}).business_date, "2026-07-29");

const slackEnv = {
  SLACK_INTEGRATION_ENABLED: "true",
  SLACK_SOCKET_MODE_ENABLED: "true",
  SLACK_APP_TOKEN: "synthetic-app-token",
  SLACK_BOT_TOKEN: "synthetic-bot-token",
  SLACK_ALLOWED_WORKSPACE_IDS: "T-allowed",
  SLACK_ALLOWED_CHANNEL_IDS: "C-allowed",
  SLACK_ALLOWED_USER_IDS: "U-allowed",
  HERMES_LLM_PROVIDER: "ollama",
  FARMOS_APP_URL: "http://127.0.0.1:3000",
};
const command: HermesSlackSlashCommand = {
  command: "/hermes",
  text: "今日の作業記録は何件ですか",
  team_id: "T-allowed",
  channel_id: "C-allowed",
  user_id: "U-allowed",
};
let projectionCalls = 0;
let legacyCalls = 0;
let receivedActor: unknown = null;
const slackResponses: string[] = [];
const slackLogs: string[] = [];
const slack = createHermesSlackIntegration({
  env: slackEnv,
  nowIso: () => "2026-07-28T07:00:00.000Z",
  requestIdFactory: () => "slack_request_01",
  invokeProjectionFirst: async (request) => {
    projectionCalls += 1;
    receivedActor = request.actor;
    return mapFarmOsProjectionFirstResponseToSlack(answered);
  },
  invokeHermes: async () => {
    legacyCalls += 1;
    throw new Error("legacy_fallback_prohibited");
  },
  postEphemeralResponse: async (request) => {
    slackResponses.push(request.text);
  },
  log: (event) => slackLogs.push(JSON.stringify(event)),
});
const slackResult = await slack.handleSlashCommand(command, () => undefined);
assert.equal(slackResult.status, "succeeded");
assert.equal(projectionCalls, 1);
assert.equal(legacyCalls, 0);
assert.deepEqual(receivedActor, {
  subject_id: "U-allowed",
  channel: "slack",
  actor_authorized: true,
  authorization_evidence_id: "slack_request_01",
  authentication_method: "slack_allowlist",
});
assert.match(slackResponses[0] ?? "", /Hermes回答:/u);
assert.equal(
  slackLogs.some((log) =>
    log.includes(command.text) ||
    log.includes(command.team_id) ||
    log.includes(command.channel_id) ||
    log.includes(command.user_id)
  ),
  false,
);

const denied = await slack.handleSlashCommand(
  { ...command, user_id: "U-denied" },
  () => undefined,
);
assert.equal(denied.status, "unauthorized");
assert.equal(projectionCalls, 1);

const safeFailures = [
  {
    ...answered,
    result: "projection_missing" as const,
    mode_used: "none" as const,
    answer: null,
    projection_id: null,
    projection_status: "missing" as const,
    as_of: null,
    grounding_refs: [],
    response_guard: {
      status: "rejected" as const,
      failure_codes: ["projection_not_found" as const],
    },
  },
  clarification,
] as const;
for (const response of safeFailures) {
  const mapped = mapFarmOsProjectionFirstResponseToSlack(response);
  assert.notEqual(mapped.status, "answered");
  assert.equal(mapped.text.includes("raw_database_error"), false);
}

for (const response of safeFailures) {
  let fallbackCalls = 0;
  const mapped = mapFarmOsProjectionFirstResponseToSlack(response);
  const isolated = createHermesSlackIntegration({
    env: slackEnv,
    nowIso: () => "2026-07-28T07:00:00.000Z",
    requestIdFactory: () => "slack_failure_request",
    invokeProjectionFirst: async () => mapped,
    invokeHermes: async () => {
      fallbackCalls += 1;
      throw new Error("legacy_fallback_prohibited");
    },
    postEphemeralResponse: async () => undefined,
  });
  const result = await isolated.handleSlashCommand(command, () => undefined);
  assert.equal(result.status, mapped.status);
  assert.equal(fallbackCalls, 0);
}

const productionEvents: string[] = [];
const configuredFactory = createFarmOsProjectionFirstProductionService({
  environment: {
    FARMOS_INSTALLATION_ID: installationId,
    FARMOS_AUTHORIZED_FARM_SCOPE: farmScope,
    FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
    POSTGRES_DB: "test_database",
    POSTGRES_USER: "test_user",
    POSTGRES_PASSWORD: "test_only_placeholder",
  },
  onEvent: (event) => productionEvents.push(event),
});
await configuredFactory.close();
assert.deepEqual(productionEvents, [
  "FARMOS_PROJECTION_FIRST_BINDING_LOADED",
]);
assert.equal(productionEvents.some((event) =>
  event.includes(installationId) || event.includes(farmScope)
), false);
const rejectedBindingEvents: string[] = [];
assert.throws(() =>
  createFarmOsProjectionFirstProductionService({
    environment: {},
    onEvent: (event) => rejectedBindingEvents.push(event),
  })
);
assert.deepEqual(rejectedBindingEvents, [
  "FARMOS_PROJECTION_FIRST_BINDING_REJECTED",
]);

const productionSource = readFileSync(
  new URL(
    "../../src/lib/hermes/farm_os_projection_first_production_service.ts",
    import.meta.url,
  ),
  "utf8",
);
const adapterSource = readFileSync(
  new URL(
    "../../src/lib/hermes/farm_os_projection_first_postgres_read_adapter.ts",
    import.meta.url,
  ),
  "utf8",
);
assert.doesNotMatch(productionSource, /FarmOsInMemoryOperationalMemoryRepository/u);
assert.doesNotMatch(adapterSource, /\.readState\s*\(/u);
assert.doesNotMatch(
  adapterSource,
  /\b(?:insert\s+into|update\s+ai\.|delete\s+from|persist_operational_memory_bundle)\b/iu,
);
assert.equal(
  createFarmOsProjectionFirstRequest({
    query: "作業件数",
    business_date: businessDate,
    farm_scope: farmScope,
    requested_at: "2026-07-28T15:01:00+09:00",
  }).response_mode,
  "fast",
);

console.log("farm_os_day146_projection_first_production_integration: PASS");
