import { Client, type ClientConfig } from "pg";

type ReadBoundaryBase = {
  mode: "read_only_api_boundary";
  db_user: string;
  transaction_read_only: boolean;
  writes_performed: false;
  app_schema_write_allowed: false;
  raw_text_included?: boolean;
};

type TransactionContext = {
  db_user: string;
  transaction_read_only: boolean;
};

function createFarmosReadonlyClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  };

  return new Client(config);
}

function normalizeId(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeIdArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item));
  }

  if (typeof value === "string") {
    return value
      .replace(/[{}]/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => Number(item));
  }

  return [];
}

function toPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeSourceDocument(row: Record<string, unknown> | undefined) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: normalizeId(row.id),
  };
}

function normalizeDocumentExtraction(row: Record<string, unknown> | undefined) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: normalizeId(row.id),
    extracted_text_length: Number(row.extracted_text_length ?? 0),
  };
}

function normalizeFact(row: Record<string, unknown>) {
  return {
    ...row,
    id: normalizeId(row.id),
  };
}

function normalizeProjectionCandidate(row: Record<string, unknown> | undefined) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: normalizeId(row.id),
  };
}

function normalizeApplyPlan(row: Record<string, unknown> | undefined) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    id: normalizeId(row.id),
  };
}

function buildReadBoundary(
  context: TransactionContext,
  options: { rawTextIncluded?: boolean } = {},
): ReadBoundaryBase {
  return {
    mode: "read_only_api_boundary",
    db_user: context.db_user,
    transaction_read_only: context.transaction_read_only,
    writes_performed: false,
    app_schema_write_allowed: false,
    ...(typeof options.rawTextIncluded === "boolean"
      ? { raw_text_included: options.rawTextIncluded }
      : {}),
  };
}

async function withReadOnlyTransaction<T>(
  callback: (client: Client, context: TransactionContext) => Promise<T>,
): Promise<T> {
  const client = createFarmosReadonlyClient();

  await client.connect();

  try {
    await client.query("begin read only");

    const boundaryResult = await client.query<{
      db_user: string;
      transaction_read_only: boolean;
    }>(`
      select
        current_user as db_user,
        current_setting('transaction_read_only')::boolean as transaction_read_only;
    `);

    const context = boundaryResult.rows[0];

    const result = await callback(client, context);

    await client.query("commit");

    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors so the original error is preserved.
    }

    throw error;
  } finally {
    await client.end();
  }
}

export async function listCropCycleReadModel() {
  return withReadOnlyTransaction(async (client, context) => {
    const result = await client.query(`
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
      order by crop_cycle_id;
    `);

    const cropCycles = result.rows.map((row) => ({
      ...row,
      crop_cycle_id: normalizeId(row.crop_cycle_id),
      season_year: Number(row.season_year),
      source_apply_plan_id: normalizeId(row.source_apply_plan_id),
      source_projection_candidate_id: normalizeId(
        row.source_projection_candidate_id,
      ),
      source_document_id: normalizeId(row.source_document_id),
      document_extraction_id: normalizeId(row.document_extraction_id),
      source_extracted_fact_ids: normalizeIdArray(row.source_extracted_fact_ids),
    }));

    return {
      result: "ok" as const,
      count: cropCycles.length,
      crop_cycles: cropCycles,
      read_boundary: buildReadBoundary(context),
    };
  });
}

