import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  loadFarmOsRtxWorkerConfig,
  type FarmOsRtxRuntimeMode,
  runFarmOsRtxRuntimeMode,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";

type CliArguments = {
  job: string;
  output: string;
  model: string;
  mode: FarmOsRtxRuntimeMode;
  modelArtifactId?: string;
  quantization?: string;
};

function parseArguments(argv: string[]): CliArguments {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--job",
    "--output",
    "--model",
    "--mode",
    "--model-artifact-id",
    "--quantization",
  ]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key) || value === undefined || value.trim() === "") {
      throw new Error("RTX_CLI_ARGUMENT_INVALID");
    }
    if (values.has(key)) throw new Error("RTX_CLI_ARGUMENT_DUPLICATE");
    values.set(key, value);
  }
  const job = values.get("--job");
  const output = values.get("--output");
  const model = values.get("--model");
  const mode = values.get("--mode");
  if (!job || !output || !model || !mode) {
    throw new Error("RTX_CLI_ARGUMENT_REQUIRED");
  }
  if (
    ![
      "night-two-pass",
      "night-analysis-only",
      "night-structured-emit-only",
      "day-fast",
    ].includes(mode)
  ) {
    throw new Error("RTX_CLI_MODE_INVALID");
  }
  return {
    job,
    output,
    model,
    mode: mode as FarmOsRtxRuntimeMode,
    modelArtifactId: values.get("--model-artifact-id"),
    quantization: values.get("--quantization"),
  };
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const jobPath = resolve(args.job);
  const outputPath = resolve(args.output);
  const rawJob = readFileSync(jobPath, "utf8");
  let job: unknown;
  try {
    job = JSON.parse(rawJob);
  } catch {
    throw new Error("RTX_JOB_INVALID_JSON");
  }
  const config = loadFarmOsRtxWorkerConfig(
    {
      FARMOS_RTX_LM_STUDIO_BASE_URL:
        process.env.FARMOS_RTX_LM_STUDIO_BASE_URL,
      FARMOS_RTX_LM_STUDIO_API_TOKEN:
        process.env.FARMOS_RTX_LM_STUDIO_API_TOKEN,
      FARMOS_RTX_MODEL_ID: args.model,
      FARMOS_RTX_REQUEST_TIMEOUT_MS:
        process.env.FARMOS_RTX_REQUEST_TIMEOUT_MS,
      FARMOS_RTX_WORKER_MODE: process.env.FARMOS_RTX_WORKER_MODE,
    },
    {
      modelArtifactId: args.modelArtifactId,
      quantization: args.quantization,
    },
  );
  const result = await runFarmOsRtxRuntimeMode({
    mode: args.mode,
    job,
    config,
  });
  const diagnostics = {
    mode: args.mode,
    status: result.status,
    errors: result.errors,
    safety: result.safety,
    pass_1: "pass_1" in result ? result.pass_1 : null,
    pass_2: "pass_2" in result ? result.pass_2 : null,
    handoff_utf8_bytes:
      "handoff_utf8_bytes" in result ? result.handoff_utf8_bytes : null,
    analysis_ready: result.status === "analysis_ready",
    candidate_ready: result.status === "candidate_ready",
    reasoning_content_saved: false,
  };
  process.stdout.write(`${JSON.stringify(diagnostics)}\n`);
  if (
    result.status === "analysis_ready" ||
    result.status === "policy_only_not_implemented"
  ) {
    if (result.status === "policy_only_not_implemented") process.exitCode = 1;
    return;
  }
  if (result.status !== "candidate_ready" || !("candidate" in result)) {
    process.exitCode = 1;
    return;
  }
  writeFileSync(outputPath, `${JSON.stringify(result.candidate, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "RTX_CLI_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
