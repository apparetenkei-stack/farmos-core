import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

import {
  assertFarmOsRtxLocalBaseUrl,
  convertFarmOsRtxModelOutputToCandidate,
  FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES,
  FARM_OS_RTX_DEFAULT_BASE_URL,
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION,
  FARM_OS_RTX_MAX_OUTPUT_TOKENS,
  FARM_OS_RTX_MODEL_OUTPUT_CONTRACT,
  FARM_OS_RTX_NIGHT_ANALYSIS_CONTRACT,
  FARM_OS_RTX_NIGHT_ANALYSIS_MAX_OUTPUT_TOKENS,
  FARM_OS_RTX_NIGHT_ANALYSIS_MAX_UTF8_BYTES,
  FARM_OS_RTX_TEMPERATURE,
  FARM_OS_RTX_WORKER_MODE,
  type FarmOsRtxWorkerConfig,
  loadFarmOsRtxWorkerConfig,
  parseFarmOsRtxModelOutput,
  parseFarmOsRtxNightAnalysis,
  runFarmOsRtxNightAnalysis,
  runFarmOsRtxNightTwoPass,
  runFarmOsRtxRuntimeMode,
  runFarmOsRtxWorker,
  validateFarmOsRtxNightAnalysisGrounding,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";
import {
  FARM_OS_RTX_AMBIGUITIES,
  FARM_OS_RTX_ARRAY_MAX_ITEMS,
  FARM_OS_RTX_CANDIDATE_CONTRACT,
  FARM_OS_RTX_CROP_STATES,
  FARM_OS_RTX_FIELD_STATES,
  FARM_OS_RTX_FOLLOW_UPS,
  FARM_OS_RTX_JOB_CONTRACT,
  FARM_OS_RTX_MISSING_INFORMATION,
  FARM_OS_RTX_WORK_CATEGORIES,
  parseFarmOsRtxStructuringCandidate,
  validateFarmOsRtxCandidateGrounding,
} from "../../src/lib/hermes/farm_os_rtx_structuring_contract";

const fixtureToken = "fixture-lm-studio-token";
const job = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_worker_benchmark_fixture.json", import.meta.url),
  "utf8",
)) as Record<string, unknown>;

const config: FarmOsRtxWorkerConfig = {
  baseUrl: FARM_OS_RTX_DEFAULT_BASE_URL,
  apiToken: fixtureToken,
  modelId: "farmos-qwen35",
  modelArtifactId: "qwen/qwen3.6-35b-a3b",
  quantization: "Q4_K_M",
  requestTimeoutMs: 1_000,
  workerMode: FARM_OS_RTX_WORKER_MODE,
};

function candidate(
  mutation: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    job_id: "worker-supplied-job",
    job_contract_version: FARM_OS_RTX_JOB_CONTRACT,
    result_contract_version: FARM_OS_RTX_CANDIDATE_CONTRACT,
    source_snapshot_id: "worker-supplied-snapshot",
    source_record_id: "worker-supplied-record",
    source_content_hash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    model_provenance: {
      model_id: "worker-supplied-model",
      model_artifact_id: "worker-supplied-artifact",
      quantization: "worker-supplied-quantization",
      runtime_id: "worker-supplied-runtime",
      prompt_template_version: "worker-supplied-prompt",
      structured_output_schema_version: "worker-supplied-schema",
    },
    semantic_classification: {
      work_category_candidates: ["observation"],
      field_state_candidates: ["state_not_available"],
      crop_state_candidates: ["state_not_available"],
      follow_up_candidates: ["human_review"],
    },
    summary: "葉の色むらを観察。",
    evidence: [{
      source_field: "work_note",
      excerpt: "葉の色むらを観察。",
    }],
    missing_information: ["field_state_missing", "crop_state_missing"],
    ambiguities: ["meaning_ambiguous", "scope_ambiguous"],
    confidence: 0.55,
    verification_state: "review_required",
    ...mutation,
  };
}

function flags<T extends readonly string[]>(
  values: T,
  selected: readonly T[number][],
): { [Key in T[number]]: boolean } {
  return Object.fromEntries(
    values.map((value) => [value, selected.includes(value)]),
  ) as { [Key in T[number]]: boolean };
}

function modelOutput(
  mutation: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    model_output_contract_version: FARM_OS_RTX_MODEL_OUTPUT_CONTRACT,
    job_id: "worker-supplied-job",
    job_contract_version: FARM_OS_RTX_JOB_CONTRACT,
    source_snapshot_id: "worker-supplied-snapshot",
    source_record_id: "worker-supplied-record",
    source_content_hash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    model_provenance: {
      model_id: "worker-supplied-model",
      model_artifact_id: "worker-supplied-artifact",
      quantization: "worker-supplied-quantization",
      runtime_id: "worker-supplied-runtime",
      prompt_template_version: "worker-supplied-prompt",
      structured_output_schema_version: "worker-supplied-schema",
    },
    semantic_classification: {
      work_category_flags: flags(FARM_OS_RTX_WORK_CATEGORIES, ["observation"]),
      field_state_flags: flags(FARM_OS_RTX_FIELD_STATES, [
        "state_not_available",
      ]),
      crop_state_flags: flags(FARM_OS_RTX_CROP_STATES, [
        "state_not_available",
      ]),
      follow_up_flags: flags(FARM_OS_RTX_FOLLOW_UPS, ["human_review"]),
    },
    summary: "葉の色むらを観察。",
    evidence: [{
      source_field: "work_note",
      excerpt: "葉の色むらを観察。",
    }],
    missing_information_flags: flags(FARM_OS_RTX_MISSING_INFORMATION, [
      "field_state_missing",
      "crop_state_missing",
    ]),
    ambiguity_flags: flags(FARM_OS_RTX_AMBIGUITIES, [
      "meaning_ambiguous",
      "scope_ambiguous",
    ]),
    confidence: 0.55,
    verification_state: "review_required",
    ...mutation,
  };
}

