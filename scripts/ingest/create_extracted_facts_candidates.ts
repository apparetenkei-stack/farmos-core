import { Client } from "pg";

type FactType =
  | "planting"
  | "shipment"
  | "harvest"
  | "cultivar"
  | "field_condition"
  | "work_note"
  | "weather_note"
  | "pest_disease"
  | "material"
  | "yield"
  | "price"
  | "other";

type FactCandidate = {
  factType: FactType;
  entityType?: string;
  entityName?: string;
  factKey: string;
  factValueText: string;
  factValueJson: Record<string, unknown>;
  seasonYear?: number;
  confidence: number;
  ruleName: string;
};

function getArgValue(name: string): string | undefined {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];

  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseExtractionId(): number | undefined {
  const raw = getArgValue("--extraction-id");
  if (!raw) return undefined;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid --extraction-id: ${raw}`);
  }

  return value;
}

function addFact(
  facts: FactCandidate[],
  candidate: FactCandidate | undefined,
): void {
  if (!candidate) return;
  if (!candidate.factValueText) return;
  facts.push(candidate);
}

function extractFacts(text: string): FactCandidate[] {
  const facts: FactCandidate[] = [];

  const yearMatch = text.match(/(20\d{2})年/);
  const seasonYear = yearMatch ? Number(yearMatch[1]) : undefined;

  if (seasonYear) {
    addFact(facts, {
      factType: "planting",
      factKey: "year",
      factValueText: String(seasonYear),
      factValueJson: {
        value: seasonYear,
        normalized_candidate: seasonYear,
        raw_text: yearMatch?.[0],
      },
      seasonYear,
      confidence: 0.95,
      ruleName: "year_yyyy_ja",
    });
  }

  const knownCrops = [
    "ブロッコリー",
    "キャベツ",
    "セロリ",
    "サニーレタス",
    "とうもろこし",
    "じゃがいも",
  ];

  const crop = knownCrops.find((candidate) => text.includes(candidate));
  if (crop) {
    addFact(facts, {
      factType: "planting",
      entityType: "crop",
      entityName: crop,
      factKey: "crop",
      factValueText: crop,
      factValueJson: {
        value: crop,
        normalized_candidate: crop,
        raw_text: crop,
      },
      seasonYear,
      confidence: 0.92,
      ruleName: "known_crop_dictionary_v1",
    });
  }

  const knownVarieties = ["ピクセル"];
  const variety = knownVarieties.find((candidate) => text.includes(candidate));
  if (variety) {
    addFact(facts, {
      factType: "cultivar",
      entityType: "cultivar",
      entityName: variety,
      factKey: "variety",
      factValueText: variety,
      factValueJson: {
        value: variety,
        normalized_candidate: variety,
        raw_text: variety,
      },
      seasonYear,
      confidence: 0.88,
      ruleName: "known_variety_dictionary_v1",
    });
  }

  const sowingMatch = text.match(/(\d{1,2}\/\d{1,2})\s*播種/);
  if (sowingMatch) {
    addFact(facts, {
      factType: "planting",
      factKey: "sowing_date_text",
      factValueText: sowingMatch[1],
      factValueJson: {
        value: sowingMatch[1],
        normalized_candidate: sowingMatch[1],
        raw_text: sowingMatch[0],
        note: "Day10 keeps this as text. Date normalization is future work.",
      },
      seasonYear,
      confidence: 0.9,
      ruleName: "date_slash_before_sowing",
    });
  }

  const transplantMatch = text.match(/(\d{1,2}\/\d{1,2})\s*定植/);
  if (transplantMatch) {
    addFact(facts, {
      factType: "planting",
      factKey: "transplant_date_text",
      factValueText: transplantMatch[1],
      factValueJson: {
        value: transplantMatch[1],
        normalized_candidate: transplantMatch[1],
        raw_text: transplantMatch[0],
        note: "Day10 keeps this as text. Date normalization is future work.",
      },
      seasonYear,
      confidence: 0.9,
      ruleName: "date_slash_before_transplant",
    });
  }

  const fieldMatch = text.match(/([A-Za-zＡ-Ｚａ-ｚ0-9０-９一-龯ぁ-んァ-ヶ]+圃場)/);
  if (fieldMatch) {
    addFact(facts, {
      factType: "field_condition",
      entityType: "field",
      entityName: fieldMatch[1],
      factKey: "field_name",
      factValueText: fieldMatch[1],
      factValueJson: {
        value: fieldMatch[1],
        normalized_candidate: fieldMatch[1],
        raw_text: fieldMatch[1],
      },
      seasonYear,
      confidence: 0.86,
      ruleName: "field_name_suffix_hojo",
    });
  }

  if (text.includes("秀品率高い")) {
    addFact(facts, {
      factType: "yield",
      factKey: "observation",
      factValueText: "秀品率高い",
      factValueJson: {
        value: "秀品率高い",
        normalized_candidate: "秀品率高い",
        raw_text: "秀品率高い",
      },
      seasonYear,
      confidence: 0.82,
      ruleName: "known_observation_phrase_high_quality_rate",
    });
  }

  const rainGrowthMatch = text.match(/雨が多いと[^\s　、。]+/);
  if (rainGrowthMatch) {
    addFact(facts, {
      factType: "weather_note",
      factKey: "observation",
      factValueText: rainGrowthMatch[0],
      factValueJson: {
        value: rainGrowthMatch[0],
        normalized_candidate: rainGrowthMatch[0],
        raw_text: rainGrowthMatch[0],
      },
      seasonYear,
      confidence: 0.8,
      ruleName: "rain_condition_observation_phrase",
    });
  }

  return facts;
}

async function main(): Promise<void> {
  requireEnv("PGHOST");
  requireEnv("PGPORT");
  requireEnv("PGDATABASE");
  requireEnv("PGUSER");
  requireEnv("PGPASSWORD");

  const extractionId = parseExtractionId();
  const client = new Client();

  await client.connect();

  try {
    await client.query("begin");

    const extractionResult = extractionId
      ? await client.query(
          `
          select
            id,
            source_document_id,
            job_id,
            extraction_type,
            extractor_name,
            status,
            is_current,
            extracted_text
          from knowledge.document_extractions
          where id = $1
          for update
          `,
          [extractionId],
        )
      : await client.query(
          `
          select
            id,
            source_document_id,
            job_id,
            extraction_type,
            extractor_name,
            status,
            is_current,
            extracted_text
          from knowledge.document_extractions
          where extraction_type = 'text_extract'
            and status = 'completed'
            and is_current = true
          order by created_at asc, id asc
          limit 1
          for update
          `,
        );

    if (extractionResult.rowCount === 0) {
      await client.query("rollback");
      console.log(JSON.stringify({ result: "no_target_extraction" }, null, 2));
      return;
    }

    const extraction = extractionResult.rows[0];

    if (extraction.extraction_type !== "text_extract") {
      throw new Error(`Unsupported extraction_type: ${extraction.extraction_type}`);
    }

    if (extraction.status !== "completed") {
      throw new Error(`Unsupported extraction status: ${extraction.status}`);
    }

    if (extraction.is_current !== true) {
      throw new Error(`Extraction is not current: ${extraction.id}`);
    }

    const existingResult = await client.query(
      `
      select count(*)::int as count
      from knowledge.extracted_facts
      where document_extraction_id = $1
        and extracted_by_model = 'extracted_facts_candidate_worker_v1'
      `,
      [extraction.id],
    );

    const existingCount = existingResult.rows[0]?.count ?? 0;

    if (existingCount > 0) {
      await client.query("rollback");
      console.log(
        JSON.stringify(
          {
            result: "already_exists",
            extraction_id: extraction.id,
            source_document_id: extraction.source_document_id,
            existing_count: existingCount,
          },
          null,
          2,
        ),
      );
      return;
    }

    const extractedText = String(extraction.extracted_text ?? "");
    const facts = extractFacts(extractedText);

    for (const fact of facts) {
      await client.query(
        `
        insert into knowledge.extracted_facts (
          source_document_id,
          document_extraction_id,
          fact_type,
          entity_type,
          entity_name,
          fact_key,
          fact_value_text,
          fact_value_json,
          season_year,
          confidence,
          extraction_method,
          extracted_by_model,
          verified,
          rejected,
          candidate_metadata
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
          'system',
          'extracted_facts_candidate_worker_v1',
          false,
          false,
          $11::jsonb
        )
        `,
        [
          extraction.source_document_id,
          extraction.id,
          fact.factType,
          fact.entityType ?? null,
          fact.entityName ?? null,
          fact.factKey,
          fact.factValueText,
          JSON.stringify(fact.factValueJson),
          fact.seasonYear ?? null,
          fact.confidence,
          JSON.stringify({
            mode: "rule_based_candidate_extraction",
            extractor_name: "extracted_facts_candidate_worker_v1",
            extractor_version: "v1",
            rule_name: fact.ruleName,
            source_extraction_id: extraction.id,
            source_extraction_type: extraction.extraction_type,
            source_extractor_name: extraction.extractor_name,
            non_goals: [
              "no_llm",
              "no_external_api",
              "no_qdrant",
              "no_app_schema_write",
            ],
          }),
        ],
      );
    }

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "created",
          extraction_id: extraction.id,
          source_document_id: extraction.source_document_id,
          facts_created: facts.length,
          fact_keys: facts.map((fact) => fact.factKey),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ result: "failed", error: message }, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ result: "failed", error: message }, null, 2));
  process.exit(1);
});
