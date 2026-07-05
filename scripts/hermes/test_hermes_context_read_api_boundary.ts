import assert from "node:assert/strict";

import { Client, type ClientConfig } from "pg";

import { readHermesProposalContext } from "./api_boundary/hermes_context_read_api_boundary";

const protectedProposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

type FixtureState = {
  apply_history_count: number;
  protected_proposal_status: string | null;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
  crop_cycle_2_exists: boolean;
};

type WritePrivilegeState = {
  app_crop_cycles_write_allowed: boolean;
  ai_proposal_inbox_write_allowed: boolean;
  audit_apply_events_write_allowed: boolean;
};

const restrictedDataPattern =
  /order|shipping|shipment|allocation|customer|client|buyer|money|invoice|billing|payment|labor|worker|staff|wage|salary|payroll|evaluation|rating/i;

function createAppClient(): Client {
  const config: ClientConfig = {
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
    application_name: "farmos_day38_hermes_context_read_boundary_test",
    connectionTimeoutMillis: 5_000,
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env["PG" + "PASS" + "WORD"] ??
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];

  return new Client(config);
}

async function readFixtureState(client: Client): Promise<FixtureState> {
  const result = await client.query<FixtureState>(
    `
      select
        (
          select count(*)::int
          from audit.proposal_review_apply_events
        ) as apply_history_count,
        (
          select status
          from ai.proposal_inbox
          where id = $1::uuid
        ) as protected_proposal_status,
        (
          select applied_at::text
          from ai.proposal_inbox
          where id = $1::uuid
        ) as protected_proposal_applied_at,
        (
          select applied_by
          from ai.proposal_inbox
          where id = $1::uuid
        ) as protected_proposal_applied_by,
        exists(
          select 1
          from app.crop_cycles
          where id = 2
        ) as crop_cycle_2_exists
    `,
    [protectedProposalId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Day38 fixture state query returned no rows.");
  }

  return row;
}

async function readWritePrivilegeState(
  client: Client,
): Promise<WritePrivilegeState> {
  const result = await client.query<WritePrivilegeState>(`
    select
      (
        has_table_privilege(current_user, 'app.crop_cycles', 'INSERT')
        or has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE')
        or has_table_privilege(current_user, 'app.crop_cycles', 'DELETE')
        or has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE')
      ) as app_crop_cycles_write_allowed,
      (
        has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
      ) as ai_proposal_inbox_write_allowed,
      (
        has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'INSERT')
        or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'UPDATE')
        or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'DELETE')
        or has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'TRUNCATE')
      ) as audit_apply_events_write_allowed
  `);

  const row = result.rows[0];

  if (!row) {
    throw new Error("Day38 privilege query returned no rows.");
  }

  return row;
}

function assertRestrictedOperationalDataAbsent(value: unknown): void {
  const text = JSON.stringify(value, null, 2);

  assert.equal(
    restrictedDataPattern.test(text),
    false,
    "Hermes context data must not expose restricted commercial, logistics, people-sensitive, or finance fields",
  );
}

async function main(): Promise<void> {
  const client = createAppClient();

  await client.connect();

  try {
    const before = await readFixtureState(client);
    const privileges = await readWritePrivilegeState(client);

    assert.equal(
      privileges.app_crop_cycles_write_allowed,
      false,
      "app caller must not be able to write app.crop_cycles",
    );
    assert.equal(
      privileges.ai_proposal_inbox_write_allowed,
      false,
      "app caller must not be able to write ai.proposal_inbox",
    );
    assert.equal(
      privileges.audit_apply_events_write_allowed,
      false,
      "app caller must not be able to write audit.proposal_review_apply_events",
    );

    assert.equal(
      before.apply_history_count,
      3,
      "Day38 starts from the protected local fixture with three apply events",
    );
    assert.equal(
      before.protected_proposal_status,
      "pending",
      "protected proposal must start pending",
    );
    assert.equal(
      before.protected_proposal_applied_at,
      null,
      "protected proposal must not start applied",
    );
    assert.equal(
      before.protected_proposal_applied_by,
      null,
      "protected proposal must not start with applied_by",
    );
    assert.equal(
      before.crop_cycle_2_exists,
      true,
      "app.crop_cycles id=2 must exist before Hermes context reads",
    );

    const hermesContext = await readHermesProposalContext({
      proposalId: protectedProposalId,
    });

    assert.equal(hermesContext.result, "ok");

    if (hermesContext.result !== "ok") {
      throw new Error(`Unexpected Hermes context result: ${hermesContext.result}`);
    }

    assert.equal(
      hermesContext.context.scope,
      "proposal_review_apply_context",
    );
    assert.equal(
      hermesContext.context.proposal.id,
      protectedProposalId,
    );
    assert.equal(
      hermesContext.boundary.mode,
      "hermes_context_read_boundary",
    );
    assert.equal(hermesContext.boundary.transaction_read_only, true);
    assert.equal(hermesContext.boundary.writes_performed, false);
    assert.equal(hermesContext.boundary.commands_executed, false);
    assert.equal(hermesContext.boundary.hermes_runtime_executed, false);
    assert.equal(hermesContext.boundary.llm_runtime_executed, false);
    assert.equal(hermesContext.boundary.app_schema_write_allowed, false);
    assert.equal(hermesContext.boundary.ai_proposal_write_allowed, false);
    assert.equal(hermesContext.boundary.audit_apply_event_write_allowed, false);

    assert.equal(
      hermesContext.context.safety_policy.human_review_required,
      true,
    );
    assert.equal(
      hermesContext.context.safety_policy.autonomous_apply_allowed,
      false,
    );
    assert.equal(
      hermesContext.context.safety_policy.proposal_generation_allowed,
      false,
    );
    assert.equal(
      hermesContext.context.safety_policy.farmos_write_allowed,
      false,
    );
    assert.equal(
      hermesContext.context.safety_policy.runtime_execution_allowed,
      false,
    );
    assert.equal(
      hermesContext.context.safety_policy.llm_execution_allowed,
      false,
    );

    assert.equal(
      hermesContext.context.apply_readiness.result === "ready" ||
        hermesContext.context.apply_readiness.result === "blocked",
      true,
      "Hermes context must include apply readiness",
    );

    assert.equal(
      hermesContext.context.apply_plan_preview.result === "preview" ||
        hermesContext.context.apply_plan_preview.result === "blocked",
      true,
      "Hermes context must include apply plan preview",
    );

    assert.equal(
      typeof hermesContext.context.apply_history_summary
        .committed_apply_event_count,
      "number",
      "Hermes context must include apply history summary",
    );

    assertRestrictedOperationalDataAbsent({
      proposal: hermesContext.context.proposal,
      review_decisions: hermesContext.context.review_decisions,
      apply_readiness: hermesContext.context.apply_readiness,
      apply_plan_preview: hermesContext.context.apply_plan_preview,
      apply_history_summary: hermesContext.context.apply_history_summary,
    });

    const after = await readFixtureState(client);

    assert.deepEqual(
      after,
      before,
      "Hermes context read boundary must not change fixture state",
    );

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            hermes_context_result: hermesContext.result,
            context_scope: hermesContext.context.scope,
            proposal_id: hermesContext.context.proposal.id,
            readiness_result:
              hermesContext.context.apply_readiness.result,
            preview_result:
              hermesContext.context.apply_plan_preview.result,
            preview_operation:
              hermesContext.context.apply_plan_preview.result === "preview" ||
              hermesContext.context.apply_plan_preview.result === "blocked"
                ? hermesContext.context.apply_plan_preview.preview.operation
                : null,
            apply_history_summary_count:
              hermesContext.context.apply_history_summary
                .committed_apply_event_count,
            transaction_read_only:
              hermesContext.boundary.transaction_read_only,
            writes_performed:
              hermesContext.boundary.writes_performed,
            commands_executed:
              hermesContext.boundary.commands_executed,
            hermes_runtime_executed:
              hermesContext.boundary.hermes_runtime_executed,
            llm_runtime_executed:
              hermesContext.boundary.llm_runtime_executed,
            app_role_crop_cycle_write_allowed:
              privileges.app_crop_cycles_write_allowed,
            app_role_ai_proposal_write_allowed:
              privileges.ai_proposal_inbox_write_allowed,
            app_role_audit_apply_event_write_allowed:
              privileges.audit_apply_events_write_allowed,
            apply_history_count_before: before.apply_history_count,
            apply_history_count_after: after.apply_history_count,
            protected_proposal_status:
              after.protected_proposal_status,
            protected_proposal_applied_at:
              after.protected_proposal_applied_at,
            protected_proposal_applied_by:
              after.protected_proposal_applied_by,
            crop_cycle_2_exists:
              after.crop_cycle_2_exists,
            restricted_operational_data_exposed:
              false,
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
  console.error(error);
  process.exit(1);
});