function nightAnalysis(
  mutation: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    analysis_contract_version: FARM_OS_RTX_NIGHT_ANALYSIS_CONTRACT,
    job_id: String(job.job_id),
    source_snapshot_id: String(job.source_snapshot_id),
    source_record_id: String(job.source_record_id),
    source_content_hash: String(job.source_content_hash),
    semantic_findings: {
      probable_work_categories: ["observation"],
      probable_field_states: ["state_not_available"],
      probable_crop_states: ["state_not_available"],
      probable_follow_ups: ["human_review"],
    },
    ambiguities: ["meaning_ambiguous", "scope_ambiguous"],
    missing_information: [
      "field_state_missing",
      "crop_state_missing",
      "work_context_missing",
    ],
    evidence: [{
      source_field: "work_note",
      excerpt: "葉の色むらを観察。",
    }],
    analysis_summary: "葉の色むらを観察。",
    recommended_verification_state: "review_required",
    confidence: 0.55,
    ...mutation,
  };
}

function completion(
  value: unknown,
  inspect?: (
    request: Record<string, unknown>,
    init: RequestInit,
  ) => void,
): typeof fetch {
  return rawCompletion(JSON.stringify(value), {}, inspect);
}

function rawCompletion(
  content: unknown,
  options: {
    finishReason?: string;
    reasoningContent?: string;
    toolCalls?: unknown[];
  } = {},
  inspect?: (
    request: Record<string, unknown>,
    init: RequestInit,
  ) => void,
): typeof fetch {
  return (async (_url, init) => {
    const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
    inspect?.(request, init ?? {});
    const message: Record<string, unknown> = { content };
    if (options.reasoningContent !== undefined) {
      message.reasoning_content = options.reasoningContent;
    }
    if (options.toolCalls !== undefined) {
      message.tool_calls = options.toolCalls;
    }
    return new Response(JSON.stringify({
      choices: [{
        finish_reason: options.finishReason ?? "stop",
        message,
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function completionSequence(
  steps: Array<{
    content: unknown;
    finishReason?: string;
    reasoningContent?: string;
  }>,
  inspect?: (
    requestIndex: number,
    request: Record<string, unknown>,
    init: RequestInit,
  ) => void,
): typeof fetch {
  let requestIndex = 0;
  return (async (_url, init) => {
    const step = steps[requestIndex];
    if (step === undefined) throw new Error("unexpected request");
    const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
    inspect?.(requestIndex, request, init ?? {});
    requestIndex += 1;
    const message: Record<string, unknown> = { content: step.content };
    if (step.reasoningContent !== undefined) {
      message.reasoning_content = step.reasoningContent;
    }
    return new Response(JSON.stringify({
      choices: [{
        finish_reason: step.finishReason ?? "stop",
        message,
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: requestIndex === 1 ? 80 : 50,
        total_tokens: requestIndex === 1 ? 180 : 150,
      },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const valid = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput(), (request, init) => {
    const headers = new Headers(init.headers);
    assert.equal(headers.get("authorization"), `Bearer ${fixtureToken}`);
    assert.equal(init.redirect, "error");
    assert.deepEqual(Object.keys(request).sort(), [
      "chat_template_kwargs",
      "max_tokens",
      "messages",
      "model",
      "response_format",
      "stream",
      "temperature",
    ]);
    assert.equal(request.model, config.modelId);
    assert.equal(request.temperature, FARM_OS_RTX_TEMPERATURE);
    assert.equal(request.max_tokens, FARM_OS_RTX_MAX_OUTPUT_TOKENS);
    assert.equal(request.max_tokens, 4_096);
    assert.equal(Object.hasOwn(request, "tools"), false);
    assert.equal(Object.hasOwn(request, "tool_choice"), false);
    assert.equal(Object.hasOwn(request, "functions"), false);
    assert.deepEqual(request.chat_template_kwargs, {
      enable_thinking: false,
    });
    const serializedRequest = JSON.stringify(request);
    assert.equal(serializedRequest.includes(String(job.business_date)), false);
    assert.equal(
      serializedRequest.includes(String(job.source_content_hash)),
      false,
    );
    assert.equal(serializedRequest.includes(String(job.source_record_id)), false);
    assert.equal(
      serializedRequest.includes(String(job.source_snapshot_id)),
      false,
    );
    assert.equal(serializedRequest.includes(String(job.job_id)), false);
    const messages = request.messages as Array<Record<string, unknown>>;
    const prompt = messages.map((message) => String(message.content)).join("\n");
    assert.ok(prompt.includes("葉の色むらを観察。"));
    const format = request.response_format as Record<string, unknown>;
    assert.equal(format.type, "json_schema");
    const jsonSchema = format.json_schema as Record<string, unknown>;
    assert.equal(jsonSchema.name, "farmos_rtx_model_output_v1");
    assert.equal(jsonSchema.strict, true);
    assert.equal(typeof jsonSchema.strict, "boolean");
    const schema = jsonSchema.schema as Record<string, unknown>;
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    const schemaProperties = schema.properties as Record<string, unknown>;
    assert.deepEqual(
      [...(schema.required as string[])].sort(),
      Object.keys(schemaProperties).sort(),
    );
    const assertBooleanFlagSchema = (
      value: unknown,
      expected: readonly string[],
    ) => {
      const flagSchema = value as Record<string, unknown>;
      const properties = flagSchema.properties as Record<string, unknown>;
      assert.equal(flagSchema.type, "object");
      assert.equal(flagSchema.additionalProperties, false);
      assert.deepEqual(flagSchema.required, expected);
      assert.deepEqual(Object.keys(properties), expected);
      for (const key of expected) {
        assert.deepEqual(properties[key], { type: "boolean" });
      }
    };
    const classification = schemaProperties
      .semantic_classification as Record<string, unknown>;
    const classificationProperties = classification
      .properties as Record<string, unknown>;
    assertBooleanFlagSchema(
      classificationProperties.work_category_flags,
      FARM_OS_RTX_WORK_CATEGORIES,
    );
    assertBooleanFlagSchema(
      classificationProperties.field_state_flags,
      FARM_OS_RTX_FIELD_STATES,
    );
    assertBooleanFlagSchema(
      classificationProperties.crop_state_flags,
      FARM_OS_RTX_CROP_STATES,
    );
    assertBooleanFlagSchema(
      classificationProperties.follow_up_flags,
      FARM_OS_RTX_FOLLOW_UPS,
    );
    assertBooleanFlagSchema(
      schemaProperties.missing_information_flags,
      FARM_OS_RTX_MISSING_INFORMATION,
    );
    assertBooleanFlagSchema(
      schemaProperties.ambiguity_flags,
      FARM_OS_RTX_AMBIGUITIES,
    );
    const schemaText = JSON.stringify(schema);
    assert.equal(schemaText.includes('"uniqueItems"'), false);
    for (const forbiddenSchemaField of [
      '"active"',
      '"verified"',
      '"approved"',
      "credential",
    ]) {
      assert.equal(schemaText.includes(forbiddenSchemaField), false);
    }
  }),
});
assert.equal(valid.status, "candidate_ready");
assert.equal(valid.candidate?.verification_state, "review_required");
assert.equal(valid.candidate?.job_id, job.job_id);
assert.equal(valid.candidate?.source_content_hash, job.source_content_hash);
assert.equal(valid.candidate?.model_provenance.model_id, config.modelId);
assert.equal(valid.safety.candidate_saved, false);
assert.equal(valid.safety.active_projection_modified, false);
assert.equal(valid.safety.fallback_model_used, false);
assert.equal(valid.diagnostics.completion_tokens, 50);
assert.equal(valid.diagnostics.finish_reason, "stop");
assert.equal(valid.diagnostics.invalid_json_reason, null);
assert.equal(JSON.stringify(valid).includes(fixtureToken), false);

for (
  const invalidArrayCandidate of [
    candidate({ missing_information: ["unknown_missing_information"] }),
    candidate({ ambiguities: ["unknown_ambiguity"] }),
    candidate({
      missing_information: [
        "field_state_missing",
        "field_state_missing",
      ],
    }),
    candidate({
      ambiguities: ["meaning_ambiguous", "meaning_ambiguous"],
    }),
  ]
) {
  const invalidArray = parseFarmOsRtxStructuringCandidate(
    invalidArrayCandidate,
  );
  assert.equal(invalidArray.valid, false);
  assert.ok(invalidArray.errors.includes("CANDIDATE_ARRAY_INVALID"));
}

const parsedModelOutput = parseFarmOsRtxModelOutput(modelOutput());
assert.equal(parsedModelOutput.valid, true);
assert.ok(parsedModelOutput.value);
const convertedCandidate = convertFarmOsRtxModelOutputToCandidate(
  parsedModelOutput.value,
);
assert.deepEqual(convertedCandidate.semantic_classification, {
  work_category_candidates: ["observation"],
  field_state_candidates: ["state_not_available"],
  crop_state_candidates: ["state_not_available"],
  follow_up_candidates: ["human_review"],
});
assert.deepEqual(convertedCandidate.missing_information, [
  "field_state_missing",
  "crop_state_missing",
]);
assert.deepEqual(convertedCandidate.ambiguities, [
  "meaning_ambiguous",
  "scope_ambiguous",
]);
assert.equal(
  parseFarmOsRtxStructuringCandidate(convertedCandidate).valid,
  true,
);

const assembledConvertedCandidate = {
  ...convertedCandidate,
  job_id: job.job_id,
  source_snapshot_id: job.source_snapshot_id,
  source_record_id: job.source_record_id,
  source_content_hash: job.source_content_hash,
  model_provenance: {
    model_id: config.modelId,
    model_artifact_id: config.modelArtifactId,
    quantization: config.quantization,
    runtime_id: "lm-studio-openai-compatible-v1",
    prompt_template_version: "rtx-structuring-model-output-v1",
    structured_output_schema_version: "model-output-v1",
  },
};
const parsedAssembledCandidate = parseFarmOsRtxStructuringCandidate(
  assembledConvertedCandidate,
);
assert.equal(parsedAssembledCandidate.valid, true);
assert.ok(parsedAssembledCandidate.value);
assert.equal(
  validateFarmOsRtxCandidateGrounding({
    job: job as never,
    candidate: parsedAssembledCandidate.value,
  }).valid,
  true,
);

const allTrueOutput = modelOutput({
  semantic_classification: {
    work_category_flags: flags(
      FARM_OS_RTX_WORK_CATEGORIES,
      FARM_OS_RTX_WORK_CATEGORIES,
    ),
    field_state_flags: flags(
      FARM_OS_RTX_FIELD_STATES,
      FARM_OS_RTX_FIELD_STATES,
    ),
    crop_state_flags: flags(
      FARM_OS_RTX_CROP_STATES,
      FARM_OS_RTX_CROP_STATES,
    ),
    follow_up_flags: flags(FARM_OS_RTX_FOLLOW_UPS, FARM_OS_RTX_FOLLOW_UPS),
  },
  missing_information_flags: flags(
    FARM_OS_RTX_MISSING_INFORMATION,
    FARM_OS_RTX_MISSING_INFORMATION,
  ),
  ambiguity_flags: flags(FARM_OS_RTX_AMBIGUITIES, FARM_OS_RTX_AMBIGUITIES),
});
const parsedAllTrue = parseFarmOsRtxModelOutput(allTrueOutput);
assert.equal(parsedAllTrue.valid, true);
assert.ok(parsedAllTrue.value);
const convertedAllTrue = convertFarmOsRtxModelOutputToCandidate(
  parsedAllTrue.value,
);
assert.deepEqual(
  convertedAllTrue.semantic_classification.work_category_candidates,
  FARM_OS_RTX_WORK_CATEGORIES,
);
assert.deepEqual(
  convertedAllTrue.missing_information,
  FARM_OS_RTX_MISSING_INFORMATION,
);
assert.deepEqual(convertedAllTrue.ambiguities, FARM_OS_RTX_AMBIGUITIES);
assert.equal(
  new Set(convertedAllTrue.missing_information).size,
  convertedAllTrue.missing_information.length,
);
assert.deepEqual(
  convertFarmOsRtxModelOutputToCandidate(parsedAllTrue.value),
  convertedAllTrue,
);

const allFalseOutput = modelOutput({
  semantic_classification: {
    work_category_flags: flags(FARM_OS_RTX_WORK_CATEGORIES, []),
    field_state_flags: flags(FARM_OS_RTX_FIELD_STATES, []),
    crop_state_flags: flags(FARM_OS_RTX_CROP_STATES, []),
    follow_up_flags: flags(FARM_OS_RTX_FOLLOW_UPS, []),
  },
  missing_information_flags: flags(FARM_OS_RTX_MISSING_INFORMATION, []),
  ambiguity_flags: flags(FARM_OS_RTX_AMBIGUITIES, []),
});
const parsedAllFalse = parseFarmOsRtxModelOutput(allFalseOutput);
assert.equal(parsedAllFalse.valid, true);
assert.ok(parsedAllFalse.value);
assert.equal(
  parseFarmOsRtxStructuringCandidate(
    convertFarmOsRtxModelOutputToCandidate(parsedAllFalse.value),
  ).valid,
  true,
);

const missingFlag = modelOutput();
delete (
  (missingFlag.semantic_classification as Record<
    string,
    Record<string, unknown>
  >)
    .work_category_flags
).observation;
const unknownFlag = modelOutput();
(
  (unknownFlag.semantic_classification as Record<
    string,
    Record<string, unknown>
  >)
    .field_state_flags
).unknown = true;
for (
  const invalidModelOutput of [
    missingFlag,
    unknownFlag,
    modelOutput({
      missing_information_flags: {
        ...flags(FARM_OS_RTX_MISSING_INFORMATION, []),
        work_context_missing: "true",
      },
    }),
    modelOutput({
      ambiguity_flags: {
        ...flags(FARM_OS_RTX_AMBIGUITIES, []),
        meaning_ambiguous: 1,
      },
    }),
    modelOutput({
      ambiguity_flags: {
        ...flags(FARM_OS_RTX_AMBIGUITIES, []),
        scope_ambiguous: null,
      },
    }),
  ]
) {
  const invalidModelOutputResult = parseFarmOsRtxModelOutput(
    invalidModelOutput,
  );
  assert.equal(invalidModelOutputResult.valid, false);
  const rejectedModelOutput = await runFarmOsRtxWorker({
    job,
    config,
    fetchImpl: completion(invalidModelOutput),
  });
  assert.equal(rejectedModelOutput.status, "rejected");
  assert.equal(rejectedModelOutput.candidate, null);
  assert.equal(rejectedModelOutput.safety.candidate_saved, false);
  assert.equal(rejectedModelOutput.safety.fallback_model_used, false);
  assert.equal(rejectedModelOutput.safety.active_projection_modified, false);
}

const validModelOutputJson = JSON.stringify(modelOutput());
const validModelOutputBytes = Buffer.byteLength(validModelOutputJson, "utf8");
assert.ok(validModelOutputBytes < FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES);
const atCandidateSizeLimit = validModelOutputJson +
  " ".repeat(FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES - validModelOutputBytes);
assert.equal(
  Buffer.byteLength(atCandidateSizeLimit, "utf8"),
  FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES,
);
const atSizeLimit = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(atCandidateSizeLimit),
});
assert.equal(atSizeLimit.status, "candidate_ready");
assert.equal(
  atSizeLimit.diagnostics.content_utf8_bytes,
  FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES,
);

const aboveCandidateSizeLimit = `${atCandidateSizeLimit} `;
assert.equal(
  Buffer.byteLength(aboveCandidateSizeLimit, "utf8"),
  FARM_OS_RTX_CANDIDATE_MAX_UTF8_BYTES + 1,
);
const aboveSizeLimit = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(aboveCandidateSizeLimit),
});
assert.equal(aboveSizeLimit.status, "rejected");
assert.ok(aboveSizeLimit.errors.includes("RTX_CANDIDATE_SIZE_EXCEEDED"));
assert.equal(aboveSizeLimit.candidate, null);
assert.equal(aboveSizeLimit.retryable, false);

const minimalSchemaContent = '{"status":"candidate"}';
assert.deepEqual(JSON.parse(minimalSchemaContent), { status: "candidate" });

const thinkingInContent = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(
    `<think>reasoning</think>${JSON.stringify(modelOutput())}`,
  ),
});
assert.equal(thinkingInContent.status, "rejected");
assert.ok(
  thinkingInContent.errors.includes(
    "RTX_CANDIDATE_INVALID_JSON:think_block_prefix",
  ),
);
assert.equal(
  thinkingInContent.diagnostics.invalid_json_reason,
  "think_block_prefix",
);

const separateReasoning = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(JSON.stringify(modelOutput()), {
    reasoningContent: "must not enter Candidate",
  }),
});
assert.equal(separateReasoning.status, "candidate_ready");
assert.equal(separateReasoning.diagnostics.reasoning_content_present, true);
assert.equal(
  JSON.stringify(separateReasoning.candidate).includes(
    "must not enter Candidate",
  ),
  false,
);

const markdownFence = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(
    `\`\`\`json\n${JSON.stringify(modelOutput())}\n\`\`\``,
  ),
});
assert.equal(markdownFence.status, "rejected");
assert.equal(
  markdownFence.diagnostics.invalid_json_reason,
  "markdown_code_fence",
);

const proseAroundContent = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(`Candidate: ${JSON.stringify(modelOutput())} done`),
});
assert.equal(proseAroundContent.status, "rejected");
assert.equal(
  proseAroundContent.diagnostics.invalid_json_reason,
  "prose_prefix_or_suffix",
);
assert.equal(proseAroundContent.diagnostics.trailing_text_present, true);

