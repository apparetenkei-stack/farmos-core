import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runHermesApiChatMinimalBoundary } from "../../src/app/api/hermes/chat/route";
import {
  createHermesSlackIntegration,
  type HermesSlackSlashCommand,
} from "../../src/lib/slack/hermes_slack_socket_mode";
import {
  createHermesSlackEphemeralPoster,
  SLACK_CHAT_POST_EPHEMERAL_URL,
} from "../../src/lib/slack/hermes_slack_ephemeral_transport";
import { readHermesFarmosReadonlyContext } from "../hermes/llm_runtime/hermes_farmos_readonly_context";

const APP_TOKEN = "synthetic-app-token-never-log";
const BOT_TOKEN = "synthetic-bot-token-never-log";

const baseEnv = {
  SLACK_INTEGRATION_ENABLED: "true",
  SLACK_SOCKET_MODE_ENABLED: "true",
  SLACK_APP_TOKEN: APP_TOKEN,
  SLACK_BOT_TOKEN: BOT_TOKEN,
  SLACK_ALLOWED_WORKSPACE_IDS: "T-allowed",
  SLACK_ALLOWED_CHANNEL_IDS: "C-allowed",
  SLACK_ALLOWED_USER_IDS: "U-allowed",
  FARMOS_APP_URL: "http://127.0.0.1:3000",
  HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
  HERMES_LLM_PROVIDER: "ollama",
  HERMES_LLM_SMOKE_TEST_ENABLED: "true",
} satisfies Record<string, string>;

const command = (
  overrides: Partial<HermesSlackSlashCommand> = {},
): HermesSlackSlashCommand => ({
  command: "/hermes",
  text: "今日の確認事項を教えて",
  team_id: "T-allowed",
  channel_id: "C-allowed",
  user_id: "U-allowed",
  ...overrides,
});

const okEnvelope = (overrides: Record<string, unknown> = {}) => ({
  status: "ok",
  response_text: "今日の確認候補です。",
  error_message: null,
  readonly_context_requested: true,
  readonly_context_read_performed: true,
  readonly_context_included: true,
  readonly_context_truncated: false,
  operational_context_requested: true,
  operational_context_included: true,
  inventory_source_connected: true,
  work_log_source_connected: true,
  inventory_record_count: 1,
  work_log_record_count: 1,
  context_write_allowed: false,
  db_write_performed: false,
  app_db_write_performed: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  proposal_draft_created: false,
  proposal_draft_saved: false,
  proposal_draft_persisted: false,
  proposal_draft_apply_ready: false,
  chat_history_saved: false,
  audit_record_saved: false,
  credentials_exposed: false,
  ...overrides,
});

function fixture(input?: {
  env?: Record<string, string | undefined>;
  envelope?: Record<string, unknown>;
  freshness?: {
    inventory_observed_at: string | null;
    work_log_observed_at: string | null;
    inventory_source_updated_at: string | null;
    work_log_source_updated_at: string | null;
  } | null;
  hermesError?: Error;
  slackError?: Error;
}) {
  const events: string[] = [];
  const logs: string[] = [];
  const hermesCalls: Array<{ body: unknown; requestId: string }> = [];
  const responses: Array<{
    channel: string;
    user: string;
    text: string;
    botToken: string;
  }> = [];
  const integration = createHermesSlackIntegration({
    env: input?.env ?? baseEnv,
    requestIdFactory: () => "slack-request-1",
    nowIso: () => "2026-07-28T01:02:03.000Z",
    nowMs: () => Date.parse("2026-07-28T01:02:03.000Z"),
    invokeHermes: async (request) => {
      events.push("hermes");
      hermesCalls.push(request);
      if (input?.hermesError) throw input.hermesError;
      return {
        httpStatus: 200,
        body: input?.envelope ?? okEnvelope(),
        freshness:
          input && Object.hasOwn(input, "freshness")
            ? (input.freshness ?? null)
            : {
                inventory_observed_at: "2026-07-28T01:01:30.000Z",
                work_log_observed_at: "2026-07-28T01:01:40.000Z",
                inventory_source_updated_at: null,
                work_log_source_updated_at: null,
              },
      };
    },
    postEphemeralResponse: async (request) => {
      events.push("ephemeral");
      responses.push(request);
      if (input?.slackError) throw input.slackError;
    },
    log: (event) => logs.push(JSON.stringify(event)),
  });

  const handle = (
    payload: HermesSlackSlashCommand,
    requestId = "slack-request-1",
  ) =>
    integration.handleSlashCommand(
      payload,
      () => events.push("ack"),
      { requestId },
    );

  return {
    integration,
    events,
    logs,
    hermesCalls,
    responses,
    handle,
  };
}

