import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_result_audit_boundary';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const provider = readArg('--provider');
const sample = readArg('--sample');

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary(
    {
      provider,
      sample,
    },
  );

console.log(JSON.stringify(output, null, 2));
