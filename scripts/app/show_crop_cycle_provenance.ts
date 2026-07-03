import { Client } from "pg";

type Options = {
  cropCycleId: number;
  includeRawText: boolean;
};

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2).filter((arg) => arg !== "--");
  let cropCycleIdText: string | undefined;
  let includeRawText = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--crop-cycle-id") {
      cropCycleIdText = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--include-raw-text") {
      includeRawText = true;
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (!cropCycleIdText) {
    throw new Error("--crop-cycle-id required");
  }

  const cropCycleId = Number(cropCycleIdText);

  if (!Number.isInteger(cropCycleId) || cropCycleId <= 0) {
    throw new Error("--crop-cycle-id must be a positive integer");
  }

  return { cropCycleId, includeRawText };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const n = typeof value === "number" ? value : Number(value);

  if (!Number.isSafeInteger(n)) {
    throw new Error(`unsafe integer value: ${String(value)}`);
  }

  return n;
}

function toNumberArray(value: unknown): number[] {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value.map((item) => {
      const n = toNumber(item);
      if (n === null) throw new Error("array contains null");
      return n;
    });
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "{}") return [];

    return trimmed
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .split(",")
      .filter((item) => item.trim().length > 0)
      .map((item) => {
        const n = toNumber(item.trim());
        if (n === null) throw new Error("array contains null");
        return n;
      });
  }

  throw new Error(`cannot convert to number array: ${String(value)}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const client = new Client();

  await client.connect();

  try {
    await client.query("begin read only");

    const cropResult = await client.query(
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
        document_extraction_id,
        source_extracted_fact_ids,
        created_by,
        created_by_role,
        archived
      from app.crop_cycles_with_provenance
      where crop_cycle_id = $1
      limit 1
      `,
      [options.cropCycleId],
    );

    if (cropResult.rowCount === 0) {
      await client.query("commit");

      console.log(
        JSON.stringify(
          {
            result: "not_found",
            crop_cycle_id: options.cropCycleId,
          },
          null,
          2,
        ),
      );
      return;
    }

    const crop = cropResult.rows[0];
    const sourceExtractedFactIds = toNumberArray(crop.source_extracted_fact_ids);

    const factsResult =
      sourceExtractedFactIds.length > 0
        ? await client.query(
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
            order by id
            `,
            [sourceExtractedFactIds],
          )
        : { rows: [] };

    const sourceDocumentResult = await client.query(
      `
      select
        id,
        title,
        ocr_status
      from knowledge.source_documents
      where id = $1
      limit 1
      `,
      [crop.source_document_id],
    );

    const documentExtractionResult = await client.query(
      `
      select
        id,
        status,
        is_current,
        length(extracted_text) as extracted_text_length,
        case when $2::boolean then extracted_text else null end as extracted_text
      from knowledge.document_extractions
      where id = $1
      limit 1
      `,
      [crop.document_extraction_id, options.includeRawText],
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
      where id = $1
      limit 1
      `,
      [crop.source_projection_candidate_id],
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
      where id = $1
      limit 1
      `,
      [crop.source_apply_plan_id],
    );

    const boundaryResult = await client.query(
      `
      select
        current_user,
        current_setting('transaction_read_only') as transaction_read_only
      `,
    );

    await client.query("commit");

    const sourceDocument = sourceDocumentResult.rows[0] ?? null;
    const documentExtraction = documentExtractionResult.rows[0] ?? null;
    const projectionCandidate = projectionCandidateResult.rows[0] ?? null;
    const applyPlan = applyPlanResult.rows[0] ?? null;
    const boundary = boundaryResult.rows[0];

    const documentExtractionOutput = documentExtraction
      ? {
          id: toNumber(documentExtraction.id),
          status: documentExtraction.status,
          is_current: documentExtraction.is_current,
          extracted_text_length: toNumber(documentExtraction.extracted_text_length),
          ...(options.includeRawText
            ? { extracted_text: documentExtraction.extracted_text }
            : {}),
        }
      : null;

    const output = {
      result: "ok",
      crop_cycle: {
        crop_cycle_id: toNumber(crop.crop_cycle_id),
        season_year: toNumber(crop.season_year),
        crop: crop.crop,
        variety: crop.variety,
        field_name: crop.field_name,
        sowing_date_text: crop.sowing_date_text,
        transplant_date_text: crop.transplant_date_text,
        archived: crop.archived,
        created_by: crop.created_by,
        created_by_role: crop.created_by_role,
        source_extracted_fact_ids: sourceExtractedFactIds,
      },
      source_document: sourceDocument
        ? {
            id: toNumber(sourceDocument.id),
            title: sourceDocument.title,
            ocr_status: sourceDocument.ocr_status,
          }
        : null,
      document_extraction: documentExtractionOutput,
      facts: factsResult.rows.map((fact) => ({
        id: toNumber(fact.id),
        fact_type: fact.fact_type,
        fact_value_text: fact.fact_value_text,
        verified: fact.verified,
        verified_by: fact.verified_by,
        rejected: fact.rejected,
      })),
      projection_candidate: projectionCandidate
        ? {
            id: toNumber(projectionCandidate.id),
            status: projectionCandidate.status,
            reviewed: projectionCandidate.reviewed,
            rejected: projectionCandidate.rejected,
            approved_for_app_projection:
              projectionCandidate.approved_for_app_projection,
          }
        : null,
      apply_plan: applyPlan
        ? {
            id: toNumber(applyPlan.id),
            readiness_status: applyPlan.readiness_status,
            status: applyPlan.status,
            reviewed: applyPlan.reviewed,
            rejected: applyPlan.rejected,
            approved_for_app_apply: applyPlan.approved_for_app_apply,
            missing_fields: Array.isArray(applyPlan.missing_fields) && applyPlan.missing_fields.length === 0
              ? {}
              : applyPlan.missing_fields ?? {},
          }
        : null,
      trace: {
        business_truth_table: "app.crop_cycles",
        business_truth_id: toNumber(crop.crop_cycle_id),
        source_document_id: toNumber(crop.source_document_id),
        document_extraction_id: toNumber(crop.document_extraction_id),
        source_extracted_fact_ids: sourceExtractedFactIds,
        source_projection_candidate_id: toNumber(
          crop.source_projection_candidate_id,
        ),
        source_apply_plan_id: toNumber(crop.source_apply_plan_id),
      },
      read_boundary: {
        mode: "read_only_cli",
        db_user: boundary.current_user,
        transaction_read_only: boundary.transaction_read_only === "on",
        writes_performed: false,
        app_schema_write_allowed: false,
        raw_text_included: options.includeRawText,
      },
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback failure
    }

    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
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
  process.exitCode = 1;
});
