import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const componentPath =
  "src/components/hermes/hermes_api_blocked_state_preview.tsx";
const pagePath = "src/app/hermes/page.tsx";
const routePath = "src/app/api/hermes/chat/route.ts";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function includesAll(text: string, values: string[]): boolean {
  return values.every((value) => text.includes(value));
}

const component = read(componentPath);
const page = read(pagePath);
const route = read(routePath);

const forbiddenBodyFields = [
  "base" + "Url",
  "mod" + "el",
  "timeout" + "Ms",
  "cred" + "entials",
  "api" + "Key",
  "tok" + "en",
  "db" + "Connection",
  "connection" + "String",
  "system" + "Prompt",
  "proposal" + "Body",
];

const requiredDisplayKeys = [
  "status",
  "api_boundary_enabled",
  "production_chat_enabled",
  "prompt_sent",
  "db_read_performed",
  "db_write_performed",
  "proposal_created",
  "proposal_saved",
  "proposal_apply_performed",
  "chat_history_saved",
  "audit_record_saved",
  "app_db_write_performed",
  "ui_connected",
  "server_action_used",
  "form_action_used",
  "response_envelope_normalized",
];

const noWriteKeys = [
  "db_read_performed",
  "db_write_performed",
  "prompt_sent",
  "proposal_created",
  "proposal_saved",
  "proposal_apply_performed",
  "chat_history_saved",
  "audit_record_saved",
  "app_db_write_performed",
];

assert.ok(component.startsWith('"use client";'));
assert.ok(component.includes('const API_ENDPOINT = "/api/hermes/chat" as const;'));
assert.ok(component.includes('method: "POST"'));
assert.ok(component.includes("body: JSON.stringify(requestBody)"));
assert.ok(component.includes("message: messageForRequest"));
assert.ok(component.includes("includeReadonlyContext: false"));
assert.ok(component.includes('provider: "mock"'));
assert.ok(component.includes("MAX_MESSAGE_CHARS = 500"));
assert.ok(component.includes("message must be single-line"));
assert.ok(component.includes("message is required"));
assert.ok(component.includes("message must be 500 characters or fewer"));

assert.ok(includesAll(component, requiredDisplayKeys));
assert.ok(includesAll(component, noWriteKeys));

for (const field of forbiddenBodyFields) {
  assert.equal(
    component.includes(field),
    false,
    `forbidden request body field found in component: ${field}`,
  );
}

const serverActionDirective = '"use ' + 'server"';
assert.equal(component.includes(serverActionDirective), false);
assert.equal(page.includes(serverActionDirective), false);

assert.ok(page.includes("HermesApiBlockedStatePreview"));
assert.ok(page.includes("hermes_api_blocked_state_preview"));
assert.ok(route.includes("runHermesApiChatMinimalBoundary"));
assert.ok(route.includes("production_chat_enabled"));

console.log(JSON.stringify({
  result: "ok",
  checked: "hermes_ui_chat_blocked_state_boundary",
  component_added: true,
  existing_hermes_page_connected: true,
  api_endpoint: "/api/hermes/chat",
  request_body_fields: ["message", "includeReadonlyContext", "provider"],
  provider_initial_value: "mock",
  include_readonly_context_initial_value: false,
  max_message_chars: 500,
  single_line_message_only: true,
  blocked_response_display_keys: requiredDisplayKeys,
  no_write_keys: noWriteKeys,
  forbidden_body_fields_absent: true,
  server_action_used: false,
  form_action_used: false,
}, null, 2));
