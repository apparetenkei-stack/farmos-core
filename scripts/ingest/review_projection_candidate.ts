import { Client } from "pg";

type Action = "approve" | "reject";

type Args = {
  projectionCandidateId?: number;
  action?: Action;
  reviewedBy?: string;
  reviewedByRole?: string;
  note?: string;
  rejectionReason?: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2).filter((arg) => arg !== "--");
  const parsed: Args = {};

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];

    if (!key.startsWith("--")) {
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    switch (key) {
      case "--projection-candidate-id":
        parsed.projectionCandidateId = Number(value);
        i += 1;
        break;
      case "--action":
        if (value !== "approve" && value !== "reject") {
          throw new Error("--action must be approve or reject");
        }
        parsed.action = value;
        i += 1;
        break;
      case "--reviewed-by":
        parsed.reviewedBy = value;
        i += 1;
        break;
      case "--reviewed-by-role":
        parsed.reviewedByRole = value;
        i += 1;
        break;
      case "--note":
        parsed.note = value;
        i += 1;
        break;
      case "--rejection-reason":
        parsed.rejectionReason = value;
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }

  return parsed;
}

function validateArgs(args: Args): asserts args is Required<Pick<Args, "projectionCandidateId" | "action" | "reviewedBy">> & Args {
  if (!args.projectionCandidateId || !Number.isInteger(args.projectionCandidateId)) {
    throw new Error("--projection-candidate-id is required and must be an integer");
  }

  if (!args.action) {
    throw new Error("--action approve|reject is required");
  }

  if (!args.reviewedBy) {
    throw new Error("--reviewed-by is required");
  }

  if (args.action === "reject" && !args.rejectionReason) {
    throw new Error("--rejection-reason is required when action is reject");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  validateArgs(args);

  const client = new Client({
    host: readRequiredEnv("PGHOST"),
    port: Number(process.env.PGPORT ?? "5432"),
    database: readRequiredEnv("PGDATABASE"),
    user: readRequiredEnv("PGUSER"),
    password: readRequiredEnv("PGPASSWORD"),
  });

  await client.connect();

  try {
    await client.query("begin");

    const existingResult = await client.query(
      `
      select
        id,
        status,
        reviewed,
        rejected,
        approved_for_app_projection,
        candidate_payload,
        supporting_extracted_fact_ids
      from knowledge.projection_candidates
      where id = $1
      for update
      `,
      [args.projectionCandidateId],
    );

    if (existingResult.rowCount === 0) {
      await client.query("rollback");
      console.log(JSON.stringify({
        result: "error",
        message: "Projection candidate not found",
        projection_candidate_id: args.projectionCandidateId,
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    const candidate = existingResult.rows[0];

    if (args.action === "approve") {
      if (candidate.rejected === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "error",
          message: "Rejected projection candidate cannot be approved",
          projection_candidate_id: args.projectionCandidateId,
        }, null, 2));
        process.exitCode = 1;
        return;
      }

      if (candidate.approved_for_app_projection === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "error",
          message: "Projection candidate is already approved",
          projection_candidate_id: args.projectionCandidateId,
        }, null, 2));
        process.exitCode = 1;
        return;
      }

      const updateResult = await client.query(
        `
        update knowledge.projection_candidates
        set
          status = 'reviewed',
          reviewed = true,
          reviewed_by = $2,
          reviewed_by_role = $3,
          reviewed_at = now(),
          review_note = $4,
          rejected = false,
          approved_for_app_projection = true,
          approved_by = $2,
          approved_at = now(),
          approval_note = $4,
          review_metadata = review_metadata || $5::jsonb
        where id = $1
        returning
          id,
          status,
          reviewed,
          reviewed_by,
          reviewed_by_role,
          rejected,
          approved_for_app_projection,
          approved_by,
          supporting_extracted_fact_ids
        `,
        [
          args.projectionCandidateId,
          args.reviewedBy,
          args.reviewedByRole ?? null,
          args.note ?? null,
          JSON.stringify({
            day: 13,
            action: "approve",
            cli: "review_projection_candidate",
            version: "v1",
          }),
        ],
      );

      await client.query("commit");

      const row = updateResult.rows[0];

      console.log(JSON.stringify({
        result: "approved",
        projection_candidate_id: row.id,
        status: row.status,
        reviewed: row.reviewed,
        reviewed_by: row.reviewed_by,
        reviewed_by_role: row.reviewed_by_role,
        rejected: row.rejected,
        approved_for_app_projection: row.approved_for_app_projection,
        approved_by: row.approved_by,
        supporting_extracted_fact_ids: row.supporting_extracted_fact_ids,
      }, null, 2));

      return;
    }

    if (args.action === "reject") {
      if (candidate.approved_for_app_projection === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "error",
          message: "Approved projection candidate cannot be rejected",
          projection_candidate_id: args.projectionCandidateId,
        }, null, 2));
        process.exitCode = 1;
        return;
      }

      if (candidate.rejected === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "error",
          message: "Projection candidate is already rejected",
          projection_candidate_id: args.projectionCandidateId,
        }, null, 2));
        process.exitCode = 1;
        return;
      }

      const updateResult = await client.query(
        `
        update knowledge.projection_candidates
        set
          status = 'rejected',
          rejected = true,
          rejection_reason = $2,
          reviewed_by = $3,
          reviewed_by_role = $4,
          reviewed_at = now(),
          review_note = $5,
          approved_for_app_projection = false,
          approved_by = null,
          approved_at = null,
          approval_note = null,
          review_metadata = review_metadata || $6::jsonb
        where id = $1
        returning
          id,
          status,
          reviewed,
          reviewed_by,
          reviewed_by_role,
          rejected,
          rejection_reason,
          approved_for_app_projection,
          supporting_extracted_fact_ids
        `,
        [
          args.projectionCandidateId,
          args.rejectionReason,
          args.reviewedBy,
          args.reviewedByRole ?? null,
          args.note ?? null,
          JSON.stringify({
            day: 13,
            action: "reject",
            cli: "review_projection_candidate",
            version: "v1",
          }),
        ],
      );

      await client.query("commit");

      const row = updateResult.rows[0];

      console.log(JSON.stringify({
        result: "rejected",
        projection_candidate_id: row.id,
        status: row.status,
        reviewed: row.reviewed,
        reviewed_by: row.reviewed_by,
        reviewed_by_role: row.reviewed_by_role,
        rejected: row.rejected,
        rejection_reason: row.rejection_reason,
        approved_for_app_projection: row.approved_for_app_projection,
        supporting_extracted_fact_ids: row.supporting_extracted_fact_ids,
      }, null, 2));

      return;
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    result: "error",
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
