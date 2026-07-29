import { readFileSync } from "node:fs";

import {
  loadFarmOsRtxWorkerConfig,
  runFarmOsRtxNightTwoPass,
  type FarmOsRtxTwoPassEvent,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";

const FIXTURE_URL = new URL(
  "./farm_os_day146_rtx_worker_benchmark_fixture.json",
  import.meta.url,
);

function fixedError(error: unknown): string {
  return error instanceof Error &&
      /^[A-Z][A-Z0-9_]{2,63}$/u.test(error.message)
    ? error.message
    : "RTX_STRUCTURED_EMIT_DIAGNOSTIC_FAILED";
}

async function main(): Promise<void> {
  const job: unknown = JSON.parse(readFileSync(FIXTURE_URL, "utf8"));
  const config = loadFarmOsRtxWorkerConfig(process.env);
  const events: FarmOsRtxTwoPassEvent[] = [];
  const result = await runFarmOsRtxNightTwoPass({
    job,
    config,
    onEvent: (event) => {
      events.push(event);
      process.stdout.write(`${event}\n`);
    },
  });
  const pass1Valid = events.includes("RTX_BRIDGE_PASS1_COMPLETED");
  const pass2Valid = events.includes("RTX_BRIDGE_PASS2_COMPLETED");
  const pass1Parsed = pass1Valid ||
    (result.failure?.pass === 1 && result.failure.stage === "grounding");
  const pass2Parsed = pass2Valid ||
    (result.failure?.pass === 2 && result.failure.stage === "grounding");
  const summary = {
    status: result.status,
    failure_code: result.failure?.failure_code ?? null,
    pass_1: {
      content_length: result.pass_1.content_length,
      content_non_empty: (result.pass_1.content_length ?? 0) > 0,
      reasoning_content_present: result.pass_1.reasoning_content_present,
      parser_valid: pass1Parsed,
      grounding_valid: pass1Valid,
      latency_ms: Math.round(result.pass_1.latency_ms),
      completion_tokens: result.pass_1.completion_tokens,
    },
    pass_2: result.pass_2 === null
      ? null
      : {
        content_length: result.pass_2.content_length,
        content_non_empty: (result.pass_2.content_length ?? 0) > 0,
        reasoning_content_present: result.pass_2.reasoning_content_present,
        reasoning_discarded: result.pass_2.reasoning_content_present,
        parser_valid: pass2Parsed,
        exact_contract_valid: pass2Parsed,
        grounding_valid: pass2Valid,
        latency_ms: Math.round(result.pass_2.latency_ms),
        completion_tokens: result.pass_2.completion_tokens,
      },
    candidate_ready: result.status === "candidate_ready",
    reasoning_persisted: false,
    queue_used: false,
    database_write_performed: false,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (result.status !== "candidate_ready") process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${fixedError(error)}\n`);
  process.exitCode = 1;
});
