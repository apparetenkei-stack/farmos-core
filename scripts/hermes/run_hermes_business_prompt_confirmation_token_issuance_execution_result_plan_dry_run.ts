import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_result_plan_boundary';

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
    'business_prompt_confirmation_token_issuance_execution_result_plan' &&
  provider !==
    'local_llm_business_prompt_confirmation_token_issuance_execution_result_plan'
) {
  throw new Error(`Unsupported Day63 execution result plan provider: ${provider}`);
}

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary({
    provider,
    sample,
  });

console.log(JSON.stringify(output, null, 2));
