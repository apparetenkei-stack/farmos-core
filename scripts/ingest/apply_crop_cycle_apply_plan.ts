import { Client } from "pg";

type Args = {
  applyPlanId: number;
  appliedBy: string;
  appliedByRole: string;
};

type ApplyPlanRow = {
  id: number;
  projection_candidate_id: number;
  source_document_id: number | null;
  document_extraction_id: number | null;
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
};

type ProjectionCandidateRow = {
  id: number;
  supporting_extracted_fact_ids: number[] | null;
};

type ExistingCropCycleRow = {
  id: number;
};

type InsertedCropCycleRow = {
  id: number;
  season_year: number;
  crop: string;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
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

    if (arg === "--applied-by") {
      parsed.appliedBy = value;
      i += 1;
      continue;
    }

    if (arg === "--applied-by-role") {
      parsed.appliedByRole = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const required: Array<keyof Args> = [
    "applyPlanId",
    "appliedBy",
    "appliedByRole",
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

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asRequiredString(value: unknown, fieldName: string): string {
  const result = asString(value);
  if (!result) {
    throw new Error(`completed_fields.${fieldName} is required`);
  }
  return result;
}

function asRequiredInteger(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }

  throw new Error(`completed_fields.${fieldName} must be an integer`);
}

function toIntegerOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }

  return null;
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(toIntegerOrNull)
    .filter((item): item is number => item !== null);
}

function uniqueSortedNumbers(values: unknown[]): number[] {
  return Array.from(
    new Set(
      values
        .map(toIntegerOrNull)
        .filter((value): value is number => value !== null),
    ),
  ).sort((a, b) => a - b);
}

function refused(reason: string, applyPlan?: ApplyPlanRow) {
  console.log(
    JSON.stringify(
      {
        result: "refused",
        reason,
        apply_plan_id: applyPlan?.id,
        target_schema: applyPlan?.target_schema,
        target_table: applyPlan?.target_table,
        apply_plan_type: applyPlan?.apply_plan_type,
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
        source_document_id,
        document_extraction_id,
        target_schema,
        target_table,
        apply_plan_type,
        missing_fields,
        readiness_status,
        status,
        reviewed,
        coalesce(rejected, false) as rejected,
        approved_for_app_apply,
        plan_payload
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

    if (applyPlan.target_schema !== "app") {
      await client.query("rollback");
      refused("target_schema_not_app", applyPlan);
      return;
    }

    if (applyPlan.target_table !== "crop_cycles") {
      await client.query("rollback");
      refused("target_table_not_crop_cycles", applyPlan);
      return;
    }

    if (applyPlan.apply_plan_type !== "crop_cycle_apply_plan") {
      await client.query("rollback");
      refused("apply_plan_type_not_supported", applyPlan);
      return;
    }

    if (applyPlan.readiness_status !== "ready") {
      await client.query("rollback");
      refused("readiness_status_not_ready", applyPlan);
      return;
    }

    if (applyPlan.status !== "reviewed") {
      await client.query("rollback");
      refused("status_not_reviewed", applyPlan);
      return;
    }

    if (!applyPlan.reviewed) {
      await client.query("rollback");
      refused("not_reviewed", applyPlan);
      return;
    }

    if (applyPlan.rejected) {
      await client.query("rollback");
      refused("rejected_apply_plan", applyPlan);
      return;
    }

    if (!applyPlan.approved_for_app_apply) {
      await client.query("rollback");
      refused("not_approved_for_app_apply", applyPlan);
      return;
    }

    if (applyPlan.missing_fields.length > 0) {
      await client.query("rollback");
      refused("missing_fields_remaining", applyPlan);
      return;
    }

    const existingResult = await client.query<ExistingCropCycleRow>(
      `
      select id
      from app.crop_cycles
      where source_apply_plan_id = $1
      limit 1
      `,
      [applyPlan.id],
    );

    const existing = existingResult.rows[0];

    if (existing) {
      await client.query("commit");
      console.log(
        JSON.stringify(
          {
            result: "already_applied",
            apply_plan_id: applyPlan.id,
            crop_cycle_id: existing.id,
          },
          null,
          2,
        ),
      );
      return;
    }

    const completedFields = asRecord(
      asRecord(applyPlan.plan_payload).completed_fields,
    );

    const seasonYear = asRequiredInteger(completedFields.season_year, "season_year");
    const crop = asRequiredString(completedFields.crop, "crop");
    const variety = asString(completedFields.variety);
    const fieldName = asString(completedFields.field_name);
    const sowingDateText = asString(completedFields.sowing_date_text);
    const transplantDateText = asString(completedFields.transplant_date_text);

    const projectionResult = await client.query<ProjectionCandidateRow>(
      `
      select
        id,
        supporting_extracted_fact_ids
      from knowledge.projection_candidates
      where id = $1
      `,
      [applyPlan.projection_candidate_id],
    );

    const projectionCandidate = projectionResult.rows[0];

    const planPayload = asRecord(applyPlan.plan_payload);

    const projectionFactIds = asNumberArray(
      projectionCandidate?.supporting_extracted_fact_ids ?? [],
    );

    const completionFactIds = asNumberArray(
      planPayload.completion_source_extracted_fact_id_list,
    );

    const completionFactIdMap = asRecord(
      planPayload.completion_source_extracted_fact_ids,
    );

    const completionFactIdsFromMap = asNumberArray(
      Object.values(completionFactIdMap),
    );

    const sourceExtractedFactIds = uniqueSortedNumbers([
      ...projectionFactIds,
      ...completionFactIds,
      ...completionFactIdsFromMap,
    ]);

    const insertedResult = await client.query<InsertedCropCycleRow>(
      `
      insert into app.crop_cycles (
        season_year,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        source_apply_plan_id,
        source_projection_candidate_id,
        source_document_id,
        document_extraction_id,
        source_extracted_fact_ids,
        created_by,
        created_by_role
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::bigint[],
        $12,
        $13
      )
      returning
        id,
        season_year,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text
      `,
      [
        seasonYear,
        crop,
        variety,
        fieldName,
        sowingDateText,
        transplantDateText,
        applyPlan.id,
        applyPlan.projection_candidate_id,
        applyPlan.source_document_id,
        applyPlan.document_extraction_id,
        sourceExtractedFactIds,
        args.appliedBy,
        args.appliedByRole,
      ],
    );

    const inserted = insertedResult.rows[0];

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "created",
          apply_plan_id: applyPlan.id,
          crop_cycle_id: inserted.id,
          season_year: inserted.season_year,
          crop: inserted.crop,
          variety: inserted.variety,
          field_name: inserted.field_name,
          sowing_date_text: inserted.sowing_date_text,
          transplant_date_text: inserted.transplant_date_text,
          source_extracted_fact_ids: sourceExtractedFactIds,
        },
        null,
        2,
      ),
    );
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
