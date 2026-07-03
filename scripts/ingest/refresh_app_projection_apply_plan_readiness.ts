import { Client } from "pg";

type ApplyPlanRow = {
  id: number;
  projection_candidate_id: number;
  source_document_id: number | null;
  document_extraction_id: number | null;
  target_schema: string;
  target_table: string;
  apply_plan_type: string;
  required_fields: string[];
  missing_fields: string[];
  readiness_status: string;
  status: string;
  plan_payload: Record<string, unknown>;
};

type ProjectionCandidateRow = {
  id: number;
  candidate_payload: Record<string, unknown>;
};

type ExtractedFactRow = {
  id: number;
  fact_key: string;
  fact_value_text: string | null;
  fact_value_json: unknown;
};

function parseArgs(argv: string[]) {
  const args = argv.slice(2).filter((arg) => arg !== "--");
  const result: { applyPlanId?: number } = {};

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--apply-plan-id") {
      const value = args[i + 1];
      if (!value) throw new Error("--apply-plan-id requires a value");

      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--apply-plan-id must be a positive integer");
      }

      result.applyPlanId = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${args[i]}`);
  }

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> {
  return asRecord(asRecord(value)[key]);
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function extractFactValue(fact: ExtractedFactRow): unknown {
  const textValue = normalize(fact.fact_value_text);
  if (textValue !== undefined) return textValue;
  return normalize(fact.fact_value_json);
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

async function main() {
  const { applyPlanId } = parseArgs(process.argv);

  if (!applyPlanId) {
    throw new Error("Day15 requires --apply-plan-id. Example: --apply-plan-id 1");
  }

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
        required_fields,
        missing_fields,
        readiness_status,
        status,
        plan_payload
      from knowledge.app_projection_apply_plans
      where id = $1
      for update
      `,
      [applyPlanId],
    );

    const applyPlan = applyPlanResult.rows[0];

    if (!applyPlan) {
      throw new Error(`apply plan not found: ${applyPlanId}`);
    }

    const projectionCandidateResult = await client.query<ProjectionCandidateRow>(
      `
      select id, candidate_payload
      from knowledge.projection_candidates
      where id = $1
      `,
      [applyPlan.projection_candidate_id],
    );

    const projectionCandidate = projectionCandidateResult.rows[0];

    if (!projectionCandidate) {
      throw new Error(
        `projection candidate not found: ${applyPlan.projection_candidate_id}`,
      );
    }

    const factValues: unknown[] = [];
    const factWhere: string[] = [
      "verified = true",
      "coalesce(rejected, false) = false",
    ];

    if (applyPlan.source_document_id !== null) {
      factValues.push(applyPlan.source_document_id);
      factWhere.push(`source_document_id = $${factValues.length}`);
    }

    if (applyPlan.document_extraction_id !== null) {
      factValues.push(applyPlan.document_extraction_id);
      factWhere.push(`document_extraction_id = $${factValues.length}`);
    }

    const factsResult = await client.query<ExtractedFactRow>(
      `
      select
        id,
        fact_key,
        fact_value_text,
        fact_value_json
      from knowledge.extracted_facts
      where ${factWhere.join(" and ")}
      order by id
      `,
      factValues,
    );

    const candidate = nestedRecord(projectionCandidate.candidate_payload, "candidate");
    const existingCompleted = nestedRecord(applyPlan.plan_payload, "completed_fields");

    const factByKey = new Map<string, ExtractedFactRow>();
    for (const fact of factsResult.rows) {
      if (!factByKey.has(fact.fact_key)) {
        factByKey.set(fact.fact_key, fact);
      }
    }

    const completedFields: Record<string, unknown> = {};
    const completionSourceExtractedFactIds: Record<string, number> = {};
    const missingFields: string[] = [];

    for (const field of applyPlan.required_fields) {
      const fact = factByKey.get(field);
      const fromFact = fact ? extractFactValue(fact) : undefined;
      const fromExisting = normalize(existingCompleted[field]);
      const fromCandidate = normalize(candidate[field]);

      if (fromFact !== undefined) {
        completedFields[field] = fromFact;
        if (fact) completionSourceExtractedFactIds[field] = fact.id;
        continue;
      }

      if (fromExisting !== undefined) {
        completedFields[field] = fromExisting;
        continue;
      }

      if (fromCandidate !== undefined) {
        completedFields[field] = fromCandidate;
        continue;
      }

      missingFields.push(field);
    }

    const readinessStatus = missingFields.length === 0 ? "ready" : "blocked";

    const completionFactIds = uniqueNumbers(
      Object.values(completionSourceExtractedFactIds),
    );

    const nextPlanPayload = {
      ...asRecord(applyPlan.plan_payload),
      completed_fields: completedFields,
      completion_source_extracted_fact_ids: completionSourceExtractedFactIds,
      completion_source_extracted_fact_id_list: completionFactIds,
      readiness_refreshed_by: "apply_plan_readiness_refresh_worker_v1",
      readiness_refreshed_at: new Date().toISOString(),
      readiness_refresh_note:
        "Day15 missing field completion. This updates only the apply plan, not app schema.",
    };

    await client.query(
      `
      update knowledge.app_projection_apply_plans
      set
        plan_payload = $2::jsonb,
        missing_fields = $3::text[],
        readiness_status = $4,
        updated_at = now()
      where id = $1
      `,
      [
        applyPlan.id,
        JSON.stringify(nextPlanPayload),
        missingFields,
        readinessStatus,
      ],
    );

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "updated",
          apply_plan_id: applyPlan.id,
          projection_candidate_id: applyPlan.projection_candidate_id,
          previous_readiness_status: applyPlan.readiness_status,
          readiness_status: readinessStatus,
          completed_fields: completedFields,
          completion_source_extracted_fact_ids: completionSourceExtractedFactIds,
          missing_fields: missingFields,
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
