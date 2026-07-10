import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  runHermesCliChatRuntime,
} from "./llm_runtime/hermes_cli_chat_runtime";
import {
  readHermesFarmosReadonlyContext,
} from "./llm_runtime/hermes_farmos_readonly_context";

type ProtectedState = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  crop_cycle_count: number;
};

function readProtectedState(): ProtectedState {
  const sql = [
    "select",
    "  (select count(*)::int from ai.proposal_inbox),",
    "  (select count(*)::int from audit.proposal_review_decision_events),",
    "  (select count(*)::int from audit.proposal_review_apply_events),",
    "  (select count(*)::int from app.crop_cycles);",
  ].join("\n");

  const output = execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "farmos_local_admin",
      "-d",
      "farmos_core_local",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-F",
      "|",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
    },
  ).trim();

  const values = output.split("|").map((value) => Number(value));

  if (
    values.length !== 4 ||
    values.some((value) => !Number.isSafeInteger(value))
  ) {
    throw new Error("invalid protected-state response");
  }

  return {
    proposal_count: values[0],
    decision_history_count: values[1],
    apply_history_count: values[2],
    crop_cycle_count: values[3],
  };
}

async function main(): Promise<void> {
  const before = readProtectedState();
  const env = {
    ...process.env,
    HERMES_OPERATIONAL_READONLY_CONTEXT_ENABLED: "true",
  };

  const readonlyContext = await readHermesFarmosReadonlyContext({
    env,
  });

  assert.equal(readonlyContext.readonly_context_included, true);
  assert.equal(readonlyContext.operational_context_requested, true);
  assert.equal(
    readonlyContext.operational_context_read_performed,
    true,
  );
  assert.equal(readonlyContext.operational_context_included, true);
  assert.equal(
    readonlyContext.operational_external_fetch_performed,
    true,
  );
  assert.equal(readonlyContext.inventory_source_connected, true);
  assert.equal(readonlyContext.work_log_source_connected, true);
  assert.equal(readonlyContext.inventory_record_count, 0);
  assert.ok((readonlyContext.work_log_record_count ?? 0) > 0);
  assert.equal(readonlyContext.inventory_connected_empty, true);
  assert.equal(readonlyContext.suggestion_preview_created, true);
  assert.ok((readonlyContext.suggestion_count ?? 0) > 0);
  assert.match(
    readonlyContext.context_text ?? "",
    /OPERATIONAL_READONLY_CONTEXT/u,
  );

  let capturedPromptBody = "";
  const runtime = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    timeoutMs: 30000,
    message: "Summarize operational read-only context availability.",
    includeReadonlyContext: true,
    readonlyContextReader: async () => readonlyContext,
    fetchImpl: async (_input, init) => {
      capturedPromptBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          response: "day93 operational context ok",
          done: true,
          prompt_eval_count: 0,
          eval_count: 0,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    },
  });

  assert.equal(runtime.status, "ok");
  assert.equal(runtime.prompt_sent, true);
  assert.equal(runtime.response_text, "day93 operational context ok");
  assert.equal(runtime.external_api_called, true);
  assert.equal(runtime.business_context_included, true);
  assert.equal(runtime.operational_context_included, true);
  assert.equal(runtime.inventory_source_connected, true);
  assert.equal(runtime.work_log_source_connected, true);
  assert.equal(runtime.inventory_record_count, 0);
  assert.ok(runtime.work_log_record_count > 0);
  assert.equal(runtime.suggestion_preview_created, true);
  assert.match(capturedPromptBody, /READ_ONLY_FARMOS_CONTEXT/u);
  assert.match(capturedPromptBody, /OPERATIONAL_READONLY_CONTEXT/u);
  assert.match(capturedPromptBody, /USER_MESSAGE/u);

  const token = process.env.FARMOS_CORE_READONLY_TOKEN;
  if (token) {
    assert.equal(capturedPromptBody.includes(token), false);
  }

  assert.equal(runtime.context_write_allowed, false);
  assert.equal(runtime.db_write_performed, false);
  assert.equal(runtime.proposal_created, false);
  assert.equal(runtime.proposal_saved, false);
  assert.equal(runtime.proposal_apply_performed, false);
  assert.equal(runtime.chat_history_saved, false);
  assert.equal(runtime.audit_record_saved, false);
  assert.equal(runtime.app_db_write_performed, false);
  assert.equal(runtime.credentials_exposed, false);

  const after = readProtectedState();
  assert.deepEqual(after, before);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_operational_context_integration_smoke_test",
    readonly_context_included:
      readonlyContext.readonly_context_included,
    operational_context_included:
      readonlyContext.operational_context_included,
    operational_external_fetch_performed:
      readonlyContext.operational_external_fetch_performed,
    inventory_source_connected:
      readonlyContext.inventory_source_connected,
    work_log_source_connected:
      readonlyContext.work_log_source_connected,
    inventory_record_count:
      readonlyContext.inventory_record_count,
    work_log_record_count:
      readonlyContext.work_log_record_count,
    inventory_connected_empty:
      readonlyContext.inventory_connected_empty,
    suggestion_preview_created:
      readonlyContext.suggestion_preview_created,
    suggestion_count:
      readonlyContext.suggestion_count,
    prompt_sent: runtime.prompt_sent,
    operational_context_present_in_prompt:
      /OPERATIONAL_READONLY_CONTEXT/u.test(capturedPromptBody),
    token_present_in_prompt:
      token ? capturedPromptBody.includes(token) : false,
    context_write_allowed: runtime.context_write_allowed,
    database_write_performed: runtime.db_write_performed,
    proposal_created: runtime.proposal_created,
    proposal_saved: runtime.proposal_saved,
    proposal_apply_performed: runtime.proposal_apply_performed,
    credentials_exposed: runtime.credentials_exposed,
    protected_state: {
      before,
      after,
      unchanged: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
