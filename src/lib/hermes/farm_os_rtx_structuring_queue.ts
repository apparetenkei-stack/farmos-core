import { createHash } from "node:crypto";

import {
  FARM_OS_RTX_JOB_CONTRACT,
  FARM_OS_RTX_LEASE_SECONDS,
  FARM_OS_RTX_MAXIMUM_ATTEMPTS,
  FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  parseFarmOsRtxStructuringJob,
  validateFarmOsRtxCandidateGrounding,
  type FarmOsRtxStructuringCandidate,
  type FarmOsRtxStructuringJob,
} from "./farm_os_rtx_structuring_contract";

export type FarmOsRtxJobStatus =
  | "queued"
  | "leased"
  | "completed"
  | "retry_pending"
  | "review_required"
  | "failed"
  | "cancelled";

export type FarmOsRtxJobStateEvent = {
  event_id: string;
  job_id: string;
  status: FarmOsRtxJobStatus;
  attempt: number;
  available_at: string;
  lease_owner: string | null;
  lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failure_code: string | null;
  sequence: number;
};

export type FarmOsRtxPersistedCandidate = {
  candidate_id: string;
  job_id: string;
  source_snapshot_id: string;
  source_content_hash: string;
  model_provenance: FarmOsRtxStructuringCandidate["model_provenance"];
  candidate_json: FarmOsRtxStructuringCandidate | null;
  validation_result: "accepted_candidate" | "rejected";
  validation_errors: string[];
  created_at: string;
  state: "candidate" | "review_required" | "rejected" | "superseded";
  business_sot: false;
  projection_active_version: false;
  automatically_promoted: false;
  worker_output_untrusted: true;
};

export type FarmOsRtxQueueState = {
  jobs: FarmOsRtxStructuringJob[];
  events: FarmOsRtxJobStateEvent[];
  candidates: FarmOsRtxPersistedCandidate[];
  next_sequence: number;
};

export type FarmOsRtxQueueResult = {
  status:
    | "created"
    | "duplicate_ignored"
    | "production_source_unavailable"
    | "leased"
    | "worker_unavailable"
    | "candidate_saved"
    | "candidate_rejected"
    | "lease_extended"
    | "failure_recorded"
    | "no_jobs";
  jobs: FarmOsRtxStructuringJob[];
  candidate: FarmOsRtxPersistedCandidate | null;
  writes: { jobs: number; events: number; candidates: number };
  safety: {
    business_sot_changed: false;
    active_projection_modified: false;
    worker_database_access_granted: false;
    farming_app_write_performed: false;
    candidate_auto_promoted: false;
    fallback_model_used: false;
  };
};

const WORKER_ID = /^worker_[a-zA-Z0-9._:-]{1,120}$/u;
const clone = <T>(value: T): T => structuredClone(value);

export function createEmptyFarmOsRtxQueueState(): FarmOsRtxQueueState {
  return { jobs: [], events: [], candidates: [], next_sequence: 1 };
}

function safety(): FarmOsRtxQueueResult["safety"] {
  return {
    business_sot_changed: false,
    active_projection_modified: false,
    worker_database_access_granted: false,
    farming_app_write_performed: false,
    candidate_auto_promoted: false,
    fallback_model_used: false,
  };
}

function currentEvent(
  state: FarmOsRtxQueueState,
  jobId: string,
): FarmOsRtxJobStateEvent | null {
  return state.events.filter((event) => event.job_id === jobId)
    .sort((left, right) => left.sequence - right.sequence).at(-1) ?? null;
}

function appendEvent(
  state: FarmOsRtxQueueState,
  input: Omit<FarmOsRtxJobStateEvent, "event_id" | "sequence">,
): FarmOsRtxJobStateEvent {
  const sequence = state.next_sequence++;
  const event = {
    ...input,
    event_id: `rtx_job_event_${sequence}`,
    sequence,
  };
  state.events.push(event);
  return event;
}

