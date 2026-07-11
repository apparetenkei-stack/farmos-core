import { runHermesApiChatMinimalBoundary } from "../../src/app/api/hermes/chat/route";
import type { HermesRuntimeNormalizedStatus } from "./llm_runtime/hermes_runtime_contract";

type BaselineProvider = "mock" | "ollama";

function readProvider(value: string | undefined): BaselineProvider {
  return value === "ollama" ? "ollama" : "mock";
}

function readIterations(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "5", 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, parsed));
}

async function main(): Promise<void> {
  const provider = readProvider(process.env.HERMES_DAY96_BASELINE_PROVIDER);
  const sampleCount = readIterations(process.env.HERMES_DAY96_BASELINE_ITERATIONS);
  const durations: number[] = [];
  const statuses: Record<HermesRuntimeNormalizedStatus, number> = {
    succeeded: 0,
    rejected: 0,
    blocked: 0,
    timed_out: 0,
    failed: 0,
  };

  for (let index = 0; index < sampleCount; index += 1) {
    const result = await runHermesApiChatMinimalBoundary({
      body: {
        message: "day96 controlled operational baseline sample",
        includeReadonlyContext: false,
        provider,
      },
      env: {
        ...process.env,
        HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
        HERMES_LLM_SMOKE_TEST_ENABLED: "true",
        HERMES_LLM_PROVIDER: provider,
      },
    });
    const metadata = result.body.runtime_metadata;
    durations.push(metadata.duration_ms);
    statuses[metadata.status] += 1;
  }

  const succeededCount = statuses.succeeded;
  const failedCount = sampleCount - succeededCount;
  const durationSum = durations.reduce((sum, duration) => sum + duration, 0);

  console.log(JSON.stringify({
    baseline_type: "controlled_current_runtime_sample",
    provider,
    sample_count: sampleCount,
    succeeded_count: succeededCount,
    failed_count: failedCount,
    failure_rate: failedCount / sampleCount,
    minimum_duration_ms: Math.min(...durations),
    average_duration_ms: durationSum / sampleCount,
    maximum_duration_ms: Math.max(...durations),
    statuses,
    measured_at: new Date().toISOString(),
    historical_metrics_available: false,
    db_write_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "runtime_baseline_failed");
  process.exitCode = 1;
});
