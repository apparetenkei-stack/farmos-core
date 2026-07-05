import { Client } from "pg";
import { readHermesChatReadonlyUi } from "./api_boundary/hermes_chat_readonly_ui_boundary";

const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

type ProtectedState = {
  proposal_count: number;
  hermes_note_count: number;
  apply_history_count: number;
  protected_proposal_status: string | null;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
  crop_cycle_2_exists: boolean;
};

function getDbConfig() {
  return {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local",
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  };
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function readProtectedState(client: Client): Promise<ProtectedState> {
  const result = await client.query<ProtectedState>(
    `
    select
      (select count(*)::int from ai.proposal_inbox) as proposal_count,
      (
        select count(*)::int
        from ai.proposal_inbox
        where proposal_type = 'hermes_apply_blocker_explanation'
      ) as hermes_note_count,
      (
        select count(*)::int
        from audit.proposal_review_apply_events
      ) as apply_history_count,
      (
        select status::text
        from ai.proposal_inbox
        where id = $1::uuid
      ) as protected_proposal_status,
      (
        select applied_at::text
        from ai.proposal_inbox
        where id = $1::uuid
      ) as protected_proposal_applied_at,
      (
        select applied_by::text
        from ai.proposal_inbox
        where id = $1::uuid
      ) as protected_proposal_applied_by,
      (
        select exists(select 1 from app.crop_cycles where id = 2)
      ) as crop_cycle_2_exists
    `,
    [PROTECTED_PROPOSAL_ID],
  );

  return result.rows[0];
}

async function main(): Promise<void> {
  const client = new Client(getDbConfig());

  await client.connect();

  try {
    const before = await readProtectedState(client);

    const indexResult = await readHermesChatReadonlyUi({
      latestLimit: 10,
    });

    const contextResult = await readHermesChatReadonlyUi({
      proposalId: PROTECTED_PROPOSAL_ID,
      latestLimit: 10,
    });

    const after = await readProtectedState(client);

    assertCondition(indexResult.result === "ok", "index view must be ok");
    assertCondition(contextResult.result === "ok", "context view must be ok");

    if (indexResult.result !== "ok" || contextResult.result !== "ok") {
      throw new Error("unreachable");
    }

    assertCondition(
      indexResult.view.page_mode === "hermes_index",
      "index page mode must be hermes_index",
    );
    assertCondition(
      contextResult.view.page_mode === "hermes_proposal_context",
      "context page mode must be hermes_proposal_context",
    );

    assertCondition(
      indexResult.boundary.transaction_read_only === true,
      "index transaction must be read-only",
    );
    assertCondition(
      contextResult.boundary.transaction_read_only === true,
      "context transaction must be read-only",
    );

    assertCondition(
      indexResult.boundary.writes_performed === false,
      "index must not write",
    );
    assertCondition(
      contextResult.boundary.writes_performed === false,
      "context must not write",
    );

    assertCondition(
      indexResult.boundary.commands_executed === false,
      "index must not execute commands",
    );
    assertCondition(
      contextResult.boundary.commands_executed === false,
      "context must not execute commands",
    );

    assertCondition(
      indexResult.boundary.hermes_runtime_executed === false,
      "index must not execute Hermes runtime",
    );
    assertCondition(
      contextResult.boundary.hermes_runtime_executed === false,
      "context must not execute Hermes runtime",
    );

    assertCondition(
      indexResult.boundary.llm_runtime_executed === false,
      "index must not execute LLM runtime",
    );
    assertCondition(
      contextResult.boundary.llm_runtime_executed === false,
      "context must not execute LLM runtime",
    );

    assertCondition(
      indexResult.boundary.app_schema_write_allowed === false,
      "app schema write must not be allowed",
    );
    assertCondition(
      indexResult.boundary.ai_proposal_write_allowed === false,
      "ai.proposal_inbox write must not be allowed from UI boundary",
    );
    assertCondition(
      indexResult.boundary.audit_apply_event_write_allowed === false,
      "audit apply event write must not be allowed",
    );

    assertCondition(
      contextResult.view.proposal_context_result === "ok",
      "proposal context result must be ok",
    );
    assertCondition(
      contextResult.view.safety_policy.restricted_domain_data_exposed === false,
      "restricted domain data must not be exposed",
    );
    assertCondition(
      contextResult.view.redaction_policy.restricted_operational_data_exposed === false,
      "restricted operational data must not be exposed",
    );

    assertCondition(
      indexResult.view.hermes_proposal_notes.length >= 2,
      "latest Hermes proposal notes must include at least 2 notes",
    );

    assertCondition(
      before.proposal_count === after.proposal_count,
      "proposal count must not change",
    );
    assertCondition(
      before.apply_history_count === after.apply_history_count,
      "apply history count must not change",
    );
    assertCondition(
      after.protected_proposal_status === "pending",
      "protected proposal must remain pending",
    );
    assertCondition(
      after.protected_proposal_applied_at === null,
      "protected proposal applied_at must remain null",
    );
    assertCondition(
      after.protected_proposal_applied_by === null,
      "protected proposal applied_by must remain null",
    );
    assertCondition(
      after.crop_cycle_2_exists === true,
      "app.crop_cycles id=2 must remain present",
    );

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            index_result: indexResult.result,
            context_result: contextResult.result,
            index_page_mode: indexResult.view.page_mode,
            context_page_mode: contextResult.view.page_mode,
            proposal_context_result: contextResult.view.proposal_context_result,
            proposal_context_scope: contextResult.view.proposal_context_scope,
            proposal_status: contextResult.view.proposal_status,
            readiness_result: contextResult.view.readiness_result,
            preview_result: contextResult.view.preview_result,
            apply_history_summary_count:
              contextResult.view.apply_history_summary_count,
            latest_hermes_proposal_note_count:
              indexResult.view.hermes_proposal_notes.length,
            related_hermes_proposal_note_count:
              contextResult.view.hermes_proposal_notes.length,
            transaction_read_only:
              indexResult.boundary.transaction_read_only,
            writes_performed: indexResult.boundary.writes_performed,
            commands_executed: indexResult.boundary.commands_executed,
            hermes_runtime_executed:
              indexResult.boundary.hermes_runtime_executed,
            llm_runtime_executed:
              indexResult.boundary.llm_runtime_executed,
            app_schema_write_allowed:
              indexResult.boundary.app_schema_write_allowed,
            ai_proposal_write_allowed:
              indexResult.boundary.ai_proposal_write_allowed,
            audit_apply_event_write_allowed:
              indexResult.boundary.audit_apply_event_write_allowed,
            proposal_count_before: before.proposal_count,
            proposal_count_after: after.proposal_count,
            hermes_note_count_before: before.hermes_note_count,
            hermes_note_count_after: after.hermes_note_count,
            apply_history_count_before: before.apply_history_count,
            apply_history_count_after: after.apply_history_count,
            protected_proposal_status: after.protected_proposal_status,
            protected_proposal_applied_at: after.protected_proposal_applied_at,
            protected_proposal_applied_by: after.protected_proposal_applied_by,
            crop_cycle_2_exists: after.crop_cycle_2_exists,
            restricted_domain_data_exposed:
              contextResult.view.safety_policy.restricted_domain_data_exposed,
            restricted_operational_data_exposed:
              contextResult.view.redaction_policy.restricted_operational_data_exposed,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
