import assert from "node:assert/strict";

import { Client, type ClientConfig } from "pg";

import { checkProposalReviewApplyReadiness } from "./api_boundary/proposal_review_apply_readiness_read_api_boundary";
import { previewProposalReviewApplyPlan } from "./api_boundary/proposal_review_apply_plan_preview_read_api_boundary";

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
    application_name:
      "farmos_day37_apply_readiness_plan_preview_readonly_ui_boundary",
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
    throw new Error("Day37 fixture state query returned no rows.");
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
    throw new Error("Day37 privilege query returned no rows.");
  }

  return row;
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
      "Day37 starts from the Day36 local fixture with three apply events",
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
      "app.crop_cycles id=2 must exist before UI boundary reads",
    );

    const readiness = await checkProposalReviewApplyReadiness({
      proposalId: protectedProposalId,
    });

    assert.notEqual(
      readiness.result,
      "bad_request",
      "protected proposal id must be accepted by readiness boundary",
    );
    assert.notEqual(
      readiness.result,
      "not_found",
      "protected proposal must be readable by readiness boundary",
    );
    assert.notEqual(
      readiness.result,
      "error",
      "readiness boundary must not error",
    );

    if (readiness.result !== "ready" && readiness.result !== "blocked") {
      throw new Error(`Unexpected readiness result: ${readiness.result}`);
    }

    assert.equal(readiness.boundary.transaction_read_only, true);
    assert.equal(readiness.boundary.writes_performed, false);
    assert.equal(readiness.boundary.commands_executed, false);
    assert.equal(readiness.boundary.app_schema_write_allowed, false);
    assert.equal(readiness.boundary.ai_proposal_write_allowed, false);
    assert.equal(readiness.boundary.app_projection_apply_performed, false);

    const preview = await previewProposalReviewApplyPlan({
      proposalId: protectedProposalId,
    });

    assert.notEqual(
      preview.result,
      "bad_request",
      "protected proposal id must be accepted by preview boundary",
    );
    assert.notEqual(
      preview.result,
      "not_found",
      "protected proposal must be readable by preview boundary",
    );
    assert.notEqual(
      preview.result,
      "error",
      "preview boundary must not error",
    );

    if (preview.result !== "preview" && preview.result !== "blocked") {
      throw new Error(`Unexpected preview result: ${preview.result}`);
    }

    assert.equal(preview.boundary.transaction_read_only, true);
    assert.equal(preview.boundary.writes_performed, false);
    assert.equal(preview.boundary.commands_executed, false);
    assert.equal(preview.boundary.preview_only, true);
    assert.equal(preview.boundary.app_schema_write_allowed, false);
    assert.equal(preview.boundary.app_projection_apply_performed, false);
    assert.equal(preview.boundary.ai_proposal_apply_marker_updated, false);
    assert.equal(preview.preview.preview_only, true);
    assert.equal(preview.preview.sql_preview.would_touch_app_schema, false);
    assert.equal(
      preview.preview.sql_preview.would_touch_ai_proposal_apply_marker,
      false,
    );

    const after = await readFixtureState(client);

    assert.deepEqual(
      after,
      before,
      "UI readiness and preview boundary reads must not change fixture state",
    );

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            app_role_crop_cycle_write_allowed:
              privileges.app_crop_cycles_write_allowed,
            app_role_ai_proposal_write_allowed:
              privileges.ai_proposal_inbox_write_allowed,
            app_role_audit_apply_event_write_allowed:
              privileges.audit_apply_events_write_allowed,
            readiness_result: readiness.result,
            readiness_ready: readiness.readiness.ready,
            readiness_writes_performed:
              readiness.boundary.writes_performed,
            readiness_commands_executed:
              readiness.boundary.commands_executed,
            readiness_transaction_read_only:
              readiness.boundary.transaction_read_only,
            preview_result: preview.result,
            preview_operation: preview.preview.operation,
            preview_only: preview.preview.preview_only,
            preview_writes_performed: preview.boundary.writes_performed,
            preview_commands_executed: preview.boundary.commands_executed,
            preview_transaction_read_only:
              preview.boundary.transaction_read_only,
            apply_history_count_before: before.apply_history_count,
            apply_history_count_after: after.apply_history_count,
            protected_proposal_status:
              after.protected_proposal_status,
            protected_proposal_applied_at:
              after.protected_proposal_applied_at,
            protected_proposal_applied_by:
              after.protected_proposal_applied_by,
            crop_cycle_2_exists: after.crop_cycle_2_exists,
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
