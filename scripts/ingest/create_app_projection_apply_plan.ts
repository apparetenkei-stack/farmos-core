import { Client } from "pg";

type ProjectionCandidateRow = {
  id: string;
  source_document_id: string;
  document_extraction_id: string | null;
  candidate_type: string;
  target_schema: string;
  target_table: string;
  candidate_key: string;
  candidate_payload: {
    source?: {
      supporting_extracted_fact_ids?: number[];
    };
    candidate?: Record<string, unknown>;
    missing_fields?: string[];
  };
  supporting_extracted_fact_ids: number[];
  approved_for_app_projection: boolean;
  rejected: boolean;
};

const GENERATED_BY = "approved_projection_apply_plan_worker_v1";

function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseArgs(argv: string[]): { projectionCandidateId?: number } {
  const args = argv.slice(2).filter((arg) => arg !== "--");
  const result: { projectionCandidateId?: number } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--projection-candidate-id") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("--projection-candidate-id requires a value");
      }

      const parsed = Number(value);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--projection-candidate-id must be a positive integer");
      }

      result.projectionCandidateId = parsed;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

function createClient(): Client {
  return new Client({
    host: readRequiredEnv("PGHOST"),
    port: Number(readRequiredEnv("PGPORT")),
    database: readRequiredEnv("PGDATABASE"),
    user: readRequiredEnv("PGUSER"),
    password: readRequiredEnv("PGPASSWORD"),
  });
}

function applyPlanTypeForTarget(targetTable: string): string {
  if (targetTable === "crop_cycles") {
    return "crop_cycle_apply_plan";
  }

  if (targetTable === "work_records") {
    return "work_record_apply_plan";
  }

  if (targetTable === "fields") {
    return "field_apply_plan";
  }

  if (targetTable === "shipments") {
    return "shipment_apply_plan";
  }

  return "other";
}

function requiredFieldsForPlan(applyPlanType: string): string[] {
  if (applyPlanType === "crop_cycle_apply_plan") {
    return [
      "season_year",
      "crop",
      "variety",
      "field_name",
      "sowing_date_text",
      "transplant_date_text",
    ];
  }

  return [];
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
}

function createApplyPlanKey(row: ProjectionCandidateRow, applyPlanType: string): string {
  const candidate = row.candidate_payload.candidate ?? {};
  const seasonYear = String(candidate.season_year ?? "unknown_year");
  const crop = String(candidate.crop ?? "unknown_crop");

  return [
    "projection_candidate",
    row.id,
    applyPlanType,
    seasonYear,
    crop,
  ].join(":");
}

async function loadProjectionCandidates(
  client: Client,
  projectionCandidateId?: number,
): Promise<ProjectionCandidateRow[]> {
  if (projectionCandidateId) {
    const result = await client.query<ProjectionCandidateRow>(
      `
      select
        id,
        source_document_id,
        document_extraction_id,
        candidate_type,
        target_schema,
        target_table,
        candidate_key,
        candidate_payload,
        supporting_extracted_fact_ids,
        approved_for_app_projection,
        rejected
      from knowledge.projection_candidates
      where id = $1
      `,
      [projectionCandidateId],
    );

    return result.rows;
  }

  const result = await client.query<ProjectionCandidateRow>(
    `
    select
      id,
      source_document_id,
      document_extraction_id,
      candidate_type,
      target_schema,
      target_table,
      candidate_key,
      candidate_payload,
      supporting_extracted_fact_ids,
      approved_for_app_projection,
      rejected
    from knowledge.projection_candidates
    where approved_for_app_projection = true
      and rejected = false
    order by id
    `,
  );

  return result.rows;
}

async function createApplyPlanForCandidate(
  client: Client,
  row: ProjectionCandidateRow,
): Promise<Record<string, unknown>> {
  if (!row.approved_for_app_projection) {
    return {
      result: "refused",
      reason: "projection_candidate_is_not_approved_for_app_projection",
      projection_candidate_id: Number(row.id),
    };
  }

  if (row.rejected) {
    return {
      result: "refused",
      reason: "projection_candidate_is_rejected",
      projection_candidate_id: Number(row.id),
    };
  }

  const applyPlanType = applyPlanTypeForTarget(row.target_table);
  const requiredFields = requiredFieldsForPlan(applyPlanType);
  const missingFields = normalizeStringArray(row.candidate_payload.missing_fields);
  const readinessStatus = missingFields.length === 0 ? "ready" : "blocked";
  const applyPlanKey = createApplyPlanKey(row, applyPlanType);
  const supportingExtractedFactIds = normalizeNumberArray(row.supporting_extracted_fact_ids);
  const candidate = row.candidate_payload.candidate ?? {};

  const existing = await client.query<{
    id: string;
    readiness_status: string;
    missing_fields: string[];
  }>(
    `
    select
      id,
      readiness_status,
      missing_fields
    from knowledge.app_projection_apply_plans
    where projection_candidate_id = $1
      and apply_plan_type = $2
      and apply_plan_key = $3
    `,
    [row.id, applyPlanType, applyPlanKey],
  );

  if (existing.rowCount && existing.rows[0]) {
    return {
      result: "already_exists",
      projection_candidate_id: Number(row.id),
      apply_plan_id: Number(existing.rows[0].id),
      readiness_status: existing.rows[0].readiness_status,
      missing_fields: existing.rows[0].missing_fields,
    };
  }

  const planPayload = {
    source: {
      projection_candidate_id: Number(row.id),
      source_document_id: Number(row.source_document_id),
      document_extraction_id: row.document_extraction_id
        ? Number(row.document_extraction_id)
        : null,
      supporting_extracted_fact_ids: supportingExtractedFactIds,
    },
    target: {
      schema: row.target_schema,
      table: row.target_table,
    },
    candidate,
    required_fields: requiredFields,
    missing_fields: missingFields,
    readiness_status: readinessStatus,
    notes: [
      "Day14 apply plan only. Do not write to target crop_cycles.",
      "Missing fields must be reviewed before app projection.",
    ],
  };

  const inserted = await client.query<{
    id: string;
    readiness_status: string;
    missing_fields: string[];
  }>(
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
      generated_by
    )
    values (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8::jsonb,
      $9,
      $10,
      $11,
      'draft',
      $12
    )
    returning
      id,
      readiness_status,
      missing_fields
    `,
    [
      row.id,
      row.source_document_id,
      row.document_extraction_id,
      row.target_schema,
      row.target_table,
      applyPlanType,
      applyPlanKey,
      JSON.stringify(planPayload),
      requiredFields,
      missingFields,
      readinessStatus,
      GENERATED_BY,
    ],
  );

  const created = inserted.rows[0];

  return {
    result: "created",
    projection_candidate_id: Number(row.id),
    apply_plan_id: Number(created.id),
    readiness_status: created.readiness_status,
    missing_fields: created.missing_fields,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const client = createClient();

  await client.connect();

  try {
    const rows = await loadProjectionCandidates(
      client,
      options.projectionCandidateId,
    );

    if (rows.length === 0) {
      console.log(JSON.stringify({
        result: "not_found",
        projection_candidate_id: options.projectionCandidateId ?? null,
      }, null, 2));
      return;
    }

    const results = [];

    for (const row of rows) {
      results.push(await createApplyPlanForCandidate(client, row));
    }

    if (options.projectionCandidateId && results.length === 1) {
      console.log(JSON.stringify(results[0], null, 2));
      return;
    }

    console.log(JSON.stringify({
      result: "completed",
      count: results.length,
      plans: results,
    }, null, 2));
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
