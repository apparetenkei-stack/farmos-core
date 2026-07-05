import { randomUUID } from "node:crypto";
import { Client, type ClientConfig } from "pg";
import { previewProposalReviewApplyPlan } from "./api_boundary/proposal_review_apply_plan_preview_read_api_boundary";
import { applyProposalReviewApplyPlanCommand } from "./api_boundary/proposal_review_apply_command_boundary";

const EXISTING_TARGET_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

type ProposalFixture = {
  id: string;
  title: string;
  status: "pending" | "approved";
  payload: Record<string, unknown>;
  reviewed: boolean;
  applied: boolean;
};

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? "farmos_local_admin",
    password: process.env.PGPASSWORD,
    application_name: "farmos_test_proposal_review_apply_command_boundary",
  };

  return new Client(config);
}

function assertOk(condition: unknown, message: string, details?: unknown): void {
  if (!condition) {
    console.error(JSON.stringify({ message, details }, null, 2));
    throw new Error(message);
  }
}

async function scalarNumber(client: Client, sql: string, params: unknown[] = []): Promise<number> {
  const result = await client.query(sql, params);
  return Number(Object.values(result.rows[0] ?? { value: 0 })[0]);
}


async function createDay34ApplyPlanFixture(
  client: Client,
  fixtureId: string,
  candidate: Record<string, unknown>,
): Promise<number> {
  const projectionCandidateKey = `day34:${fixtureId}:crop_cycle_candidate`;
  const applyPlanKey = `day34:${fixtureId}:crop_cycle_apply_plan`;

  const projectionCandidate = await client.query(
    `
      insert into knowledge.projection_candidates (
        source_document_id,
        document_extraction_id,
        candidate_type,
        target_schema,
        target_table,
        candidate_key,
        candidate_payload,
        supporting_extracted_fact_ids,
        confidence,
        status,
        generated_by,
        reviewed,
        reviewed_by,
        reviewed_at,
        review_note,
        rejected,
        reviewed_by_role,
        approved_for_app_projection,
        approved_at,
        approved_by,
        approval_note,
        review_metadata
      )
      values (
        3,
        3,
        'crop_cycle_candidate',
        'app',
        'crop_cycles',
        $1,
        $2::jsonb,
        '{}',
        0.95,
        'reviewed',
        'day34_apply_command_fixture',
        true,
        'hayate',
        now(),
        'Day34 fixture projection candidate for CLI-only apply command boundary.',
        false,
        'owner',
        true,
        now(),
        'hayate',
        'Day34 fixture projection candidate approved for app projection.',
        $3::jsonb
      )
      returning id
    `,
    [
      projectionCandidateKey,
      JSON.stringify(candidate),
      JSON.stringify({
        day: 34,
        fixture: true,
        boundary: "proposal_review_apply_command_boundary",
      }),
    ],
  );

  const projectionCandidateId = Number(projectionCandidate.rows[0].id);

  const applyPlan = await client.query(
    `
      insert into knowledge.app_projection_apply_plans (
        projection_candidate_id,
        source_document_id,
        document_extraction_id,
        target_schema,
        target_table,
        apply_plan_type,
        apply_plan_key,
        plan_payload,
        required_fields,
        missing_fields,
        readiness_status,
        status,
        generated_by,
        reviewed,
        reviewed_by,
        reviewed_by_role,
        reviewed_at,
        review_note,
        rejected,
        approved_for_app_apply,
        approved_at,
        approved_by,
        approval_note,
        review_metadata
      )
      values (
        $1,
        3,
        3,
        'app',
        'crop_cycles',
        'crop_cycle_apply_plan',
        $2,
        $3::jsonb,
        array['season_year', 'crop', 'variety', 'field_name', 'sowing_date_text', 'transplant_date_text']::text[],
        '{}',
        'ready',
        'reviewed',
        'day34_apply_command_fixture',
        true,
        'hayate',
        'owner',
        now(),
        'Day34 fixture apply plan for CLI-only apply command boundary.',
        false,
        true,
        now(),
        'hayate',
        'Day34 fixture apply plan approved for app apply.',
        $4::jsonb
      )
      returning id
    `,
    [
      projectionCandidateId,
      applyPlanKey,
      JSON.stringify({
        day: 34,
        fixture: true,
        target: {
          schema: "app",
          table: "crop_cycles",
        },
        candidate,
        source: {
          source_document_id: 3,
          document_extraction_id: 3,
          projection_candidate_id: projectionCandidateId,
        },
      }),
      JSON.stringify({
        day: 34,
        fixture: true,
        boundary: "proposal_review_apply_command_boundary",
      }),
    ],
  );

  return Number(applyPlan.rows[0].id);
}


