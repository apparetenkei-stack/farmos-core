import { createHermesBusinessPromptConfirmationReviewUiMetadataBoundary } from './api_boundary/hermes_business_prompt_confirmation_review_ui_metadata_boundary';

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
  throw new Error('Day54 UI metadata boundary only supports --dry-run.');
}

if (
  provider !== undefined &&
  provider !== 'business_prompt_confirmation_review_ui_metadata' &&
  provider !== 'local_llm_business_prompt_confirmation_review_ui_metadata'
) {
  throw new Error(`Unsupported Day54 UI metadata provider: ${provider}`);
}

const output = createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
  provider,
  sample,
});

console.log(JSON.stringify(output, null, 2));
