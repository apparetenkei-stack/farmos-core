import {
  createHermesSlackIntegration,
  type HermesSlackFreshnessEvidence,
  type HermesSlackLogEvent,
  type HermesSlackSlashCommand,
} from "../../src/lib/slack/hermes_slack_socket_mode";
import {
  createHermesSlackEphemeralPoster,
} from "../../src/lib/slack/hermes_slack_ephemeral_transport";
import {
  runHermesApiChatMinimalBoundary,
} from "../../src/app/api/hermes/chat/route";
import {
  readHermesFarmosReadonlyContext,
} from "../hermes/llm_runtime/hermes_farmos_readonly_context";
import {
  readHermesOperationalContextIntegration,
} from "../../src/lib/hermes/hermes_operational_context_integration";
import {
  readHermesOperationalReadonlySources,
} from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  createHermesRuntimeRequestId,
} from "../hermes/llm_runtime/hermes_runtime_contract";

const SLACK_CONNECTIONS_OPEN_URL =
  "https://slack.com/api/apps.connections.open";
const SLACK_HTTP_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const REPLAY_CACHE_MAX_ENTRIES = 1_000;

type SlackSocketEnvelope = {
  envelope_id?: unknown;
  type?: unknown;
  payload?: unknown;
};

class SlackEnvelopeReplayGuard {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  accept(envelopeId: string): boolean {
    if (this.seen.has(envelopeId)) return false;
    this.seen.add(envelopeId);
    this.order.push(envelopeId);
    if (this.order.length > REPLAY_CACHE_MAX_ENTRIES) {
      const oldest = this.order.shift();
      if (oldest) this.seen.delete(oldest);
    }
    return true;
  }
}

function structuredLog(event: HermesSlackLogEvent): void {
  const line = JSON.stringify(event);
  if (event.level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function isSlashCommand(value: unknown): value is HermesSlackSlashCommand {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.command === "string" &&
    typeof record.text === "string" &&
    typeof record.team_id === "string" &&
    typeof record.channel_id === "string" &&
    typeof record.user_id === "string"
  );
}

async function openSocketUrl(appToken: string): Promise<string> {
  const response = await fetch(SLACK_CONNECTIONS_OPEN_URL, {
    method: "POST",
    signal: AbortSignal.timeout(SLACK_HTTP_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const result = (await response.json().catch(() => null)) as {
    ok?: unknown;
    url?: unknown;
  } | null;

  if (!response.ok || result?.ok !== true || typeof result.url !== "string") {
    throw new Error("slack_socket_open_failed");
  }
  return result.url;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function run(): Promise<void> {
  const integration = createHermesSlackIntegration({
    invokeHermes: async (request) => {
      let freshness: HermesSlackFreshnessEvidence | null = null;
      const result = await runHermesApiChatMinimalBoundary({
        body: request.body,
        requestIdFactory: () => request.requestId,
        readonlyContextReader: () =>
          readHermesFarmosReadonlyContext({
            readOperationalContext: () =>
              readHermesOperationalContextIntegration({
                readSources: async () => {
                  const sources =
                    await readHermesOperationalReadonlySources();
                  freshness = {
                    inventory_observed_at:
                      sources.inventory.observed_at,
                    work_log_observed_at:
                      sources.work_log.observed_at,
                    inventory_source_updated_at:
                      sources.inventory.source_updated_at,
                    work_log_source_updated_at:
                      sources.work_log.source_updated_at,
                  };
                  return sources;
                },
              }),
          }),
      });
      return { ...result, freshness };
    },
    postEphemeralResponse: createHermesSlackEphemeralPoster(),
    log: structuredLog,
  });

  if (integration.startup.status === "disabled") {
    structuredLog({
      level: "info",
      event: "slack_socket_mode_disabled",
      request_id: null,
      error_code: null,
    });
    return;
  }

  if (integration.startup.status === "blocked" || !integration.appToken) {
    structuredLog({
      level: "error",
      event: "slack_socket_mode_startup_blocked",
      request_id: null,
      error_code:
        integration.startup.error_code ?? "slack_runtime_not_ready",
    });
    process.exitCode = 1;
    return;
  }

  let stopped = false;
  let activeSocket: WebSocket | null = null;
  let reconnectDelayMs = 1_000;
  const replayGuard = new SlackEnvelopeReplayGuard();

  const stop = () => {
    stopped = true;
    activeSocket?.close(1000, "shutdown");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopped) {
    try {
      const socketUrl = await openSocketUrl(integration.appToken);
      const socket = new WebSocket(socketUrl);
      activeSocket = socket;

      await new Promise<void>((resolve) => {
        socket.addEventListener("open", () => {
          reconnectDelayMs = 1_000;
          structuredLog({
            level: "info",
            event: "slack_socket_connected",
            request_id: null,
            error_code: null,
          });
        });

        socket.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          let envelope: SlackSocketEnvelope;
          try {
            envelope = JSON.parse(event.data) as SlackSocketEnvelope;
          } catch {
            structuredLog({
              level: "warn",
              event: "slack_socket_message_rejected",
              request_id: null,
              error_code: "slack_envelope_invalid_json",
            });
            return;
          }

          if (
            envelope.type !== "slash_commands" ||
            typeof envelope.envelope_id !== "string"
          ) {
            return;
          }

          socket.send(
            JSON.stringify({ envelope_id: envelope.envelope_id }),
          );

          if (!isSlashCommand(envelope.payload)) {
            structuredLog({
              level: "warn",
              event: "slack_slash_command_rejected",
              request_id: null,
              error_code: "slack_slash_command_invalid",
            });
            return;
          }

          if (!replayGuard.accept(envelope.envelope_id)) {
            structuredLog({
              level: "warn",
              event: "slack_slash_command_duplicate",
              request_id: null,
              error_code: "slack_envelope_duplicate",
            });
            return;
          }

          const requestId = createHermesRuntimeRequestId();
          void integration
            .handleSlashCommand(
              envelope.payload,
              () => undefined,
              { requestId },
            )
            .catch(() => {
              structuredLog({
                level: "error",
                event: "slack_interactive_response_unhandled_failure",
                request_id: requestId,
                error_code: "slack_interactive_response_unhandled_failure",
              });
            });
        });

        socket.addEventListener("error", () => {
          structuredLog({
            level: "warn",
            event: "slack_socket_error",
            request_id: null,
            error_code: "slack_socket_error",
          });
        });

        socket.addEventListener("close", () => {
          activeSocket = null;
          resolve();
        });
      });
    } catch {
      structuredLog({
        level: "warn",
        event: "slack_socket_connect_failed",
        request_id: null,
        error_code: "slack_socket_connect_failed",
      });
    }

    if (!stopped) {
      await wait(reconnectDelayMs);
      reconnectDelayMs = Math.min(
        reconnectDelayMs * 2,
        MAX_RECONNECT_DELAY_MS,
      );
    }
  }
}

run().catch(() => {
  structuredLog({
    level: "error",
    event: "slack_socket_runtime_failed",
    request_id: null,
    error_code: "slack_socket_runtime_failed",
  });
  process.exitCode = 1;
});