function result(
  status: FarmOsRtxQueueResult["status"],
  input: Partial<Pick<FarmOsRtxQueueResult, "jobs" | "candidate" | "writes">> =
    {},
): FarmOsRtxQueueResult {
  return {
    status,
    jobs: input.jobs ?? [],
    candidate: input.candidate ?? null,
    writes: input.writes ?? { jobs: 0, events: 0, candidates: 0 },
    safety: safety(),
  };
}

function candidateId(jobId: string, candidate: unknown): string {
  return `rtx_candidate_${
    createHash("sha256").update(JSON.stringify({ jobId, candidate })).digest(
      "hex",
    ).slice(0, 32)
  }`;
}

export class FarmOsInMemoryRtxStructuringQueue {
  private state: FarmOsRtxQueueState;

  constructor(initial: FarmOsRtxQueueState = createEmptyFarmOsRtxQueueState()) {
    this.state = clone(initial);
  }

  snapshot(): FarmOsRtxQueueState {
    return clone(this.state);
  }

  createProductionJob(): FarmOsRtxQueueResult {
    return result("production_source_unavailable");
  }

  createFixtureJob(value: unknown): FarmOsRtxQueueResult {
    const parsed = parseFarmOsRtxStructuringJob(value);
    if (!parsed.valid) return result("production_source_unavailable");
    const job = parsed.value;
    const duplicate = this.state.jobs.some((existing) =>
      existing.source_snapshot_id === job.source_snapshot_id &&
      existing.contract_version === FARM_OS_RTX_JOB_CONTRACT
    );
    if (duplicate) return result("duplicate_ignored");
    this.state.jobs.push(clone(job));
    appendEvent(this.state, {
      job_id: job.job_id,
      status: "queued",
      attempt: 0,
      available_at: job.not_before,
      lease_owner: null,
      lease_expires_at: null,
      created_at: job.created_at,
      updated_at: job.created_at,
      completed_at: null,
      failure_code: null,
    });
    return result("created", {
      jobs: [clone(job)],
      writes: { jobs: 1, events: 1, candidates: 0 },
    });
  }

  claim(input: {
    authenticated_worker_id: string;
    now: string;
    maximum_jobs: number;
  }): FarmOsRtxQueueResult {
    if (
      !WORKER_ID.test(input.authenticated_worker_id) ||
      !Number.isSafeInteger(input.maximum_jobs) ||
      input.maximum_jobs < 1 ||
      input.maximum_jobs > FARM_OS_RTX_MAX_JOBS_PER_CLAIM ||
      !Number.isFinite(Date.parse(input.now))
    ) return result("no_jobs");
    this.recoverExpired(input.now);
    const claimable = this.state.jobs.filter((job) => {
      const event = currentEvent(this.state, job.job_id);
      return event !== null &&
        (event.status === "queued" || event.status === "retry_pending") &&
        Date.parse(event.available_at) <= Date.parse(input.now) &&
        event.attempt < job.maximum_attempts;
    }).sort((left, right) =>
      left.created_at < right.created_at
        ? -1
        : left.created_at > right.created_at
        ? 1
        : left.job_id < right.job_id
        ? -1
        : 1
    ).slice(0, input.maximum_jobs);
    for (const job of claimable) {
      const prior = currentEvent(this.state, job.job_id);
      appendEvent(this.state, {
        job_id: job.job_id,
        status: "leased",
        attempt: (prior?.attempt ?? 0) + 1,
        available_at: prior?.available_at ?? job.not_before,
        lease_owner: input.authenticated_worker_id,
        lease_expires_at: new Date(
          Date.parse(input.now) + FARM_OS_RTX_LEASE_SECONDS * 1000,
        ).toISOString(),
        created_at: input.now,
        updated_at: input.now,
        completed_at: null,
        failure_code: null,
      });
    }
    return claimable.length === 0
      ? result("no_jobs")
      : result("leased", {
        jobs: clone(claimable),
        writes: { jobs: 0, events: claimable.length, candidates: 0 },
      });
  }

