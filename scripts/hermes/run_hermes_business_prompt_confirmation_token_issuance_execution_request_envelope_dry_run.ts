import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const provider = readArg('--provider');
const sample = readArg('--sample');

if (
  provider !== undefined &&
  provider !==
    'business_prompt_confirmation_token_issuance_execution_request_envelope' &&
  provider !==
    'local_llm_business_prompt_confirmation_token_issuance_execution_request_envelope'
) {
  throw new Error(`Unsupported Day62 execution request envelope provider: ${provider}`);
}

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
    provider,
    sample,
  });

console.log(JSON.stringify(output, null, 2));