const truncatedContent = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion('{"job_id":', { finishReason: "length" }),
});
assert.equal(truncatedContent.status, "rejected");
assert.ok(truncatedContent.errors.includes("RTX_RESPONSE_TRUNCATED"));
assert.equal(
  truncatedContent.diagnostics.invalid_json_reason,
  "truncated_output",
);

const emptyContent = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(""),
});
assert.equal(emptyContent.status, "rejected");
assert.ok(emptyContent.errors.includes("RTX_RESPONSE_CONTENT_EMPTY"));
assert.equal(emptyContent.diagnostics.invalid_json_reason, "empty_content");

const reasoningOnly = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion("", {
    reasoningContent: JSON.stringify(modelOutput()),
  }),
});
assert.equal(reasoningOnly.status, "rejected");
assert.ok(reasoningOnly.errors.includes("RTX_RESPONSE_CONTENT_EMPTY"));
assert.equal(reasoningOnly.diagnostics.reasoning_content_present, true);

const objectContent = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: rawCompletion(modelOutput()),
});
assert.equal(objectContent.status, "rejected");
assert.ok(objectContent.errors.includes("RTX_RESPONSE_CONTENT_NOT_STRING"));
assert.equal(
  objectContent.diagnostics.invalid_json_reason,
  "wrong_response_field",
);

