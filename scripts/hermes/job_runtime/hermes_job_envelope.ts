import { randomUUID } from "node:crypto";

export const HERMES_JOB_DEFAULT_TTL_MS = 5 * 60 * 1000;
export const HERMES_JOB_MAX_MESSAGE_CHARS = 500;

export type HermesJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "retry_scheduled"
  | "cancelled"
  | "expired";

export type HermesJobType = "hermes_chat";
export type HermesJobPriority = "interactive";
export type HermesJobExecutionTarget = "unassigned";

export type HermesJobPayload = {
  message: string;
  include_readonly_context: boolean;
};

export type HermesJobRuntimeMetadata = {
  request_id: string;
  job_id: string;
  task_type: "interactive_chat";
  priority: HermesJobPriority;
  execution_mode: "queued";
  model_class: "lightweight";
  execution_target: HermesJobExecutionTarget;
  status: HermesJobStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  attempt: 0;
  max_attempts: 1;
  retry_enabled: false;
  queue_persisted: false;
  worker_assigned: false;
};

export type HermesJobEnvelope = {
  schema_version: "hermes.job.v1";
  job_type: HermesJobType;
  payload: HermesJobPayload;
  runtime: HermesJobRuntimeMetadata;
  safety: {
    secret_in_payload: false;
    credentials_in_payload: false;
    db_connection_in_payload: false;
    business_db_write_allowed: false;
    proposal_write_allowed: false;
    queue_write_performed: false;
    worker_execution_performed: false;
    fail_closed: true;
  };
};

type HermesJobPayloadInput = Record<string, unknown>;

const ALLOWED_TRANSITIONS: Readonly<Record<HermesJobStatus, readonly HermesJobStatus[]>> = {
  queued: ["running", "cancelled", "expired"],
  running: ["succeeded", "failed", "cancelled", "expired"],
  succeeded: [],
  failed: [],
  retry_scheduled: ["cancelled", "expired"],
  cancelled: [],
  expired: [],
};

function parseServerOwnedIso(value: string): { iso: string; milliseconds: number } {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("job_timestamp_invalid");
  }
  return { iso: new Date(milliseconds).toISOString(), milliseconds };
}

export function createHermesJobPayload(
  input: HermesJobPayloadInput,
): HermesJobPayload {
  if (typeof input.message !== "string") {
    throw new Error("job_message_must_be_string");
  }

  const message = input.message.trim();
  if (message.length === 0) throw new Error("job_message_empty");
  if (message.length > HERMES_JOB_MAX_MESSAGE_CHARS) {
    throw new Error("job_message_too_long");
  }
  if (/[\r\n]/u.test(message)) throw new Error("job_message_multiline_not_allowed");
  if (typeof input.include_readonly_context !== "boolean") {
    throw new Error("job_include_readonly_context_must_be_boolean");
  }

  return {
    message,
    include_readonly_context: input.include_readonly_context,
  };
}

export function createHermesJobEnvelope(input: {
  requestId: string;
  payload: HermesJobPayloadInput;
  jobIdFactory?: () => string;
  nowIsoFactory?: () => string;
}): HermesJobEnvelope {
  const jobId = (input.jobIdFactory ?? randomUUID)();
  if (jobId === input.requestId) throw new Error("job_id_must_differ_from_request_id");

  const created = parseServerOwnedIso(
    (input.nowIsoFactory ?? (() => new Date().toISOString()))(),
  );
  const expiresAt = new Date(
    created.milliseconds + HERMES_JOB_DEFAULT_TTL_MS,
  ).toISOString();

  return {
    schema_version: "hermes.job.v1",
    job_type: "hermes_chat",
    payload: createHermesJobPayload(input.payload),
    runtime: {
      request_id: input.requestId,
      job_id: jobId,
      task_type: "interactive_chat",
      priority: "interactive",
      execution_mode: "queued",
      model_class: "lightweight",
      execution_target: "unassigned",
      status: "queued",
      created_at: created.iso,
      updated_at: created.iso,
      expires_at: expiresAt,
      attempt: 0,
      max_attempts: 1,
      retry_enabled: false,
      queue_persisted: false,
      worker_assigned: false,
    },
    safety: {
      secret_in_payload: false,
      credentials_in_payload: false,
      db_connection_in_payload: false,
      business_db_write_allowed: false,
      proposal_write_allowed: false,
      queue_write_performed: false,
      worker_execution_performed: false,
      fail_closed: true,
    },
  };
}

export function canTransitionHermesJobStatus(
  from: HermesJobStatus,
  to: HermesJobStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isHermesJobTerminalStatus(status: HermesJobStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled" || status === "expired";
}

export function transitionHermesJobEnvelope(
  envelope: HermesJobEnvelope,
  to: HermesJobStatus,
  nowIso: string,
): HermesJobEnvelope {
  if (!canTransitionHermesJobStatus(envelope.runtime.status, to)) {
    throw new Error(
      `job_status_transition_not_allowed:${envelope.runtime.status}:${to}`,
    );
  }

  const updated = parseServerOwnedIso(nowIso);
  return {
    ...envelope,
    runtime: {
      ...envelope.runtime,
      status: to,
      updated_at: updated.iso,
    },
  };
}

export function isHermesJobExpired(
  envelope: HermesJobEnvelope,
  nowIso: string,
): boolean {
  const now = parseServerOwnedIso(nowIso);
  return now.milliseconds >= Date.parse(envelope.runtime.expires_at);
}
