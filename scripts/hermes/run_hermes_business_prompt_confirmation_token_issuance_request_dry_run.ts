import { createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_request_boundary';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const provider = readArg('--provider');
const sample = readArg('--sample');
const dryRun = process.argv.includes('--dry-run');

if (!dryRun) {
  throw new Error(
    'Day58 token issuance request boundary only supports --dry-run.',
  );
}

if (
  provider !== undefined &&
  provider !== 'business_prompt_confirmation_token_issuance_request' &&
  provider !== 'local_llm_business_prompt_confirmation_token_issuance_request'
) {
  throw new Error(`Unsupported Day58 token issuance request provider: ${provider}`);
}

const output = createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
  provider,
  sample,
});

console.log(JSON.stringify(output, null, 2));