export async function showCropCycleProvenanceReadModel(params: {
  cropCycleId: unknown;
  includeRawText?: boolean;
}) {
  const cropCycleId = toPositiveInteger(params.cropCycleId);
  const includeRawText = params.includeRawText === true;

  if (cropCycleId === null) {
    return {
      result: "error" as const,
      message: "crop_cycle_id must be a positive integer",
      read_boundary: {
        mode: "read_only_api_boundary" as const,
        writes_performed: false as const,
        app_schema_write_allowed: false as const,
        raw_text_included: false,
      },
    };
  }

  return withReadOnlyTransaction(async (client, context) => {
    const cropCycleResult = await client.query(
      `
      select
        id as crop_cycle_id,
        season_year,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived,
        created_by,
        created_by_role,
        source_extracted_fact_ids,
        source_document_id,
        document_extraction_id,
        source_projection_candidate_id,
        source_apply_plan_id
      from app.crop_cycles
      where id = $1;
      `,
      [cropCycleId],
    );

    if (cropCycleResult.rowCount === 0) {
      return {
        result: "not_found" as const,
        crop_cycle_id: cropCycleId,
        read_boundary: buildReadBoundary(context, {
          rawTextIncluded: includeRawText,
        }),
      };
    }

    const cropCycleRow = cropCycleResult.rows[0];
    const sourceExtractedFactIds = normalizeIdArray(
      cropCycleRow.source_extracted_fact_ids,
    );

    const sourceDocumentId = normalizeId(cropCycleRow.source_document_id);
    const documentExtractionId = normalizeId(cropCycleRow.document_extraction_id);
    const projectionCandidateId = normalizeId(
      cropCycleRow.source_projection_candidate_id,
    );
    const applyPlanId = normalizeId(cropCycleRow.source_apply_plan_id);

    const sourceDocumentResult = await client.query(
      `
      select
        id,
        title,
        ocr_status
      from knowledge.source_documents
      where id = $1;
      `,
      [sourceDocumentId],
    );

    const documentExtractionSelect = includeRawText
      ? `
        select
          id,
          status,
          is_current,
          char_length(coalesce(extracted_text, '')) as extracted_text_length,
          extracted_text
        from knowledge.document_extractions
        where id = $1;
      `
      : `
        select
          id,
          status,
          is_current,
          char_length(coalesce(extracted_text, '')) as extracted_text_length
        from knowledge.document_extractions
        where id = $1;
      `;

    const documentExtractionResult = await client.query(
      documentExtractionSelect,
      [documentExtractionId],
    );

    const factsResult = await client.query(
      `
      select
        id,
        fact_type,
        fact_value_text,
        verified,
        verified_by,
        rejected
      from knowledge.extracted_facts
      where id = any($1::bigint[])
        and verified = true
        and rejected = false
      order by id;
      `,
      [sourceExtractedFactIds],
    );

    const projectionCandidateResult = await client.query(
      `
      select
        id,
        status,
        reviewed,
        rejected,
        approved_for_app_projection
      from knowledge.projection_candidates
      where id = $1;
      `,
      [projectionCandidateId],
    );

    const applyPlanResult = await client.query(
      `
      select
        id,
        readiness_status,
        status,
        reviewed,
        rejected,
        approved_for_app_apply,
        missing_fields
      from knowledge.app_projection_apply_plans
      where id = $1;
      `,
      [applyPlanId],
    );

    return {
      result: "ok" as const,
      crop_cycle: {
        crop_cycle_id: normalizeId(cropCycleRow.crop_cycle_id),
        season_year: Number(cropCycleRow.season_year),
        crop: cropCycleRow.crop,
        variety: cropCycleRow.variety,
        field_name: cropCycleRow.field_name,
        sowing_date_text: cropCycleRow.sowing_date_text,
        transplant_date_text: cropCycleRow.transplant_date_text,
        archived: cropCycleRow.archived,
        created_by: cropCycleRow.created_by,
        created_by_role: cropCycleRow.created_by_role,
        source_extracted_fact_ids: sourceExtractedFactIds,
      },
      source_document: normalizeSourceDocument(sourceDocumentResult.rows[0]),
      document_extraction: normalizeDocumentExtraction(
        documentExtractionResult.rows[0],
      ),
      facts: factsResult.rows.map(normalizeFact),
      projection_candidate: normalizeProjectionCandidate(
        projectionCandidateResult.rows[0],
      ),
      apply_plan: normalizeApplyPlan(applyPlanResult.rows[0]),
      trace: {
        business_truth_table: "app.crop_cycles",
        business_truth_id: normalizeId(cropCycleRow.crop_cycle_id),
        source_document_id: sourceDocumentId,
        document_extraction_id: documentExtractionId,
        source_extracted_fact_ids: sourceExtractedFactIds,
        source_projection_candidate_id: projectionCandidateId,
        source_apply_plan_id: applyPlanId,
      },
      read_boundary: buildReadBoundary(context, {
        rawTextIncluded: includeRawText,
      }),
    };
  });
}
