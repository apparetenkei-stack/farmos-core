import { runHermesLlmProviderAdapterFromEnv } from "./llm_runtime/hermes_llm_provider_adapter";

async function main(): Promise<void> {
  const result = await runHermesLlmProviderAdapterFromEnv();

  console.log(
    JSON.stringify(
      {
        provider: result.provider,
        status: result.status,
        runtime_call_allowed: result.runtime_call_allowed,
        llm_runtime_executed: result.llm_runtime_executed,
        runtime_reachable: result.runtime_reachable,
        prompt_sent: result.prompt_sent,
        response_text: result.response_text,
        response_text_non_empty: result.response_text_non_empty,
        tokens_used: result.tokens_used,
        base_url: result.base_url,
        model: result.model,
        timeout_ms: result.timeout_ms,
        http_status: result.http_status,
        error_message: result.error_message,
        db_write_performed: result.db_write_performed,
        proposal_created: result.proposal_created,
        proposal_saved: result.proposal_saved,
        proposal_apply_performed: result.proposal_apply_performed,
        chat_history_saved: result.chat_history_saved,
        audit_record_saved: result.audit_record_saved,
        app_db_write_performed: result.app_db_write_performed,
        route_added: result.route_added,
        server_action_added: result.server_action_added,
        form_action_added: result.form_action_added,
        ui_changed: result.ui_changed,
        credentials_required: result.credentials_required,
        credentials_exposed: result.credentials_exposed,
        external_api_called: result.external_api_called,
      },
      null,
      2,
    ),
  );

  if (
    result.status === "runtime_error" ||
    result.status === "timeout" ||
    result.status === "bad_request" ||
    result.status === "blocked"
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