assert.equal(
  assertFarmOsRtxLocalBaseUrl("http://127.0.0.1:1234"),
  FARM_OS_RTX_DEFAULT_BASE_URL,
);
assert.throws(
  () => assertFarmOsRtxLocalBaseUrl("http://0.0.0.0:1234"),
  /RTX_BASE_URL_NOT_LOCAL/u,
);
assert.throws(
  () => assertFarmOsRtxLocalBaseUrl("http://192.168.1.20:1234"),
  /RTX_BASE_URL_NOT_LOCAL/u,
);

let missingTokenRequestCount = 0;
const missingToken = await runFarmOsRtxWorker({
  job,
  config: { ...config, apiToken: "" },
  fetchImpl: (async () => {
    missingTokenRequestCount += 1;
    throw new Error("request must not be sent");
  }) as typeof fetch,
});
assert.equal(missingToken.status, "rejected");
assert.equal(missingTokenRequestCount, 0);
assert.ok(missingToken.errors.includes("RTX_LM_STUDIO_API_TOKEN_REQUIRED"));
assert.equal(JSON.stringify(missingToken).includes(fixtureToken), false);
assert.throws(
  () =>
    loadFarmOsRtxWorkerConfig({
      FARMOS_RTX_LM_STUDIO_BASE_URL: FARM_OS_RTX_DEFAULT_BASE_URL,
      FARMOS_RTX_MODEL_ID: config.modelId,
      FARMOS_RTX_WORKER_MODE: FARM_OS_RTX_WORKER_MODE,
    }),
  /RTX_LM_STUDIO_API_TOKEN_REQUIRED/u,
);