async function insertProposalFixture(client: Client, fixture: ProposalFixture): Promise<void> {
  const now = fixture.reviewed ? new Date() : null;
  const appliedAt = fixture.applied ? new Date() : null;

  await client.query(
    `
      insert into ai.proposal_inbox (
        id,
        proposal_type,
        title,
        body,
        status,
        payload_json,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_by,
        applied_at
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)
    `,
    [
      fixture.id,
      "day34_apply_command_test",
      fixture.title,
      fixture.title,
      fixture.status,
      JSON.stringify(fixture.payload),
      fixture.reviewed ? "hayate" : null,
      now,
      fixture.reviewed ? "Day34 fixture setup. Status is prepared for apply command boundary testing." : null,
      fixture.applied ? "local-admin-fixture" : null,
      appliedAt,
    ],
  );

  if (fixture.reviewed) {
    await client.query(
      `
        insert into audit.proposal_review_decision_events (
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata
        )
        values (
          $1,
          'approve_review',
          'Day34 fixture approve event for apply command boundary testing.',
          'hayate',
          'owner',
          'local_cli',
          $2::jsonb
        )
      `,
      [
        fixture.id,
        JSON.stringify({
          day: 34,
          fixture: true,
          boundary: "proposal_review_apply_command_boundary",
        }),
      ],
    );
  }
}