async function main(): Promise<void> {
  for (const flag of [
    "SLACK_INTEGRATION_ENABLED",
    "SLACK_SOCKET_MODE_ENABLED",
  ] as const) {
    const f = fixture({ env: { ...baseEnv, [flag]: "false" } });
    assert.equal(f.integration.startup.status, "disabled");
    assert.equal((await f.handle(command())).status, "disabled");
    assert.deepEqual(f.events, ["ack"]);
  }

  {
    const env = { ...baseEnv };
    delete (env as Partial<typeof baseEnv>).SLACK_APP_TOKEN;
    const f = fixture({ env });
    assert.equal(f.integration.startup.status, "blocked");
    assert.equal(f.integration.startup.error_code, "slack_secret_missing");
    assert.deepEqual(f.integration.startup.missing_env_names, [
      "SLACK_APP_TOKEN",
    ]);
  }

  for (const name of [
    "SLACK_ALLOWED_WORKSPACE_IDS",
    "SLACK_ALLOWED_CHANNEL_IDS",
    "SLACK_ALLOWED_USER_IDS",
  ] as const) {
    const f = fixture({ env: { ...baseEnv, [name]: "" } });
    assert.equal(f.integration.startup.status, "blocked");
    assert.equal(f.integration.startup.error_code, "slack_allowlist_missing");
  }

  for (const denied of [
    command({ team_id: "T-denied" }),
    command({ channel_id: "C-denied" }),
    command({ user_id: "U-denied" }),
  ]) {
    const f = fixture();
    assert.equal((await f.handle(denied)).status, "unauthorized");
    assert.deepEqual(f.events, ["ack"]);
    assert.equal(f.hermesCalls.length, 0);
    assert.equal(f.responses.length, 0);
  }

  for (const invalid of [
    { payload: command({ text: "" }), code: "slack_message_empty" },
    {
      payload: command({ text: "x".repeat(501) }),
      code: "slack_message_too_long",
    },
  ]) {
    const f = fixture();
    const result = await f.handle(invalid.payload);
    assert.equal(result.status, "invalid_input");
    assert.equal(result.error_code, invalid.code);
    assert.deepEqual(f.events, ["ack", "ephemeral"]);
    assert.equal(f.hermesCalls.length, 0);
  }

  {
    const f = fixture({
      envelope: okEnvelope({
        response_text:
          "*今日の確認結果*\n- tomorrowの作業記録があります。\n*必要な確認*\n- todayの予定とyesterdayの記録を確認してください。",
      }),
    });
    const result = await f.handle(command(), "slack-envelope-request-1");
    assert.equal(result.status, "succeeded");
    assert.deepEqual(f.events, ["ack", "hermes", "ephemeral"]);
    assert.deepEqual(f.hermesCalls[0], {
      requestId: "slack-envelope-request-1",
      body: {
        message: "今日の確認事項を教えて",
        includeReadonlyContext: true,
        provider: "ollama",
      },
    });
    assert.equal(f.responses[0]?.user, "U-allowed");
    assert.equal(f.responses[0]?.channel, "C-allowed");
    assert.match(f.responses[0]?.text ?? "", /Hermes回答:\n/);
    assert.match(f.responses[0]?.text ?? "", /\*今日の確認結果\*\n-/);
    assert.match(f.responses[0]?.text ?? "", /\*必要な確認\*\n-/);
    assert.match(
      f.responses[0]?.text ?? "",
      /明日の作業記録があります/u,
    );
    assert.match(
      f.responses[0]?.text ?? "",
      /今日の予定と昨日の記録/u,
    );
    assert.doesNotMatch(
      f.responses[0]?.text ?? "",
      /\b(?:tomorrow|today|yesterday)\b/iu,
    );
    assert.match(f.responses[0]?.text ?? "", /Interactive Response/);
    assert.match(f.responses[0]?.text ?? "", /AIによる参考情報/);
    assert.match(f.responses[0]?.text ?? "", /農場データはread-only参照/);
    assert.match(
      f.responses[0]?.text ?? "",
      /参照時刻: 2026-07-28T01:02:03.000Z/,
    );
    assert.match(f.responses[0]?.text ?? "", /staleまたは不足情報/);
    assert.match(
      f.responses[0]?.text ?? "",
      /取得鮮度: 検証済み（最大300秒）/,
    );
    assert.match(
      f.responses[0]?.text ?? "",
      /業務データ更新時刻: 在庫 情報未提供、作業記録 情報未提供/,
    );
    assert.match(
      f.responses[0]?.text ?? "",
      /http:\/\/127\.0\.0\.1:3000/,
    );
  }

  {
    const f = fixture({ envelope: okEnvelope({ status: "timeout" }) });
    assert.equal((await f.handle(command())).status, "hermes_timeout");
    assert.deepEqual(f.events, ["ack", "hermes", "ephemeral"]);
  }

  {
    const f = fixture({ hermesError: new Error("provider unavailable") });
    assert.equal((await f.handle(command())).status, "hermes_unavailable");
    assert.deepEqual(f.events, ["ack", "hermes", "ephemeral"]);
  }

  {
    const f = fixture({ slackError: new Error("slack unavailable") });
    assert.equal((await f.handle(command())).status, "slack_response_failed");
    assert.deepEqual(f.events, ["ack", "hermes", "ephemeral"]);
  }

  {
    const f = fixture({
      envelope: okEnvelope({ db_write_performed: true }),
    });
    assert.equal(
      (await f.handle(command())).status,
      "write_boundary_violation",
    );
    assert.equal(
      f.responses[0]?.text.includes("今日の確認候補です。"),
      false,
    );
  }

  for (const envelope of [
    okEnvelope({ credentials_exposed: true }),
    (() => {
      const value = okEnvelope();
      delete value.credentials_exposed;
      return value;
    })(),
  ]) {
    const f = fixture({ envelope });
    assert.equal(
      (await f.handle(command())).status,
      "write_boundary_violation",
    );
    assert.equal(
      f.responses[0]?.text.includes("今日の確認候補です。"),
      false,
    );
  }

  for (const rejected of [
    fixture({
      freshness: {
        inventory_observed_at: "2026-07-28 01:01:30Z",
        work_log_observed_at: "2026-07-28T01:01:40.000Z",
        inventory_source_updated_at: null,
        work_log_source_updated_at: null,
      },
    }),
    fixture({
      envelope: okEnvelope({ readonly_context_included: false }),
    }),
    fixture({
      envelope: okEnvelope({ readonly_context_truncated: true }),
    }),
    fixture({
      envelope: okEnvelope({ error_message: "context_partial" }),
    }),
  ]) {
    const result = await rejected.handle(command());
    assert.notEqual(result.status, "succeeded");
    assert.equal(
      rejected.responses[0]?.text.includes("今日の確認候補です。"),
      false,
    );
  }

  {
    const propagatedReadonly = await readHermesFarmosReadonlyContext({
      env: {
        HERMES_OPERATIONAL_READONLY_CONTEXT_ENABLED: "true",
      },
      readMemoryContext: async () =>
        ({
          result: "error",
          error: "memory_context_unavailable",
          context: null,
        }) as never,
      readOperationalContext: async () =>
        ({
          result: "ok",
          operational_context_included: true,
          context_text: "{\"source\":\"truncated_operational_preview\"}",
          context_truncated: true,
          error_message: null,
          external_fetch_performed: true,
          inventory_source_connected: true,
          work_log_source_connected: true,
          inventory_record_count: 1,
          work_log_record_count: 1,
          inventory_connected_empty: false,
          work_log_connected_empty: false,
          suggestion_preview_created: false,
          suggestion_count: 0,
        }) as never,
    });
    assert.equal(propagatedReadonly.readonly_context_truncated, true);

    const responses: string[] = [];
    const integration = createHermesSlackIntegration({
      env: baseEnv,
      nowIso: () => "2026-07-28T01:02:03.000Z",
      nowMs: () => Date.parse("2026-07-28T01:02:03.000Z"),
      requestIdFactory: () => "slack-truncated-e2e",
      invokeHermes: async (request) => {
        const api = await runHermesApiChatMinimalBoundary({
          env: {
            ...baseEnv,
            HERMES_OLLAMA_BASE_URL: "http://127.0.0.1:11434",
            HERMES_OLLAMA_MODEL: "synthetic-test-model",
            HERMES_LLM_TIMEOUT_MS: "30000",
          },
          body: request.body,
          requestIdFactory: () => request.requestId,
          readonlyContextReader: async () => propagatedReadonly,
          fetchImpl: async () =>
            new Response(
              JSON.stringify({
                response: "must not reach Slack",
                done: true,
                prompt_eval_count: 0,
                eval_count: 0,
              }),
              { status: 200 },
            ),
        });
        return {
          ...api,
          freshness: {
            inventory_observed_at: "2026-07-28T01:01:30.000Z",
            work_log_observed_at: "2026-07-28T01:01:40.000Z",
            inventory_source_updated_at: null,
            work_log_source_updated_at: null,
          },
        };
      },
      postEphemeralResponse: async (request) => {
        responses.push(request.text);
      },
    });
    const result = await integration.handleSlashCommand(
      command(),
      () => undefined,
    );
    assert.equal(result.status, "readonly_context_unavailable");
    assert.equal(responses[0]?.includes("must not reach Slack"), false);
  }

  {
    const f = fixture({
      freshness: {
        inventory_observed_at: "2026-07-28T00:00:00.000Z",
        work_log_observed_at: "2026-07-28T01:01:40.000Z",
        inventory_source_updated_at: null,
        work_log_source_updated_at: null,
      },
    });
    assert.equal(
      (await f.handle(command())).status,
      "stale_context_rejected",
    );
    assert.equal(
      f.responses[0]?.text.includes("今日の確認候補です。"),
      false,
    );
  }

  for (const freshness of [
    {
      inventory_observed_at: "2026-07-28T01:01:30.000Z",
      work_log_observed_at: "2026-07-28T00:00:00.000Z",
      inventory_source_updated_at: null,
      work_log_source_updated_at: null,
    },
    {
      inventory_observed_at: "2026-07-28T01:02:04.000Z",
      work_log_observed_at: "2026-07-28T01:01:40.000Z",
      inventory_source_updated_at: null,
      work_log_source_updated_at: null,
    },
  ]) {
    const f = fixture({ freshness });
    assert.equal(
      (await f.handle(command())).status,
      "stale_context_rejected",
    );
    assert.equal(
      f.responses[0]?.text.includes("今日の確認候補です。"),
      false,
    );
  }

  {
    const f = fixture({
      freshness: {
        inventory_observed_at: "2026-07-28T01:01:30.000Z",
        work_log_observed_at: "2026-07-28T01:01:40.000Z",
        inventory_source_updated_at: "2026-07-27T23:00:00.000Z",
        work_log_source_updated_at: null,
      },
    });
    assert.equal((await f.handle(command())).status, "succeeded");
    assert.match(
      f.responses[0]?.text ?? "",
      /業務データ更新時刻: 在庫 2026-07-27T23:00:00.000Z、作業記録 情報未提供/,
    );
  }

  {
    const f = fixture();
    await f.handle(command());
    const serializedLogs = f.logs.join("\n");
    assert.equal(serializedLogs.includes(APP_TOKEN), false);
    assert.equal(serializedLogs.includes(BOT_TOKEN), false);
  }

  {
    const requests: Array<{ url: string; body: string }> = [];
    const poster = createHermesSlackEphemeralPoster({
      fetchImpl: async (url, init) => {
        requests.push({
          url: String(url),
          body: String(init?.body),
        });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    await poster({
      channel: "C-allowed",
      user: "U-allowed",
      text: "ephemeral only",
      botToken: BOT_TOKEN,
    });
    assert.equal(requests[0]?.url, SLACK_CHAT_POST_EPHEMERAL_URL);
    assert.equal(JSON.parse(requests[0]?.body ?? "{}").user, "U-allowed");
  }

  {
    const productionSources = await Promise.all([
      readFile(
        new URL(
          "../../src/lib/slack/hermes_slack_socket_mode.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../src/lib/slack/hermes_slack_ephemeral_transport.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("./run_hermes_slack_socket_mode.ts", import.meta.url),
        "utf8",
      ),
    ]);
    const source = productionSources.join("\n");
    assert.doesNotMatch(source, /chat\.postMessage/u);
    assert.doesNotMatch(source, /conversations\.history|chat\.history/u);
    assert.doesNotMatch(
      source,
      /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/u,
    );
  }

  {
    const f = fixture();
    const result = await f.handle(command());
    assert.equal(result.db_write_performed, false);
    assert.equal(result.proposal_write_performed, false);
    assert.equal(result.approval_created, false);
    assert.equal(result.apply_performed, false);
  }

  console.log(
    JSON.stringify({
      checked: "hermes_slack_socket_mode_interactive_response",
      required_cases: 17,
      response_mode: "ephemeral",
      normal_channel_post_used: false,
      secret_values_logged: false,
      db_write_performed: false,
      proposal_write_performed: false,
      approval_created: false,
      apply_performed: false,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "test_failed");
  process.exitCode = 1;
});