  extendLease(input: {
    authenticated_worker_id: string;
    job_id: string;
    now: string;
    lease_expires_at: string;
  }): FarmOsRtxQueueResult {
    const job = this.state.jobs.find((candidate) =>
      candidate.job_id === input.job_id
    );
    const current = job ? currentEvent(this.state, job.job_id) : null;
    const valid = WORKER_ID.test(input.authenticated_worker_id) &&
      Number.isFinite(Date.parse(input.now)) &&
      Number.isFinite(Date.parse(input.lease_expires_at)) &&
      Date.parse(input.lease_expires_at) > Date.parse(input.now) &&
      current?.status === "leased" &&
      current.lease_owner === input.authenticated_worker_id &&
      current.lease_expires_at !== null &&
      Date.parse(input.now) < Date.parse(current.lease_expires_at);
    if (!job || !current || !valid) return result("no_jobs");
    appendEvent(this.state, {
      job_id: job.job_id,
      status: "leased",
      attempt: current.attempt,
      available_at: current.available_at,
      lease_owner: input.authenticated_worker_id,
      lease_expires_at: input.lease_expires_at,
      created_at: input.now,
      updated_at: input.now,
      completed_at: null,
      failure_code: null,
    });
    return result("lease_extended", {
      jobs: [clone(job)],
      writes: { jobs: 0, events: 1, candidates: 0 },
    });
  }

  reportFailure(input: {
    authenticated_worker_id: string;
    job_id: string;
    now: string;
    failure_code: string;
    retryable: boolean;
  }): FarmOsRtxQueueResult {
    const job = this.state.jobs.find((candidate) =>
      candidate.job_id === input.job_id
    );
    const current = job ? currentEvent(this.state, job.job_id) : null;
    const leaseValid = job && current?.status === "leased" &&
      current.lease_owner === input.authenticated_worker_id &&
      current.lease_expires_at !== null &&
      Number.isFinite(Date.parse(input.now)) &&
      Date.parse(input.now) < Date.parse(current.lease_expires_at);
    if (!job || !current || !leaseValid) return result("no_jobs");
    const retry = input.retryable && current.attempt < job.maximum_attempts;
    appendEvent(this.state, {
      job_id: job.job_id,
      status: retry ? "retry_pending" : "failed",
      attempt: current.attempt,
      available_at: input.now,
      lease_owner: null,
      lease_expires_at: null,
      created_at: input.now,
      updated_at: input.now,
      completed_at: retry ? null : input.now,
      failure_code: input.failure_code,
    });
    return result("failure_recorded", {
      jobs: [clone(job)],
      writes: { jobs: 0, events: 1, candidates: 0 },
    });
  }

  recoverExpired(now: string): void {
    if (!Number.isFinite(Date.parse(now))) return;
    for (const job of this.state.jobs) {
      const current = currentEvent(this.state, job.job_id);
      if (
        current?.status !== "leased" ||
        current.lease_expires_at === null ||
        Date.parse(current.lease_expires_at) > Date.parse(now)
      ) continue;
      const failed = current.attempt >= job.maximum_attempts;
      appendEvent(this.state, {
        job_id: job.job_id,
        status: failed ? "failed" : "retry_pending",
        attempt: current.attempt,
        available_at: now,
        lease_owner: null,
        lease_expires_at: null,
        created_at: now,
        updated_at: now,
        completed_at: failed ? now : null,
        failure_code: failed ? "MAXIMUM_ATTEMPTS_EXCEEDED" : "LEASE_EXPIRED",
      });
    }
  }

