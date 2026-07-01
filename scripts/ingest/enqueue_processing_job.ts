import { Client } from "pg";

const VALID_JOB_TYPES = new Set([
  "ocr",
  "whisper",
  "csv_parse",
  "image_metadata",
  "text_extract",
  "pdf_text_extract",
]);

type Args = {
  sourceDocumentId: number;
  jobType: string;
  priority: number;
  maxAttempts: number;
};

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2).filter((arg) => arg !== "--");

  let sourceDocumentIdRaw: string | undefined;
  let jobType: string | undefined;
  let priority = 100;
  let maxAttempts = 3;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--source-document-id") {
      sourceDocumentIdRaw = args[++i];
      continue;
    }

    if (arg === "--job-type") {
      jobType = args[++i];
      continue;
    }

    if (arg === "--priority") {
      priority = Number(args[++i]);
      continue;
    }

    if (arg === "--max-attempts") {
      maxAttempts = Number(args[++i]);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!sourceDocumentIdRaw) {
    throw new Error("Missing required argument: --source-document-id");
  }

  const sourceDocumentId = Number(sourceDocumentIdRaw);

  if (!Number.isInteger(sourceDocumentId) || sourceDocumentId <= 0) {
    throw new Error("--source-document-id must be a positive integer");
  }

  if (!jobType) {
    throw new Error("Missing required argument: --job-type");
  }

  if (!VALID_JOB_TYPES.has(jobType)) {
    throw new Error(
      `Invalid --job-type: ${jobType}. Valid values: ${Array.from(VALID_JOB_TYPES).join(", ")}`
    );
  }

  if (!Number.isInteger(priority) || priority < 0) {
    throw new Error("--priority must be an integer greater than or equal to 0");
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("--max-attempts must be an integer greater than or equal to 1");
  }

  return {
    sourceDocumentId,
    jobType,
    priority,
    maxAttempts,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const parsed = parseArgs(process.argv);

  const client = new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    user: requireEnv("FARMOS_APP_DB_USER"),
    password: requireEnv("PGPASSWORD"),
    database: requireEnv("FARMOS_DB_NAME"),
  });

  await client.connect();

  try {
    await client.query("begin");

    const documentResult = await client.query(
      `
      select
        id,
        title,
        document_type,
        mime_type,
        storage_backend,
        storage_path,
        ocr_status
      from knowledge.source_documents
      where id = $1
      for share
      `,
      [parsed.sourceDocumentId]
    );

    if (documentResult.rowCount === 0) {
      throw new Error(`source_document not found: id=${parsed.sourceDocumentId}`);
    }

    const doc = documentResult.rows[0];

    const existingResult = await client.query(
      `
      select
        id,
        source_document_id,
        job_type,
        status,
        priority,
        attempt_count,
        max_attempts,
        created_at
      from knowledge.document_processing_jobs
      where source_document_id = $1
        and job_type = $2
        and status in ('pending', 'running')
      order by created_at asc
      limit 1
      `,
      [parsed.sourceDocumentId, parsed.jobType]
    );

    if ((existingResult.rowCount ?? 0) > 0) {
      await client.query("commit");

      const existing = existingResult.rows[0];

      console.log(
        JSON.stringify(
          {
            result: "already_queued",
            job: existing,
            source_document: doc,
          },
          null,
          2
        )
      );

      return;
    }

    const insertResult = await client.query(
      `
      insert into knowledge.document_processing_jobs (
        source_document_id,
        job_type,
        status,
        priority,
        attempt_count,
        max_attempts
      )
      values ($1, $2, 'pending', $3, 0, $4)
      returning
        id,
        source_document_id,
        job_type,
        status,
        priority,
        attempt_count,
        max_attempts,
        requested_by,
        created_at
      `,
      [
        parsed.sourceDocumentId,
        parsed.jobType,
        parsed.priority,
        parsed.maxAttempts,
      ]
    );

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "created",
          job: insertResult.rows[0],
          source_document: doc,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[enqueue-processing-job] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
