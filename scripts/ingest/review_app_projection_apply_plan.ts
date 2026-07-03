import { Client } from "pg";

type Action = "approve" | "reject";

type Args = {
  applyPlanId: number;
  action: Action;
  reviewedBy: string;
  reviewedByRole: string;
  note: string;
};

type ApplyPlanRow = {
  id: number;
  projection_candidate_id: number;
  target_schema: string;
  target_table: string;
  apply_plan_type: string;
  missing_fields: string[];
  readiness_status: string;
  status: string;
  reviewed: boolean;
  rejected: boolean;
  approved_for_app_apply: boolean;
  plan_payload: Record<string, unknown>;
  review_metadata: Record<string, unknown>;
};

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2).filter((arg) => arg !== "--");

  const parsed: Partial<Args> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const value = args[i + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--apply-plan-id") {
      const id = Number(value);
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error("--apply-plan-id must be a positive integer");
      }
      parsed.applyPlanId = id;
      i += 1;
      continue;
    }

    if (arg === "--action") {
      if (value !== "approve" && value !== "reject") {
        throw new Error("--action must be approve or reject");
      }
      parsed.action = value;
      i += 1;
      continue;
    }

    if (arg === "--reviewed-by") {
      parsed.reviewedBy = value;
      i += 1;
      continue;
    }

    if (arg === "--reviewed-by-role") {
      parsed.reviewedByRole = value;
      i += 1;
      continue;
    }

    if (arg === "--note") {
      parsed.note = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const required: Array<keyof Args> = [
    "applyPlanId",
    "action",
    "reviewedBy",
    "reviewedByRole",
    "note",
  ];

  for (const key of required) {
    const value = parsed[key];
    if (value === undefined || value === "") {
      throw new Error(`Missing required argument: ${key}`);
    }
  }

  return parsed as Args;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function hasCompletedFields(planPayload: Record<string, unknown>): boolean {
  const completed = asRecord(planPayload.completed_fields);
  return Object.keys(completed).length > 0;
}

function refused(reason: string, applyPlan?: ApplyPlanRow) {
  console.log(
    JSON.stringify(
      {
        result: "refused",
        reason,
        apply_plan_id: applyPlan?.id,
        readiness_status: applyPlan?.readiness_status,
        status: applyPlan?.status,
        reviewed: applyPlan?.reviewed,
        rejected: applyPlan?.rejected,
        approved_for_app_apply: applyPlan?.approved_for_app_apply,
        missing_fields: applyPlan?.missing_fields,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv);

  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  await client.connect();

  try {
    await client.query("begin");

    const applyPlanResult = await client.query<ApplyPlanRow>(
      `
      select
        id,
        projection_candidate_id,
        target_schema,
        target_table,
        apply_plan_type,
        missing_fields,
        readiness_status,
        status,
        reviewed,
        coalesce(rejected, false) as rejected,
        approved_for_app_apply,
        plan_payload,
        review_metadata
      from knowledge.app_projection_apply_plans
      where id = $1
      for update
      `,
      [args.applyPlanId],
    );

    const applyPlan = applyPlanResult.rows[0];

    if (!applyPlan) {
      await client.query("rollback");
      refused("apply_plan_not_found");
      return;
    }

    if (args.action === "approve") {
      if (
        applyPlan.reviewed ||
        applyPlan.approved_for_app_apply ||
        applyPlan.status === "reviewed"
      ) {
        await client.query("rollback");
        refused("already_reviewed_or_approved", applyPlan);
        return;
      }

      if (applyPlan.rejected || applyPlan.status === "rejected") {
        await client.query("rollback");
        refused("already_rejected", applyPlan);
        return;
      }

      if (applyPlan.readiness_status !== "ready") {
        await client.query("rollback");
        refused("readiness_status_not_ready", applyPlan);
        return;
      }

      if (applyPlan.missing_fields.length > 0) {
        await client.query("rollback");
        refused("missing_fields_remaining", applyPlan);
        return;
      }

      if (!hasCompletedFields(asRecord(applyPlan.plan_payload))) {
        await client.query("rollback");
        refused("completed_fields_missing", applyPlan);
        return;
      }

      const nextReviewMetadata = {
        ...asRecord(applyPlan.review_metadata),
        app_apply_approval: {
          approved_by: args.reviewedBy,
          approved_by_role: args.reviewedByRole,
          approved_at: new Date().toISOString(),
          note: args.note,
          worker: "apply_plan_review_worker_v1",
        },
      };

      await client.query(
        `
        update knowledge.app_projection_apply_plans
        set
          reviewed = true,
          reviewed_by = $2,
          reviewed_by_role = $3,
          reviewed_at = now(),
          review_note = $4,
          status = 'reviewed',
          approved_for_app_apply = true,
          approved_at = now(),
          approved_by = $2,
          approval_note = $4,
          review_metadata = $5::jsonb,
          updated_at = now()
        where id = $1
        `,
        [
          applyPlan.id,
          args.reviewedBy,
          args.reviewedByRole,
          args.note,
          JSON.stringify(nextReviewMetadata),
        ],
      );

      await client.query("commit");

      console.log(
        JSON.stringify(
          {
            result: "approved",
            apply_plan_id: applyPlan.id,
            readiness_status: applyPlan.readiness_status,
            status: "reviewed",
            reviewed: true,
            rejected: false,
            approved_for_app_apply: true,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (args.action === "reject") {
      if (
        applyPlan.reviewed ||
        applyPlan.approved_for_app_apply ||
        applyPlan.status === "reviewed"
      ) {
        await client.query("rollback");
        refused("already_reviewed_or_approved", applyPlan);
        return;
      }

      if (applyPlan.rejected || applyPlan.status === "rejected") {
        await client.query("rollback");
        refused("already_rejected", applyPlan);
        return;
      }

      const nextReviewMetadata = {
        ...asRecord(applyPlan.review_metadata),
        app_apply_rejection: {
          rejected_by: args.reviewedBy,
          rejected_by_role: args.reviewedByRole,
          rejected_at: new Date().toISOString(),
          note: args.note,
          worker: "apply_plan_review_worker_v1",
        },
      };

      await client.query(
        `
        update knowledge.app_projection_apply_plans
        set
          rejected = true,
          rejection_reason = $2,
          status = 'rejected',
          reviewed = false,
          reviewed_by = $3,
          reviewed_by_role = $4,
          reviewed_at = now(),
          review_note = $2,
          approved_for_app_apply = false,
          approval_note = null,
          approved_at = null,
          approved_by = null,
          review_metadata = $5::jsonb,
          updated_at = now()
        where id = $1
        `,
        [
          applyPlan.id,
          args.note,
          args.reviewedBy,
          args.reviewedByRole,
          JSON.stringify(nextReviewMetadata),
        ],
      );

      await client.query("commit");

      console.log(
        JSON.stringify(
          {
            result: "rejected",
            apply_plan_id: applyPlan.id,
            status: "rejected",
            rejected: true,
            approved_for_app_apply: false,
          },
          null,
          2,
        ),
      );
      return;
    }

    throw new Error(`Unhandled action: ${args.action}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