assert.equal(
  (await runFarmOsRtxWorker({
    job: { ...job, production_job_creation: true },
    config,
    fetchImpl: completion(modelOutput()),
  })).status,
  "rejected",
);
assert.equal(
  (await runFarmOsRtxWorker({
    job: { ...job, unknown: true },
    config,
    fetchImpl: completion(modelOutput()),
  })).status,
  "rejected",
);
assert.equal(
  (await runFarmOsRtxWorker({
    job,
    config: { ...config, baseUrl: "http://0.0.0.0:1234" },
    fetchImpl: completion(modelOutput()),
  })).status,
  "rejected",
);
assert.equal(
  (await runFarmOsRtxWorker({
    job,
    config: { ...config, baseUrl: "http://192.168.1.20:1234" },
    fetchImpl: completion(modelOutput()),
  })).status,
  "rejected",
);
assert.throws(
  () =>
    loadFarmOsRtxWorkerConfig({
      FARMOS_RTX_WORKER_MODE: FARM_OS_RTX_WORKER_MODE,
      FARMOS_RTX_LM_STUDIO_API_TOKEN: fixtureToken,
    }),
  /RTX_MODEL_ID_REQUIRED/u,
);

const timeoutFetch = ((_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  })) as typeof fetch;
const timeoutResult = await runFarmOsRtxWorker({
  job,
  config: { ...config, requestTimeoutMs: 1 },
  fetchImpl: timeoutFetch,
});
assert.equal(timeoutResult.status, "worker_unavailable");
assert.equal(timeoutResult.retryable, true);
assert.equal(timeoutResult.safety.job_deleted, false);
assert.equal(timeoutResult.safety.fallback_model_used, false);

