import { Client } from "pg";
import os from "node:os";

type Action = "verify" | "reject";

type Args = {
  factId?: number;
  action?: Action;
  reviewedBy?: string;
  reviewedByRole?: string;
  reason?: string;
  note?: string;
};

function requireEnv(name: string): string {
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
      case "--fact-id":
        parsed.factId = Number(value);
        break;
      case "--action":
        if (value !== "verify" && value !== "reject") {
          throw new Error("--action must be verify or reject");
        }
        parsed.action = value;
        break;
      case "--reviewed-by":
        parsed.reviewedBy = value;
        break;
      case "--reviewed-by-role":
        parsed.reviewedByRole = value;
        break;
      case "--reason":
        parsed.reason = value;
        break;
      case "--note":
        parsed.note = value;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }

    i += 1;
  }

  return parsed;
}

function validateArgs(args: Args): asserts args is Required<Pick<Args, "factId" | "action" | "reviewedBy">> & Args {
  if (!Number.isInteger(args.factId) || Number(args.factId) <= 0) {
    throw new Error("--fact-id must be a positive integer");
  }

  if (!args.action) {
    throw new Error("--action is required");
  }

  if (!args.reviewedBy || args.reviewedBy.trim().length === 0) {
    throw new Error("--reviewed-by is required");
  }

  if (args.action === "reject" && (!args.reason || args.reason.trim().length === 0)) {
    throw new Error("--reason is required when --action reject");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  validateArgs(args);

  const client = new Client({
    host: requireEnv("PGHOST"),
    port: Number(requireEnv("PGPORT")),
    database: requireEnv("PGDATABASE"),
    user: requireEnv("PGUSER"),
    password: requireEnv("PGPASSWORD"),
  });

  const workerId = `review_extracted_fact_v1:${os.hostname()}:${process.pid}`;
  const reviewedByRole = args.reviewedByRole ?? "human_reviewer";

  await client.connect();

  try {
    await client.query("begin");

    const factResult = await client.query(
      `
      select
        id,
        source_document_id,
        document_extraction_id,
        fact_key,
        fact_value_text,
        fact_value_json,
        verified,
        verified_by,
        verified_at,
        rejected,
        rejection_reason
      from knowledge.extracted_facts
      where id = $1
      for update
      `,
      [args.factId],
    );

    if (factResult.rowCount === 0) {
      await client.query("rollback");
      console.log(JSON.stringify({
        result: "not_found",
        fact_id: args.factId,
      }, null, 2));
      return;
    }

    const fact = factResult.rows[0];

    if (args.action === "verify") {
      if (fact.verified === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "already_verified",
          fact_id: fact.id,
          verified_by: fact.verified_by,
          verified_at: fact.verified_at,
        }, null, 2));
        return;
      }

      if (fact.rejected === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "refused",
          reason: "rejected_fact_cannot_be_verified",
          fact_id: fact.id,
          rejection_reason: fact.rejection_reason,
        }, null, 2));
        return;
      }

      const updateResult = await client.query(
        `
        update knowledge.extracted_facts
        set
          verified = true,
          verified_by = $2::text,
          verified_at = now(),
          rejected = false,
          rejection_reason = null,
          reviewed_by_role = $3::text,
          review_note = $4::text,
          review_metadata = review_metadata || jsonb_build_object(
            'review_action', 'verify',
            'review_worker', $5::text,
            'reviewed_by', $2::text,
            'reviewed_by_role', $3::text,
            'reviewed_at', now()
          )
        where id = $1
        returning
          id,
          fact_key,
          fact_value_text,
          verified,
          verified_by,
          verified_at,
          rejected,
          rejection_reason,
          reviewed_by_role,
          review_note
        `,
        [
          fact.id,
          args.reviewedBy,
          reviewedByRole,
          args.note ?? null,
          workerId,
        ],
      );

      await client.query("commit");

      console.log(JSON.stringify({
        result: "verified",
        fact: updateResult.rows[0],
      }, null, 2));
      return;
    }

    if (args.action === "reject") {
      if (fact.rejected === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "already_rejected",
          fact_id: fact.id,
          rejection_reason: fact.rejection_reason,
        }, null, 2));
        return;
      }

      if (fact.verified === true) {
        await client.query("rollback");
        console.log(JSON.stringify({
          result: "refused",
          reason: "verified_fact_cannot_be_rejected",
          fact_id: fact.id,
          verified_by: fact.verified_by,
          verified_at: fact.verified_at,
        }, null, 2));
        return;
      }

      const updateResult = await client.query(
        `
        update knowledge.extracted_facts
        set
          verified = false,
          verified_by = null,
          verified_at = null,
          rejected = true,
          rejection_reason = $2::text,
          reviewed_by_role = $3::text,
          review_note = $4::text,
          review_metadata = review_metadata || jsonb_build_object(
            'review_action', 'reject',
            'review_worker', $5::text,
            'reviewed_by', $6::text,
            'reviewed_by_role', $3::text,
            'reviewed_at', now()
          )
        where id = $1
        returning
          id,
          fact_key,
          fact_value_text,
          verified,
          verified_by,
          verified_at,
          rejected,
          rejection_reason,
          reviewed_by_role,
          review_note
        `,
        [
          fact.id,
          args.reason,
          reviewedByRole,
          args.note ?? null,
          workerId,
          args.reviewedBy,
        ],
      );

      await client.query("commit");

      console.log(JSON.stringify({
        result: "rejected",
        fact: updateResult.rows[0],
      }, null, 2));
      return;
    }

    throw new Error(`Unhandled action: ${args.action}`);
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
  process.exit(1);
});
