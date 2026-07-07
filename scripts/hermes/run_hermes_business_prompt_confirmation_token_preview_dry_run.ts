import { createHermesBusinessPromptConfirmationTokenPreviewBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_preview_boundary';

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
  throw new Error('Day56 token preview boundary only supports --dry-run.');
}

if (
  provider !== undefined &&
  provider !== 'business_prompt_confirmation_token_preview' &&
  provider !== 'local_llm_business_prompt_confirmation_token_preview'
) {
  throw new Error(`Unsupported Day56 token preview provider: ${provider}`);
}

const output = createHermesBusinessPromptConfirmationTokenPreviewBoundary({
  provider,
  sample,
});

console.log(JSON.stringify(output, null, 2));
