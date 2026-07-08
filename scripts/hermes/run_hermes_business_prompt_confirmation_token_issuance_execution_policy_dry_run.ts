import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_policy_boundary';

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
  provider !== 'business_prompt_confirmation_token_issuance_execution_policy' &&
  provider !==
    'local_llm_business_prompt_confirmation_token_issuance_execution_policy'
) {
  throw new Error(`Unsupported Day61 execution policy provider: ${provider}`);
}

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary({
    provider,
    sample,
  });

console.log(JSON.stringify(output, null, 2));