  workerUnavailable(input: { job_id: string; now: string }): FarmOsRtxQueueResult {
    const job = this.state.jobs.find((candidate) =>
      candidate.job_id === input.job_id
    );
    const current = job ? currentEvent(this.state, job.job_id) : null;
    if (!job || !current || current.status === "completed") {
      return result("worker_unavailable");
    }
    if (current.status === "leased") {
      appendEvent(this.state, {
        job_id: job.job_id,
        status: "retry_pending",
        attempt: current.attempt,
        available_at: input.now,
        lease_owner: null,
        lease_expires_at: null,
        created_at: input.now,
        updated_at: input.now,
        completed_at: null,
        failure_code: "WORKER_UNAVAILABLE",
      });
      return result("worker_unavailable", {
        writes: { jobs: 0, events: 1, candidates: 0 },
      });
    }
    return result("worker_unavailable");
  }

  saveCandidate(input: {
    authenticated_worker_id: string;
    value: unknown;
    now: string;
  }): FarmOsRtxQueueResult {
    if (!WORKER_ID.test(input.authenticated_worker_id)) {
      return result("candidate_rejected");
    }
    const raw = input.value as Record<string, unknown>;
    const job = this.state.jobs.find((candidate) =>
      candidate.job_id === raw?.job_id
    );
    const current = job ? currentEvent(this.state, job.job_id) : null;
    const leaseValid = job && current?.status === "leased" &&
      current.lease_owner === input.authenticated_worker_id &&
      current.lease_expires_at !== null &&
      Date.parse(input.now) < Date.parse(current.lease_expires_at);
    const validation = job
      ? validateFarmOsRtxCandidateGrounding({ job, candidate: input.value })
      : { valid: false as const, value: null, errors: ["JOB_NOT_FOUND"] };
    const verificationState = validation.valid
      ? validation.value.verification_state
      : "rejected";
    const accepted = Boolean(
      leaseValid && validation.valid && verificationState !== "rejected",
    );
    const persisted: FarmOsRtxPersistedCandidate = {
      candidate_id: candidateId(job?.job_id ?? "unknown_job", input.value),
      job_id: job?.job_id ?? "unknown_job",
      source_snapshot_id: job?.source_snapshot_id ?? "unknown_snapshot",
      source_content_hash: job?.source_content_hash ?? "0".repeat(64),
      model_provenance: validation.valid
        ? validation.value.model_provenance
        : {
          model_id: "rejected",
          model_artifact_id: "rejected",
          quantization: "rejected",
          runtime_id: "rejected",
          prompt_template_version: "rejected",
          structured_output_schema_version: "rejected",
        },
      candidate_json: validation.valid ? validation.value : null,
      validation_result: accepted ? "accepted_candidate" : "rejected",
      validation_errors: [
        ...validation.errors,
        ...(leaseValid ? [] : ["LEASE_INVALID"]),
        ...(verificationState === "rejected" ? ["WORKER_REJECTED"] : []),
      ],
      created_at: input.now,
      state: accepted && verificationState === "review_required"
        ? "review_required"
        : accepted
        ? "candidate"
        : "rejected",
      business_sot: false,
      projection_active_version: false,
      automatically_promoted: false,
      worker_output_untrusted: true,
    };
    this.state.candidates.push(persisted);
    if (job && current) {
      appendEvent(this.state, {
        job_id: job.job_id,
        status: accepted && verificationState === "candidate"
          ? "completed"
          : "review_required",
        attempt: current.attempt,
        available_at: current.available_at,
        lease_owner: null,
        lease_expires_at: null,
        created_at: input.now,
        updated_at: input.now,
        completed_at:
          accepted && verificationState === "candidate" ? input.now : null,
        failure_code: accepted ? null : "CANDIDATE_VALIDATION_FAILED",
      });
    }
    return result(accepted ? "candidate_saved" : "candidate_rejected", {
      candidate: clone(persisted),
      writes: {
        jobs: 0,
        events: job && current ? 1 : 0,
        candidates: 1,
      },
    });
  }
}
