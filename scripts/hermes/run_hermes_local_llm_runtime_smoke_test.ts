import { runHermesLocalLlmRuntimeSmokeTestFromEnv } from "./llm_runtime/hermes_local_llm_runtime_smoke_test";

async function main(): Promise<void> {
  const result = await runHermesLocalLlmRuntimeSmokeTestFromEnv();

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
        db_write_performed: result.boundary.db_write_performed,
        proposal_created: result.boundary.proposal_created,
        proposal_saved: result.boundary.proposal_saved,
        proposal_apply_performed: result.boundary.proposal_apply_performed,
        chat_history_saved: result.boundary.chat_history_saved,
        audit_record_saved: result.boundary.audit_record_saved,
        app_db_write_performed: result.boundary.app_db_write_performed,
        route_added: result.boundary.route_added,
        server_action_added: result.boundary.server_action_added,
        form_action_added: result.boundary.form_action_added,
        ui_changed: result.boundary.ui_changed,
        credentials_required: result.boundary.credentials_required,
        credentials_exposed: result.boundary.credentials_exposed,
        external_api_called: result.boundary.external_api_called,
      },
      null,
      2,
    ),
  );

  if (
    result.result === "failed" ||
    result.result === "blocked" ||
    result.result === "bad_request"
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
