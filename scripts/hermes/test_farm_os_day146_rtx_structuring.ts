import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  parseFarmOsRtxStructuringCandidate,
  parseFarmOsRtxStructuringJob,
  validateFarmOsRtxCandidateGrounding,
} from "../../src/lib/hermes/farm_os_rtx_structuring_contract";
import {
  FarmOsInMemoryRtxStructuringQueue,
} from "../../src/lib/hermes/farm_os_rtx_structuring_queue";

type FixtureDocument = {
  job: Record<string, unknown>;
  valid_candidate: Record<string, unknown>;
  fixtures: Array<{
    id: string;
    mutation: Record<string, unknown>;
    expected: string;
  }>;
};
const document = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
  "utf8",
)) as FixtureDocument;
assert.equal(
  new Set(document.fixtures.map((fixture) => fixture.id)).size,
  document.fixtures.length,
);

const parsedJob = parseFarmOsRtxStructuringJob(document.job);
assert.equal(parsedJob.valid, true);
assert.equal(
  parseFarmOsRtxStructuringJob({ ...document.job, prompt: "arbitrary" }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringJob({ ...document.job, job_id: 123 }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringJob({
    ...document.job,
    allowed_source: { fields: { work_note: null, observation: null } },
  }).valid,
  false,
);
if (!parsedJob.valid) throw new Error("fixture job invalid");
const job = parsedJob.value;
assert.deepEqual(Object.keys(job.allowed_source.fields).sort(), [
  "observation",
  "work_note",
]);
for (
  const forbidden of [
    "business_date",
    "recorded_at",
    "source_updated_at",
    "started_at",
    "ended_at",
    "duration",
    "quantity",
    "unit",
    "field_reference",
    "crop_cycle_reference",
    "work_type_reference",
  ]
) {
  assert.equal(Object.hasOwn(job.allowed_source.fields, forbidden), false);
}

const parsedCandidate = parseFarmOsRtxStructuringCandidate(
  document.valid_candidate,
);
assert.equal(parsedCandidate.valid, true);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    unknown: true,
  }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    source_record_id: true,
  }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    model_provenance: {
      ...(document.valid_candidate.model_provenance as Record<string, unknown>),
      model_id: 42,
    },
  }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    confidence: 1.01,
  }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    verification_state: "active",
  }).valid,
  false,
);
assert.equal(
  parseFarmOsRtxStructuringCandidate({
    ...document.valid_candidate,
    summary: "肥料 20kg",
  }).valid,
  false,
);

for (const fixture of document.fixtures.slice(0, 4)) {
  const candidate = structuredClone(document.valid_candidate);
  if (fixture.mutation.summary) candidate.summary = fixture.mutation.summary;
  if (fixture.mutation.source_content_hash) {
    candidate.source_content_hash = fixture.mutation.source_content_hash;
  }
  if (fixture.mutation.evidence_excerpt) {
    candidate.evidence = [{
      source_field: "work_note",
      excerpt: fixture.mutation.evidence_excerpt,
    }];
  }
  const validation = validateFarmOsRtxCandidateGrounding({ job, candidate });
  if (fixture.id === "valid_candidate") {
    assert.equal(validation.valid, true);
  } else {
    assert.equal(validation.valid, false);
    if (!validation.valid) assert.ok(validation.errors.includes(fixture.expected));
  }
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  assert.equal(queue.createProductionJob().status,
    "production_source_unavailable");
  assert.equal(queue.createFixtureJob(job).status, "created");
  assert.equal(queue.createFixtureJob(job).status, "duplicate_ignored");
  const firstLease = queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  assert.equal(firstLease.status, "leased");
  assert.equal(queue.claim({
    authenticated_worker_id: "worker_fixture_b",
    now: "2026-07-28T22:01:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  }).status, "no_jobs");
  const unavailable = queue.workerUnavailable({
    job_id: job.job_id,
    now: "2026-07-28T22:02:00+09:00",
  });
  assert.equal(unavailable.status, "worker_unavailable");
  assert.equal(unavailable.safety.active_projection_modified, false);
  assert.equal(unavailable.safety.fallback_model_used, false);
  assert.equal(queue.snapshot().events.at(-1)?.status, "retry_pending");
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  queue.createFixtureJob(job);
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  queue.recoverExpired("2026-07-28T22:11:00+09:00");
  assert.equal(queue.snapshot().events.at(-1)?.status, "retry_pending");
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:11:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  queue.recoverExpired("2026-07-28T22:22:00+09:00");
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:22:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  queue.recoverExpired("2026-07-28T22:33:00+09:00");
  assert.equal(queue.snapshot().events.at(-1)?.status, "failed");
  assert.equal(
    queue.snapshot().events.at(-1)?.failure_code,
    "MAXIMUM_ATTEMPTS_EXCEEDED",
  );
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  queue.createFixtureJob(job);
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const saved = queue.saveCandidate({
    authenticated_worker_id: "worker_fixture_a",
    value: document.valid_candidate,
    now: "2026-07-28T22:05:00+09:00",
  });
  assert.equal(saved.status, "candidate_saved");
  assert.equal(saved.candidate?.business_sot, false);
  assert.equal(saved.candidate?.projection_active_version, false);
  assert.equal(saved.candidate?.automatically_promoted, false);
  assert.equal(saved.candidate?.worker_output_untrusted, true);
  assert.equal(queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:06:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  }).status, "no_jobs");
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  queue.createFixtureJob(job);
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const disagreement = {
    ...document.valid_candidate,
    verification_state: "review_required",
  };
  const saved = queue.saveCandidate({
    authenticated_worker_id: "worker_fixture_a",
    value: disagreement,
    now: "2026-07-28T22:05:00+09:00",
  });
  assert.equal(saved.candidate?.state, "review_required");
  assert.equal(queue.snapshot().events.at(-1)?.status, "review_required");
  assert.equal(saved.safety.candidate_auto_promoted, false);
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  queue.createFixtureJob(job);
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const rejected = queue.saveCandidate({
    authenticated_worker_id: "worker_fixture_a",
    value: { ...document.valid_candidate, verification_state: "rejected" },
    now: "2026-07-28T22:05:00+09:00",
  });
  assert.equal(rejected.status, "candidate_rejected");
  assert.equal(rejected.candidate?.state, "rejected");
  assert.equal(queue.snapshot().events.at(-1)?.status, "review_required");
}

{
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  queue.createFixtureJob(job);
  queue.claim({
    authenticated_worker_id: "worker_fixture_a",
    now: "2026-07-28T22:00:00+09:00",
    maximum_jobs: FARM_OS_RTX_MAX_JOBS_PER_CLAIM,
  });
  const atExpiry = queue.saveCandidate({
    authenticated_worker_id: "worker_fixture_a",
    value: document.valid_candidate,
    now: "2026-07-28T22:10:00+09:00",
  });
  assert.equal(atExpiry.status, "candidate_rejected");
  assert.ok(atExpiry.candidate?.validation_errors.includes("LEASE_INVALID"));
}

console.log("farm_os_day146_rtx_structuring: PASS");
