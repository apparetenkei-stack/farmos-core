import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';

assert.deepEqual(
  hermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAliases,
  [
    'business_prompt_confirmation_token_issuance_execution_result_audit',
    'local_llm_business_prompt_confirmation_token_issuance_execution_result_audit',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAlias(
    'business_prompt_confirmation_token_issuance_execution_result_audit',
  ),
  true,
);
assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_execution_result_audit',
  ),
  true,
);
assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAlias(
    'business_prompt_confirmation_token_issuance_execution_result_plan',
  ),
  false,
);
assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAlias(
    undefined,
  ),
  false,
);

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_execution_result_audit_integration',
      provider_aliases:
        hermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditProviderAliases,
    },
    null,
    2,
  ),
);