const httpError = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: (async () => new Response("", { status: 503 })) as typeof fetch,
});
assert.equal(httpError.status, "worker_unavailable");
assert.equal(httpError.retryable, true);

const redirect = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: (async (_url, init) => {
    assert.equal(init?.redirect, "error");
    return new Response("", {
      status: 302,
      headers: { location: "http://example.invalid/" },
    });
  }) as typeof fetch,
});
assert.equal(redirect.status, "worker_unavailable");
assert.ok(redirect.errors.includes("RTX_HTTP_REDIRECT_REJECTED:302"));
assert.equal(redirect.candidate, null);
assert.equal(redirect.safety.candidate_saved, false);
assert.equal(redirect.safety.fallback_model_used, false);

const authenticationFailure = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: (async () => new Response("", { status: 401 })) as typeof fetch,
});
assert.equal(authenticationFailure.status, "worker_unavailable");
assert.ok(
  authenticationFailure.errors.includes("RTX_AUTHENTICATION_FAILED:401"),
);
assert.equal(authenticationFailure.candidate, null);
assert.equal(authenticationFailure.safety.candidate_saved, false);
assert.equal(authenticationFailure.safety.fallback_model_used, false);
assert.equal(
  JSON.stringify(authenticationFailure).includes(fixtureToken),
  false,
);

const secretBearingNetworkError = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: (async () => {
    const error = new Error(fixtureToken);
    error.name = fixtureToken;
    throw error;
  }) as typeof fetch,
});
assert.equal(secretBearingNetworkError.status, "worker_unavailable");
assert.deepEqual(secretBearingNetworkError.errors, ["RTX_REQUEST_FAILED"]);
assert.equal(
  JSON.stringify(secretBearingNetworkError).includes(fixtureToken),
  false,
);

const invalidEnvelopeJson = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: (async () =>
    new Response("{", {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch,
});
assert.equal(invalidEnvelopeJson.status, "rejected");
assert.ok(invalidEnvelopeJson.errors.includes("RTX_RESPONSE_INVALID_JSON"));

const invalidCandidateJson = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion("{"),
});
assert.equal(invalidCandidateJson.status, "rejected");

const unknownCandidateKey = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput({ unknown: true })),
});
assert.equal(unknownCandidateKey.status, "rejected");
assert.ok(
  unknownCandidateKey.errors.includes("RTX_MODEL_OUTPUT_SCHEMA_INVALID"),
);

const identityMismatch = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput({
    source_content_hash:
      "1111111111111111111111111111111111111111111111111111111111111111",
  })),
});
assert.equal(identityMismatch.status, "rejected");
assert.ok(identityMismatch.errors.includes("SOURCE_IDENTITY_MISMATCH"));

const unsupportedFact = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput({ summary: "北圃場で病害を確認。" })),
});
assert.equal(unsupportedFact.status, "rejected");
assert.ok(unsupportedFact.errors.includes("SUMMARY_NOT_GROUNDED"));

const invalidEvidence = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput({
    evidence: [{ source_field: "work_note", excerpt: "存在しない根拠" }],
  })),
});
assert.equal(invalidEvidence.status, "rejected");
assert.ok(invalidEvidence.errors.includes("EVIDENCE_NOT_GROUNDED"));

