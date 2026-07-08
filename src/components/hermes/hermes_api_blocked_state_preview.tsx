"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type HermesApiPreviewEnvelope = Record<string, unknown>;

const API_ENDPOINT = "/api/hermes/chat" as const;
const MAX_MESSAGE_CHARS = 500;

const DISPLAY_KEYS = [
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
] as const;

const NO_WRITE_KEYS = [
  "db_read_performed",
  "db_write_performed",
  "prompt_sent",
  "proposal_created",
  "proposal_saved",
  "proposal_apply_performed",
  "chat_history_saved",
  "audit_record_saved",
  "app_db_write_performed",
] as const;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function normalizeEnvelope(
  envelope: HermesApiPreviewEnvelope | null,
): HermesApiPreviewEnvelope | null {
  if (!envelope) return null;

  return {
    ...envelope,
    ui_connected: true,
    server_action_used: envelope.server_action_used === true,
    form_action_used: envelope.form_action_used === true,
    response_envelope_normalized:
      envelope.response_envelope_normalized === true,
  };
}

export function HermesApiBlockedStatePreview() {
  const [message, setMessage] = useState("hello hermes");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [responseEnvelope, setResponseEnvelope] =
    useState<HermesApiPreviewEnvelope | null>(null);

  const displayEnvelope = useMemo(
    () => normalizeEnvelope(responseEnvelope),
    [responseEnvelope],
  );

  const previewRequestBody = useMemo(
    () => ({
      message: message.trim() || "<single-line message>",
      includeReadonlyContext: false,
      provider: "mock",
    }),
    [message],
  );

  async function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageForRequest = message.trim();

    setErrorMessage(null);
    setHttpStatus(null);
    setResponseEnvelope(null);

    if (!messageForRequest) {
      setErrorMessage("message is required");
      return;
    }

    if (messageForRequest.length > MAX_MESSAGE_CHARS) {
      setErrorMessage("message must be 500 characters or fewer");
      return;
    }

    if (/[\r\n]/.test(messageForRequest)) {
      setErrorMessage("message must be single-line");
      return;
    }

    const requestBody = {
      message: messageForRequest,
      includeReadonlyContext: false,
      provider: "mock",
    };

    setSubmitting(true);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const json = (await response.json()) as HermesApiPreviewEnvelope;

      setHttpStatus(response.status);
      setResponseEnvelope(json);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "unknown fetch error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Hermes API blocked-state preview</h2>
      <p>
        Day70 preview only. This form posts to <code>{API_ENDPOINT}</code> and
        displays the blocked response envelope. It does not save chat, create
        proposals, apply proposals, or write audit records.
      </p>

      <form onSubmit={submitPreview}>
        <div>
          <label htmlFor="hermes-api-preview-message">Message</label>
          <input
            id="hermes-api-preview-message"
            name="message"
            type="text"
            value={message}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <dl>
          <div>
            <dt>provider</dt>
            <dd>
              <code>mock</code>
            </dd>
          </div>
          <div>
            <dt>includeReadonlyContext</dt>
            <dd>
              <code>false</code>
            </dd>
          </div>
          <div>
            <dt>max_message_chars</dt>
            <dd>
              <code>{MAX_MESSAGE_CHARS}</code>
            </dd>
          </div>
        </dl>

        <button type="submit" disabled={submitting}>
          {submitting ? "Checking blocked state..." : "Check blocked state"}
        </button>
      </form>

      <details>
        <summary>Request body preview</summary>
        <pre>{JSON.stringify(previewRequestBody, null, 2)}</pre>
      </details>

      {errorMessage ? (
        <p>
          <strong>Preview error:</strong> <code>{errorMessage}</code>
        </p>
      ) : null}

      <section>
        <h3>Connection result</h3>
        <dl>
          <div>
            <dt>http_status</dt>
            <dd>
              <code>{httpStatus ?? "not_checked"}</code>
            </dd>
          </div>
        </dl>

        {displayEnvelope ? (
          <>
            <dl>
              {DISPLAY_KEYS.map((key) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    <code>{formatValue(displayEnvelope[key])}</code>
                  </dd>
                </div>
              ))}
            </dl>

            <h4>No-write flags</h4>
            <dl>
              {NO_WRITE_KEYS.map((key) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    <code>{formatValue(displayEnvelope[key])}</code>
                  </dd>
                </div>
              ))}
            </dl>

            <details>
              <summary>Raw normalized response envelope</summary>
              <pre>{JSON.stringify(displayEnvelope, null, 2)}</pre>
            </details>
          </>
        ) : (
          <p>
            No API response yet. Submit once with the boundary flag disabled to
            confirm <code>status=blocked</code>.
          </p>
        )}
      </section>
    </section>
  );
}
