import { Client } from "pg";

type Args = {
  includeArchived: boolean;
  crop?: string;
  fieldName?: string;
};

type CropCycleWithProvenanceRow = {
  crop_cycle_id: number;
  season_year: number;
  crop: string;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
  source_apply_plan_id: number | null;
  source_projection_candidate_id: number | null;
  source_document_id: number | null;
  source_document_title: string | null;
  source_document_ocr_status: string | null;
  document_extraction_id: number | null;
  document_extraction_status: string | null;
  document_extraction_is_current: boolean | null;
  source_extracted_fact_ids: number[] | null;
  created_by: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  apply_plan_readiness_status: string | null;
  apply_plan_status: string | null;
  apply_plan_reviewed: boolean | null;
  apply_plan_rejected: boolean | null;
  approved_for_app_apply: boolean | null;
  projection_candidate_status: string | null;
  projection_candidate_reviewed: boolean | null;
  projection_candidate_rejected: boolean | null;
  approved_for_app_projection: boolean | null;
};

function toSafeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  return null;
}

function toIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(toSafeInteger)
    .filter((item): item is number => item !== null);
}

function normalizeCropCycleRow(row: CropCycleWithProvenanceRow) {
  return {
    ...row,
    crop_cycle_id: toSafeInteger(row.crop_cycle_id),
    source_apply_plan_id: toSafeInteger(row.source_apply_plan_id),
    source_projection_candidate_id: toSafeInteger(row.source_projection_candidate_id),
    source_document_id: toSafeInteger(row.source_document_id),
    document_extraction_id: toSafeInteger(row.document_extraction_id),
    source_extracted_fact_ids: toIntegerArray(row.source_extracted_fact_ids),
  };
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2).filter((arg) => arg !== "--");

  const parsed: Args = {
    includeArchived: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--include-archived") {
      parsed.includeArchived = true;
      continue;
    }

    const value = args[i + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--crop") {
      parsed.crop = value;
      i += 1;
      continue;
    }

    if (arg === "--field-name") {
      parsed.fieldName = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
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
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (!args.includeArchived) {
      values.push(false);
      conditions.push(`archived = $${values.length}`);
    }

    if (args.crop) {
      values.push(args.crop);
      conditions.push(`crop = $${values.length}`);
    }

    if (args.fieldName) {
      values.push(args.fieldName);
      conditions.push(`field_name = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

    const result = await client.query<CropCycleWithProvenanceRow>(
      `
      select
        crop_cycle_id,
        season_year,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        source_apply_plan_id,
        source_projection_candidate_id,
        source_document_id,
        source_document_title,
        source_document_ocr_status,
        document_extraction_id,
        document_extraction_status,
        document_extraction_is_current,
        source_extracted_fact_ids,
        created_by,
        created_by_role,
        created_at,
        updated_at,
        archived,
        archived_at,
        archive_reason,
        apply_plan_readiness_status,
        apply_plan_status,
        apply_plan_reviewed,
        apply_plan_rejected,
        approved_for_app_apply,
        projection_candidate_status,
        projection_candidate_reviewed,
        projection_candidate_rejected,
        approved_for_app_projection
      from app.crop_cycles_with_provenance
      ${whereClause}
      order by crop_cycle_id
      `,
      values,
    );

    console.log(
      JSON.stringify(
        {
          result: "ok",
          count: result.rowCount,
          crop_cycles: result.rows.map(normalizeCropCycleRow),
        },
        null,
        2,
      ),
    );
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