const activeCandidate = await runFarmOsRtxWorker({
  job,
  config,
  fetchImpl: completion(modelOutput({ verification_state: "active" })),
});
assert.equal(activeCandidate.status, "rejected");
assert.equal(activeCandidate.safety.active_projection_modified, false);
assert.equal(activeCandidate.safety.fallback_model_used, false);

assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.night_deep_analysis.thinking,
  true,
);
assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.night_deep_analysis
    .full_reasoning_persisted,
  false,
);
assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.night_structured_emit.thinking,
  false,
);
assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.day_fast_response.projection_first,
  true,
);
assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.day_fast_response
    .runtime_implemented,
  false,
);
assert.equal(
  FARM_OS_RTX_AI_MODE_POLICY_DEFINITION.day_deep_analysis.activation,
  "explicit_request",
);

const exactAnalysis = parseFarmOsRtxNightAnalysis(nightAnalysis());
assert.equal(exactAnalysis.valid, true);
assert.ok(exactAnalysis.value);
assert.equal(
  validateFarmOsRtxNightAnalysisGrounding({
    job: job as never,
    analysis: exactAnalysis.value,
  }).valid,
  true,
);

const analysisUnknownKey = parseFarmOsRtxNightAnalysis(
  nightAnalysis({ unknown: true }),
);
assert.equal(analysisUnknownKey.valid, false);
assert.ok(
  analysisUnknownKey.errors.includes("RTX_NIGHT_ANALYSIS_SCHEMA_INVALID"),
);

const mismatchedAnalysis = parseFarmOsRtxNightAnalysis(nightAnalysis({
  source_content_hash:
    "1111111111111111111111111111111111111111111111111111111111111111",
}));
assert.equal(mismatchedAnalysis.valid, true);
assert.ok(mismatchedAnalysis.value);
assert.ok(
  validateFarmOsRtxNightAnalysisGrounding({
    job: job as never,
    analysis: mismatchedAnalysis.value,
  }).errors.includes("RTX_NIGHT_ANALYSIS_IDENTITY_MISMATCH"),
);

const ungroundedAnalysis = parseFarmOsRtxNightAnalysis(nightAnalysis({
  evidence: [{ source_field: "work_note", excerpt: "存在しない分析根拠" }],
}));
assert.equal(ungroundedAnalysis.valid, true);
assert.ok(ungroundedAnalysis.value);
assert.ok(
  validateFarmOsRtxNightAnalysisGrounding({
    job: job as never,
    analysis: ungroundedAnalysis.value,
  }).errors.includes("RTX_NIGHT_ANALYSIS_EVIDENCE_NOT_GROUNDED"),
);

const unsupportedAnalysisSummary = parseFarmOsRtxNightAnalysis(nightAnalysis({
  analysis_summary: "北圃場で病害を確認。",
}));
assert.equal(unsupportedAnalysisSummary.valid, true);
assert.ok(unsupportedAnalysisSummary.value);
assert.ok(
  validateFarmOsRtxNightAnalysisGrounding({
    job: job as never,
    analysis: unsupportedAnalysisSummary.value,
  }).errors.includes("RTX_NIGHT_ANALYSIS_SUMMARY_NOT_GROUNDED"),
);

const validAnalysisJson = JSON.stringify(nightAnalysis());
const analysisJsonBytes = Buffer.byteLength(validAnalysisJson, "utf8");
const oversizedAnalysisContent = validAnalysisJson +
  " ".repeat(
    FARM_OS_RTX_NIGHT_ANALYSIS_MAX_UTF8_BYTES - analysisJsonBytes + 1,
  );
const oversizedAnalysis = await runFarmOsRtxNightAnalysis({
  job,
  config,
  fetchImpl: rawCompletion(oversizedAnalysisContent),
});
assert.equal(oversizedAnalysis.status, "night_analysis_failed");
assert.ok(oversizedAnalysis.errors.includes("RTX_NIGHT_ANALYSIS_SIZE_EXCEEDED"));
assert.equal(oversizedAnalysis.safety.candidate_saved, false);