async function readProposalMarker(client: Client, proposalId: string): Promise<{
  status: string;
  applied_by: string | null;
  applied_at: Date | null;
}> {
  const result = await client.query(
    `
      select
        status,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  assertOk(row, "proposal marker row must exist", { proposalId });

  return {
    status: row.status,
    applied_by: row.applied_by,
    applied_at: row.applied_at,
  };
}

async function readCropCycleById(client: Client, id: number): Promise<Record<string, unknown>> {
  const result = await client.query(
    `
      select
        id,
        source_extracted_fact_ids,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived
      from app.crop_cycles
      where id = $1
    `,
    [id],
  );

  const row = result.rows[0];
  assertOk(row, "crop cycle row must exist", { id });
  return row;
}

async function readPrivileges(client: Client): Promise<Record<string, unknown>[]> {
  const result = await client.query(`
    select
      'app.crop_cycles' as object_name,
      has_table_privilege('farmos_app_local', 'app.crop_cycles', 'SELECT') as can_select,
      has_table_privilege('farmos_app_local', 'app.crop_cycles', 'INSERT') as can_insert,
      has_table_privilege('farmos_app_local', 'app.crop_cycles', 'UPDATE') as can_update,
      has_table_privilege('farmos_app_local', 'app.crop_cycles', 'DELETE') as can_delete,
      has_table_privilege('farmos_app_local', 'app.crop_cycles', 'TRUNCATE') as can_truncate
    union all
    select
      'ai.proposal_inbox' as object_name,
      has_table_privilege('farmos_app_local', 'ai.proposal_inbox', 'SELECT') as can_select,
      has_table_privilege('farmos_app_local', 'ai.proposal_inbox', 'INSERT') as can_insert,
      has_table_privilege('farmos_app_local', 'ai.proposal_inbox', 'UPDATE') as can_update,
      has_table_privilege('farmos_app_local', 'ai.proposal_inbox', 'DELETE') as can_delete,
      has_table_privilege('farmos_app_local', 'ai.proposal_inbox', 'TRUNCATE') as can_truncate
    union all
    select
      'audit.proposal_review_decision_events' as object_name,
      has_table_privilege('farmos_app_local', 'audit.proposal_review_decision_events', 'SELECT') as can_select,
      has_table_privilege('farmos_app_local', 'audit.proposal_review_decision_events', 'INSERT') as can_insert,
      has_table_privilege('farmos_app_local', 'audit.proposal_review_decision_events', 'UPDATE') as can_update,
      has_table_privilege('farmos_app_local', 'audit.proposal_review_decision_events', 'DELETE') as can_delete,
      has_table_privilege('farmos_app_local', 'audit.proposal_review_decision_events', 'TRUNCATE') as can_truncate
  `);

  return result.rows;
}

function cropCycleMatchesBeforeAfter(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();

  try {
    const insertId = randomUUID();
    const noOpId = randomUUID();
    const updateId = randomUUID();
    const pendingId = randomUUID();
    const alreadyAppliedId = randomUUID();
    const missingId = randomUUID();

    const insertFieldName = `Day34 Apply Test 圃場 ${insertId.slice(0, 8)}`;

    const insertCandidate = {
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: insertFieldName,
      sowing_date_text: "9/22",
      transplant_date_text: "11/17",
    };

    const insertSourceApplyPlanId = await createDay34ApplyPlanFixture(
      client,
      insertId,
      insertCandidate,
    );

    const basePayload = {
      day: 34,
      fixture: true,
      apply_intent: "future_crop_cycle_projection_apply",
      target_schema: "app",
      target_table: "crop_cycles",
    };

    const fixtures: ProposalFixture[] = [
      {
        id: insertId,
        title: "Day34 insert apply command fixture",
        status: "approved",
        reviewed: true,
        applied: false,
        payload: {
          ...basePayload,
          source_apply_plan_id: insertSourceApplyPlanId,
          candidate: insertCandidate,
        },
      },
      {
        id: noOpId,
        title: "Day34 no-op apply command fixture",
        status: "approved",
        reviewed: true,
        applied: false,
        payload: {
          ...basePayload,
          candidate: {
            crop: "ブロッコリー",
            variety: "ピクセル",
            field_name: "A圃場",
            sowing_date_text: "9/20",
            transplant_date_text: "11/15",
          },
        },
      },
      {
        id: updateId,
        title: "Day34 blocked update apply command fixture",
        status: "approved",
        reviewed: true,
        applied: false,
        payload: {
          ...basePayload,
          candidate: {
            crop: "ブロッコリー",
            variety: "ピクセル",
            field_name: "A圃場",
            sowing_date_text: "9/21",
            transplant_date_text: "11/16",
          },
        },
      },
      {
        id: pendingId,
        title: "Day34 pending apply command fixture",
        status: "pending",
        reviewed: false,
        applied: false,
        payload: {
          ...basePayload,
          candidate: {
            crop: "ブロッコリー",
            variety: "ピクセル",
            field_name: `Day34 Pending Test 圃場 ${pendingId.slice(0, 8)}`,
            sowing_date_text: "9/22",
            transplant_date_text: "11/17",
          },
        },
      },
      {
        id: alreadyAppliedId,
        title: "Day34 already applied command fixture",
        status: "approved",
        reviewed: true,
        applied: true,
        payload: {
          ...basePayload,
          candidate: {
            crop: "ブロッコリー",
            variety: "ピクセル",
            field_name: `Day34 Already Applied Test 圃場 ${alreadyAppliedId.slice(0, 8)}`,
            sowing_date_text: "9/22",
            transplant_date_text: "11/17",
          },
        },
      },
    ];

    for (const fixture of fixtures) {
      await insertProposalFixture(client, fixture);
    }

    const cropCycleCountBefore = await scalarNumber(
      client,
      "select count(*)::int as value from app.crop_cycles",
    );

    const existingCropCycleBefore = await readCropCycleById(client, 2);

    const insertPreview = await previewProposalReviewApplyPlan({ proposalId: insertId, allowPrivilegedReadOnlyCaller: true });
    assertOk((insertPreview as { result?: string }).result === "preview", "insert fixture preview must be preview", insertPreview);
    assertOk(
      ((insertPreview as { preview?: { operation?: string } }).preview?.operation) === "insert_candidate",
      "insert fixture preview operation must be insert_candidate",
      insertPreview,
    );

    const dryRun = await applyProposalReviewApplyPlanCommand({
      proposalId: insertId,
      commit: false,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });

    assertOk(dryRun.result === "ok", "insert dry-run result must be ok", dryRun);
    assertOk(dryRun.mode === "dry_run", "insert dry-run mode must be dry_run", dryRun);
    assertOk(dryRun.apply.operation === "insert", "insert dry-run apply operation must be insert", dryRun);
    assertOk(dryRun.boundary.writes_performed === false, "insert dry-run must not perform writes", dryRun);
    assertOk(dryRun.boundary.commands_executed === false, "insert dry-run must not execute commands", dryRun);
    assertOk(dryRun.boundary.transaction_read_only === true, "insert dry-run must use read-only transaction", dryRun);

    const cropCycleCountAfterDryRun = await scalarNumber(
      client,
      "select count(*)::int as value from app.crop_cycles",
    );
    assertOk(
      cropCycleCountAfterDryRun === cropCycleCountBefore,
      "insert dry-run must not change app.crop_cycles count",
      { cropCycleCountBefore, cropCycleCountAfterDryRun },
    );

    const insertMarkerAfterDryRun = await readProposalMarker(client, insertId);
    assertOk(insertMarkerAfterDryRun.applied_by === null, "insert dry-run must not set applied_by", insertMarkerAfterDryRun);
    assertOk(insertMarkerAfterDryRun.applied_at === null, "insert dry-run must not set applied_at", insertMarkerAfterDryRun);

    const insertCommit = await applyProposalReviewApplyPlanCommand({
      proposalId: insertId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });

    assertOk(insertCommit.result === "ok", "insert commit result must be ok", insertCommit);
    assertOk(insertCommit.mode === "committed", "insert commit mode must be committed", insertCommit);
    assertOk(insertCommit.apply.operation === "insert", "insert commit apply operation must be insert", insertCommit);
    assertOk(
      typeof insertCommit.apply.inserted_crop_cycle_id === "number",
      "insert commit must return inserted crop cycle id",
      insertCommit,
    );
    assertOk(insertCommit.apply.app_crop_cycles_rows_inserted === 1, "insert commit must insert one app.crop_cycles row", insertCommit);
    assertOk(insertCommit.boundary.app_crop_cycles_insert_performed === true, "insert commit boundary must report crop cycle insert", insertCommit);
    assertOk(insertCommit.boundary.ai_proposal_apply_marker_updated === true, "insert commit must update apply marker", insertCommit);
    assertOk(insertCommit.boundary.ai_proposal_status_updated === false, "insert commit must not update proposal status", insertCommit);

    const cropCycleCountAfterInsertCommit = await scalarNumber(
      client,
      "select count(*)::int as value from app.crop_cycles",
    );
    assertOk(
      cropCycleCountAfterInsertCommit === cropCycleCountBefore + 1,
      "insert commit must increase app.crop_cycles count by one",
      { cropCycleCountBefore, cropCycleCountAfterInsertCommit },
    );

    const insertedRowCount = await scalarNumber(
      client,
      `
        select count(*)::int as value
        from app.crop_cycles
        where field_name = $1
          and crop = 'ブロッコリー'
          and variety = 'ピクセル'
          and sowing_date_text = '9/22'
          and transplant_date_text = '11/17'
          and archived = false
      `,
      [insertFieldName],
    );
    assertOk(insertedRowCount === 1, "insert commit inserted row must be readable", { insertFieldName, insertedRowCount });

    const insertMarkerAfterCommit = await readProposalMarker(client, insertId);
    assertOk(insertMarkerAfterCommit.status === "approved", "insert commit must keep status approved", insertMarkerAfterCommit);
    assertOk(insertMarkerAfterCommit.applied_by === "hayate", "insert commit must set applied_by", insertMarkerAfterCommit);
    assertOk(insertMarkerAfterCommit.applied_at !== null, "insert commit must set applied_at", insertMarkerAfterCommit);

    const noOpPreview = await previewProposalReviewApplyPlan({ proposalId: noOpId, allowPrivilegedReadOnlyCaller: true });
    assertOk((noOpPreview as { result?: string }).result === "preview", "no-op fixture preview must be preview", noOpPreview);
    assertOk(
      ((noOpPreview as { preview?: { operation?: string } }).preview?.operation) === "no_op_candidate",
      "no-op fixture preview operation must be no_op_candidate",
      noOpPreview,
    );

    const countBeforeNoOpCommit = await scalarNumber(
      client,
      "select count(*)::int as value from app.crop_cycles",
    );

    const noOpCommit = await applyProposalReviewApplyPlanCommand({
      proposalId: noOpId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });

    assertOk(noOpCommit.result === "ok", "no-op commit result must be ok", noOpCommit);
    assertOk(noOpCommit.mode === "committed", "no-op commit mode must be committed", noOpCommit);
    assertOk(noOpCommit.apply.operation === "no_op", "no-op commit operation must be no_op", noOpCommit);
    assertOk(noOpCommit.apply.app_crop_cycles_rows_inserted === 0, "no-op commit must not insert app.crop_cycles", noOpCommit);
    assertOk(noOpCommit.boundary.app_schema_writes_performed === false, "no-op commit must not perform app schema writes", noOpCommit);
    assertOk(noOpCommit.boundary.ai_proposal_apply_marker_updated === true, "no-op commit must update proposal apply marker", noOpCommit);

    const countAfterNoOpCommit = await scalarNumber(
      client,
      "select count(*)::int as value from app.crop_cycles",
    );
    assertOk(
      countAfterNoOpCommit === countBeforeNoOpCommit,
      "no-op commit must not change app.crop_cycles count",
      { countBeforeNoOpCommit, countAfterNoOpCommit },
    );

    const noOpMarkerAfterCommit = await readProposalMarker(client, noOpId);
    assertOk(noOpMarkerAfterCommit.status === "approved", "no-op commit must keep status approved", noOpMarkerAfterCommit);
    assertOk(noOpMarkerAfterCommit.applied_by === "hayate", "no-op commit must set applied_by", noOpMarkerAfterCommit);
    assertOk(noOpMarkerAfterCommit.applied_at !== null, "no-op commit must set applied_at", noOpMarkerAfterCommit);

    const updatePreview = await previewProposalReviewApplyPlan({ proposalId: updateId, allowPrivilegedReadOnlyCaller: true });
    assertOk((updatePreview as { result?: string }).result === "preview", "update fixture preview must be preview", updatePreview);
    assertOk(
      ((updatePreview as { preview?: { operation?: string } }).preview?.operation) === "update_candidate",
      "update fixture preview operation must be update_candidate",
      updatePreview,
    );

    const updateApply = await applyProposalReviewApplyPlanCommand({
      proposalId: updateId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });
    assertOk(updateApply.result === "blocked", "update_candidate apply must be blocked", updateApply);
    assertOk(
      updateApply.blocked_reasons.includes("unsupported_preview_operation"),
      "update_candidate block reason must be unsupported_preview_operation",
      updateApply,
    );

    const pendingApply = await applyProposalReviewApplyPlanCommand({
      proposalId: pendingId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });
    assertOk(pendingApply.result === "blocked", "pending proposal apply must be blocked", pendingApply);

    const alreadyAppliedApply = await applyProposalReviewApplyPlanCommand({
      proposalId: alreadyAppliedId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });
    assertOk(alreadyAppliedApply.result === "blocked", "already applied proposal apply must be blocked", alreadyAppliedApply);

    const badRequest = await applyProposalReviewApplyPlanCommand({
      proposalId: "not-a-uuid",
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });
    assertOk(badRequest.result === "bad_request", "bad proposal id must return bad_request", badRequest);

    const missing = await applyProposalReviewApplyPlanCommand({
      proposalId: missingId,
      commit: true,
      appliedBy: "hayate",
      appliedByRole: "owner",
    });
    assertOk(missing.result === "not_found", "missing proposal must return not_found", missing);

    const existingTarget = await readProposalMarker(client, EXISTING_TARGET_PROPOSAL_ID);
    assertOk(existingTarget.status === "pending", "existing target proposal must remain pending", existingTarget);
    assertOk(existingTarget.applied_by === null, "existing target proposal applied_by must remain null", existingTarget);
    assertOk(existingTarget.applied_at === null, "existing target proposal applied_at must remain null", existingTarget);

    const existingCropCycleAfter = await readCropCycleById(client, 2);
    assertOk(
      cropCycleMatchesBeforeAfter(existingCropCycleBefore, existingCropCycleAfter),
      "existing app.crop_cycles id=2 must remain unchanged",
      { existingCropCycleBefore, existingCropCycleAfter },
    );

    const privileges = await readPrivileges(client);
    const appCropCyclesPrivileges = privileges.find((row) => row.object_name === "app.crop_cycles");
    const proposalInboxPrivileges = privileges.find((row) => row.object_name === "ai.proposal_inbox");
    const auditPrivileges = privileges.find((row) => row.object_name === "audit.proposal_review_decision_events");

    assertOk(appCropCyclesPrivileges?.can_select === true, "farmos_app_local must keep app.crop_cycles SELECT", appCropCyclesPrivileges);
    assertOk(appCropCyclesPrivileges?.can_insert === false, "farmos_app_local must not get app.crop_cycles INSERT", appCropCyclesPrivileges);
    assertOk(appCropCyclesPrivileges?.can_update === false, "farmos_app_local must not get app.crop_cycles UPDATE", appCropCyclesPrivileges);
    assertOk(appCropCyclesPrivileges?.can_delete === false, "farmos_app_local must not get app.crop_cycles DELETE", appCropCyclesPrivileges);
    assertOk(appCropCyclesPrivileges?.can_truncate === false, "farmos_app_local must not get app.crop_cycles TRUNCATE", appCropCyclesPrivileges);

    assertOk(proposalInboxPrivileges?.can_select === true, "farmos_app_local must keep ai.proposal_inbox SELECT", proposalInboxPrivileges);
    assertOk(proposalInboxPrivileges?.can_insert === false, "farmos_app_local must not get ai.proposal_inbox INSERT", proposalInboxPrivileges);
    assertOk(proposalInboxPrivileges?.can_update === false, "farmos_app_local must not get ai.proposal_inbox UPDATE", proposalInboxPrivileges);
    assertOk(proposalInboxPrivileges?.can_delete === false, "farmos_app_local must not get ai.proposal_inbox DELETE", proposalInboxPrivileges);
    assertOk(proposalInboxPrivileges?.can_truncate === false, "farmos_app_local must not get ai.proposal_inbox TRUNCATE", proposalInboxPrivileges);

    assertOk(auditPrivileges?.can_select === true, "farmos_app_local must keep audit SELECT", auditPrivileges);
    assertOk(auditPrivileges?.can_insert === true, "farmos_app_local must keep audit INSERT", auditPrivileges);
    assertOk(auditPrivileges?.can_update === false, "farmos_app_local must not get audit UPDATE", auditPrivileges);
    assertOk(auditPrivileges?.can_delete === false, "farmos_app_local must not get audit DELETE", auditPrivileges);
    assertOk(auditPrivileges?.can_truncate === false, "farmos_app_local must not get audit TRUNCATE", auditPrivileges);

    console.log(JSON.stringify({
      result: "ok",
      checks: {
        insert_proposal_id: insertId,
        insert_field_name: insertFieldName,
        inserted_crop_cycle_id: insertCommit.apply.inserted_crop_cycle_id,
        no_op_proposal_id: noOpId,
        update_candidate_blocked: updateApply.result,
        pending_blocked: pendingApply.result,
        already_applied_blocked: alreadyAppliedApply.result,
        bad_request_result: badRequest.result,
        missing_result: missing.result,
        existing_target_status: existingTarget.status,
        app_crop_cycles_count_before: cropCycleCountBefore,
        app_crop_cycles_count_after_insert_commit: cropCycleCountAfterInsertCommit,
        app_crop_cycles_count_after_no_op_commit: countAfterNoOpCommit,
        app_role_privileges_preserved: true,
      },
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
