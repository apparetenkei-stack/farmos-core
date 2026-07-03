import { Client } from "pg";

const GENERATED_BY = "verified_facts_projection_candidate_worker_v1";

function readArg(name: string, fallback?: string): string {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const index = args.indexOf(name);

  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required argument: ${name}`);
}

function toPositiveInteger(value: string, name: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer: ${value}`);
  }

  return parsed;
}

type FactRow = Record<string, unknown> & {
  id: number;
  source_document_id: number;
  document_extraction_id: number | null;
  fact_value_text?: string | null;
  confidence?: string | number | null;
  candidate_metadata?: Record<string, unknown> | null;
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
}

function getFactKey(row: FactRow): string {
  const metadata = row.candidate_metadata ?? {};

  const candidates = [
    row.fact_key,
    row.fact_type,
    row.fact_name,
    row.attribute_name,
    row.name,
    metadata["fact_key"],
    metadata["fact_type"],
    metadata["key"],
    metadata["name"],
    metadata["label"],
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate).toLowerCase();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
}

function getFactValueText(row: FactRow): string {
  const candidates = [
    row.fact_value_text,
    row.value_text,
    row.text_value,
    row.fact_value,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
}

function asConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(4));
}

async function main(): Promise<void> {
  const documentExtractionId = toPositiveInteger(
    readArg("--document-extraction-id"),
    "--document-extraction-id",
  );

  const sourceDocumentId = toPositiveInteger(
    readArg("--source-document-id", "3"),
    "--source-document-id",
  );

  const client = new Client();

  await client.connect();

  try {
    const factsResult = await client.query<FactRow>(
      `
      select *
      from knowledge.extracted_facts
      where source_document_id = $1
        and document_extraction_id = $2
        and verified = true
        and rejected = false
      order by id
      `,
      [sourceDocumentId, documentExtractionId],
    );

    const facts = factsResult.rows;

    if (facts.length === 0) {
      throw new Error(
        `No verified facts found for source_document_id=${sourceDocumentId}, document_extraction_id=${documentExtractionId}`,
      );
    }

    const factById = new Map(facts.map((fact) => [Number(fact.id), fact]));

    const yearFact =
      facts.find((fact) => {
        const key = getFactKey(fact);
        return key === "year" || key === "season_year";
      }) ??
      (() => {
        const fallback = factById.get(4);
        if (!fallback) return undefined;
        return /^\d{4}$/.test(getFactValueText(fallback)) ? fallback : undefined;
      })();

    const cropFact =
      facts.find((fact) => {
        const key = getFactKey(fact);
        return key === "crop" || key === "crop_name";
      }) ??
      (() => {
        const fallback = factById.get(5);
        if (!fallback) return undefined;
        return getFactValueText(fallback).length > 0 ? fallback : undefined;
      })();

    if (!yearFact || !cropFact) {
      throw new Error(
        [
          "Required verified facts are missing.",
          "Day12 requires verified year and crop facts.",
          `Available facts: ${facts
            .map((fact) => `id=${fact.id}, key=${getFactKey(fact)}, value=${getFactValueText(fact)}`)
            .join(" / ")}`,
        ].join(" "),
      );
    }

    const seasonYearMatch = getFactValueText(yearFact).match(/\d{4}/);
    if (!seasonYearMatch) {
      throw new Error(`Could not parse season year from fact id=${yearFact.id}`);
    }

    const seasonYear = Number(seasonYearMatch[0]);
    const crop = getFactValueText(cropFact);

    const supportingExtractedFactIds = [Number(yearFact.id), Number(cropFact.id)].sort(
      (a, b) => a - b,
    );

    const candidateType = "crop_cycle_candidate";
    const targetSchema = "app";
    const targetTable = "crop_cycles";
    const candidateKey = `source_document:${sourceDocumentId}:document_extraction:${documentExtractionId}:crop_cycle:${seasonYear}:${crop}`;

    const candidatePayload = {
      source: {
        source_document_id: sourceDocumentId,
        document_extraction_id: documentExtractionId,
        supporting_extracted_fact_ids: supportingExtractedFactIds,
      },
      candidate: {
        season_year: seasonYear,
        crop,
      },
      missing_fields: [
        "variety",
        "field_name",
        "sowing_date_text",
        "transplant_date_text",
      ],
      notes: [
        "Day12 candidate only. Do not write to app.crop_cycles.",
      ],
    };

    const confidence = average([
      asConfidence(yearFact.confidence),
      asConfidence(cropFact.confidence),
    ]);

    const insertResult = await client.query<{ id: string }>(
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
        generated_by
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        $8::bigint[],
        $9,
        'draft',
        $10
      )
      on conflict (
        source_document_id,
        document_extraction_id,
        candidate_type,
        candidate_key
      )
      where generated_by = 'verified_facts_projection_candidate_worker_v1'
      do nothing
      returning id
      `,
      [
        sourceDocumentId,
        documentExtractionId,
        candidateType,
        targetSchema,
        targetTable,
        candidateKey,
        JSON.stringify(candidatePayload),
        supportingExtractedFactIds,
        confidence,
        GENERATED_BY,
      ],
    );

    if (insertResult.rowCount === 1) {
      console.log(
        JSON.stringify(
          {
            result: "created",
            projection_candidate_id: Number(insertResult.rows[0].id),
            supporting_extracted_fact_ids: supportingExtractedFactIds,
          },
          null,
          2,
        ),
      );
      return;
    }

    const existingResult = await client.query<{
      id: string;
      supporting_extracted_fact_ids: number[];
    }>(
      `
      select
        id,
        supporting_extracted_fact_ids
      from knowledge.projection_candidates
      where source_document_id = $1
        and document_extraction_id = $2
        and candidate_type = $3
        and candidate_key = $4
        and generated_by = $5
      limit 1
      `,
      [sourceDocumentId, documentExtractionId, candidateType, candidateKey, GENERATED_BY],
    );

    console.log(
      JSON.stringify(
        {
          result: "already_exists",
          projection_candidate_id: Number(existingResult.rows[0]?.id),
          supporting_extracted_fact_ids:
            existingResult.rows[0]?.supporting_extracted_fact_ids ?? supportingExtractedFactIds,
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
  process.exitCode = 1;
});