const passOneReasoningMarker = "fixture-pass-one-reasoning-must-not-forward";
const passTwoReasoningMarker = "fixture-pass-two-reasoning-must-not-persist";
let twoPassRequestCount = 0;
const twoPass = await runFarmOsRtxNightTwoPass({
  job,
  config,
  fetchImpl: completionSequence([
    {
      content: JSON.stringify(nightAnalysis()),
      reasoningContent: passOneReasoningMarker,
    },
    {
      content: JSON.stringify(modelOutput()),
      reasoningContent: passTwoReasoningMarker,
    },
  ], (requestIndex, request, init) => {
    twoPassRequestCount += 1;
    assert.equal(init.redirect, "error");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("authorization"), `Bearer ${fixtureToken}`);
    const chatTemplate = request.chat_template_kwargs as Record<
      string,
      unknown
    >;
    const messages = request.messages as Array<Record<string, unknown>>;
    const prompt = messages.map((message) => String(message.content)).join("\n");
    if (requestIndex === 0) {
      assert.equal(chatTemplate.enable_thinking, true);
      assert.equal(
        request.max_tokens,
        FARM_OS_RTX_NIGHT_ANALYSIS_MAX_OUTPUT_TOKENS,
      );
      assert.equal(request.max_tokens, 8_192);
      const format = request.response_format as Record<string, unknown>;
      const jsonSchema = format.json_schema as Record<string, unknown>;
      assert.equal(jsonSchema.name, "farmos_rtx_night_analysis_v1");
      assert.equal(jsonSchema.strict, true);
      assert.equal(
        JSON.stringify(jsonSchema.schema).includes('"uniqueItems"'),
        false,
      );
      assert.equal(prompt.includes("analysis_handoff"), false);
    } else {
      assert.equal(chatTemplate.enable_thinking, false);
      assert.equal(request.max_tokens, 4_096);
      assert.equal(prompt.includes("analysis_handoff"), true);
      assert.equal(prompt.includes(passOneReasoningMarker), false);
      assert.equal(prompt.includes("business_date"), false);
      assert.equal(prompt.includes("recorded_at"), false);
      assert.equal(prompt.includes("duration"), false);
      assert.equal(prompt.includes("quantity"), false);
    }
  }),
});
assert.equal(twoPass.status, "candidate_ready");
assert.equal(twoPassRequestCount, 2);
assert.equal(twoPass.candidate?.job_id, job.job_id);
assert.equal(twoPass.pass_1.reasoning_content_present, true);
assert.equal(twoPass.pass_2?.reasoning_content_present, true);
assert.equal(
  JSON.stringify(twoPass.candidate).includes(passOneReasoningMarker),
  false,
);
assert.equal(
  JSON.stringify(twoPass.candidate).includes(passTwoReasoningMarker),
  false,
);
assert.equal(twoPass.safety.candidate_saved, false);
assert.equal(twoPass.safety.fallback_model_used, false);
assert.equal(twoPass.safety.active_projection_modified, false);
assert.ok((twoPass.handoff_utf8_bytes ?? 0) > 0);
assert.ok(
  (twoPass.handoff_utf8_bytes ?? 0) <=
    FARM_OS_RTX_NIGHT_ANALYSIS_MAX_UTF8_BYTES,
);

let passOneFailureRequestCount = 0;
const passOneFailure = await runFarmOsRtxNightTwoPass({
  job,
  config,
  fetchImpl: completionSequence([
    { content: JSON.stringify({ invalid: true }) },
  ], () => {
    passOneFailureRequestCount += 1;
  }),
});
assert.equal(passOneFailure.status, "night_analysis_failed");
assert.equal(passOneFailureRequestCount, 1);
assert.equal(passOneFailure.candidate, null);
assert.equal(passOneFailure.pass_2, null);
assert.equal(passOneFailure.safety.fallback_model_used, false);

let passTwoFailureRequestCount = 0;
const passTwoFailure = await runFarmOsRtxNightTwoPass({
  job,
  config,
  fetchImpl: completionSequence([
    { content: JSON.stringify(nightAnalysis()) },
    { content: JSON.stringify({ invalid: true }) },
  ], () => {
    passTwoFailureRequestCount += 1;
  }),
});
assert.equal(passTwoFailure.status, "structured_emit_failed");
assert.equal(passTwoFailureRequestCount, 2);
assert.equal(passTwoFailure.candidate, null);
assert.equal(passTwoFailure.safety.candidate_saved, false);
assert.equal(passTwoFailure.safety.fallback_model_used, false);

const reasoningOnlyAnalysis = await runFarmOsRtxNightAnalysis({
  job,
  config,
  fetchImpl: rawCompletion("", {
    reasoningContent: JSON.stringify(nightAnalysis()),
  }),
});
assert.equal(reasoningOnlyAnalysis.status, "night_analysis_failed");
assert.equal(reasoningOnlyAnalysis.analysis, null);
assert.equal(
  reasoningOnlyAnalysis.diagnostics.reasoning_content_present,
  true,
);

let dayFastRequestCount = 0;
const dayFast = await runFarmOsRtxRuntimeMode({
  mode: "day-fast",
  job,
  config,
  fetchImpl: (async () => {
    dayFastRequestCount += 1;
    throw new Error("day-fast must not call night model");
  }) as typeof fetch,
});
assert.equal(dayFast.status, "policy_only_not_implemented");
assert.equal(dayFastRequestCount, 0);

let routedTwoPassRequestCount = 0;
const routedTwoPass = await runFarmOsRtxRuntimeMode({
  mode: "night-two-pass",
  job,
  config,
  fetchImpl: completionSequence([
    { content: JSON.stringify(nightAnalysis()) },
    { content: JSON.stringify(modelOutput()) },
  ], () => {
    routedTwoPassRequestCount += 1;
  }),
});
assert.equal(routedTwoPass.status, "candidate_ready");
assert.equal(routedTwoPassRequestCount, 2);

const runtimeSource = readFileSync(
  new URL(
    "../../src/lib/hermes/farm_os_rtx_worker_runtime.ts",
    import.meta.url,
  ),
  "utf8",
);
for (
  const forbiddenCredentialName of [
    "DATABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "FARMOS_CORE_DATABASE_URL",
  ]
) {
  assert.equal(runtimeSource.includes(forbiddenCredentialName), false);
}

console.log("farm_os_day146_rtx_worker_runtime: PASS");
