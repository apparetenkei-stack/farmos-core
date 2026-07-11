import { createHermesRuntimeRequestId } from "./llm_runtime/hermes_runtime_contract";
import { createHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";

const envelope = createHermesJobEnvelope({
  requestId: createHermesRuntimeRequestId(),
  payload: {
    message: "controlled Day97 Hermes job preview",
    include_readonly_context: false,
  },
});

console.log(JSON.stringify({
  schema_version: envelope.schema_version,
  job_type: envelope.job_type,
  payload: {
    message_length: envelope.payload.message.length,
    include_readonly_context: envelope.payload.include_readonly_context,
  },
  runtime: envelope.runtime,
  safety: envelope.safety,
}, null, 2));
