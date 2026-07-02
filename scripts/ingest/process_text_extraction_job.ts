import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { Pool } from "pg";

type ClaimedJob = {
  id: number;
  source_document_id: number;
  job_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
};

type SourceDocument = {
  id: number;
  title: string;
  mime_type: string | null;
  storage_backend: string | null;
  storage_path: string | null;
  ocr_status: string | null;
};

const WORKER_NAME = "text_extraction_worker_v1";
const WORKER_ID = `${WORKER_NAME}:${os.hostname()}:${process.pid}`;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const pool = new Pool({
  host: process.env.PGHOST ?? "127.0.0.1",
  port: Number(process.env.PGPORT ?? 5432),
  database: requireEnv("PGDATABASE"),
  user: requireEnv("PGUSER"),
  password: requireEnv("PGPASSWORD"),
});

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function makePreview(text: string, maxLength = 240): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function countNonEmptyLines(text: string): number {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
}

async function claimNextJob(): Promise<ClaimedJob | null> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const result = await client.query<ClaimedJob>(
      `
      with next_job as (
        select id
          from knowledge.document_processing_jobs
         where job_type = 'text_extract'
           and status = 'pending'
         order by priority asc, id asc
         for update skip locked
         limit 1
      )
      update knowledge.document_processing_jobs j
         set status = 'running',
             attempt_count = j.attempt_count + 1,
             locked_by = $1,
             started_at = now(),
             finished_at = null
        from next_job
       where j.id = next_job.id
       returning
         j.id,
         j.source_document_id,
         j.job_type,
         j.status,
         j.attempt_count,
         j.max_attempts
      `,
      [WORKER_ID],
    );

    await client.query("commit");

    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getSourceDocument(sourceDocumentId: number): Promise<SourceDocument | null> {
  const result = await pool.query<SourceDocument>(
    `
    select
      id,
      title,
      mime_type,
      storage_backend,
      storage_path,
      ocr_status
    from knowledge.source_documents
    where id = $1
    `,
    [sourceDocumentId],
  );

  return result.rows[0] ?? null;
}

async function markJobFailed(
  jobId: number,
  errorCode: string,
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const resultSummary = {
    result: "failed",
    error_code: errorCode,
    message,
    details,
    worker_id: WORKER_ID,
    finished_at: new Date().toISOString(),
  };

  await pool.query(
    `
    update knowledge.document_processing_jobs
       set status = 'failed',
           result_summary = $2,
           finished_at = now()
     where id = $1
    `,
    [jobId, jsonText(resultSummary)],
  );
}

async function ensureNoExistingExtractionForJob(jobId: number): Promise<number | null> {
  const result = await pool.query<{ id: number }>(
    `
    select id
      from knowledge.document_extractions
     where job_id = $1
     order by id
     limit 1
    `,
    [jobId],
  );

  return result.rows[0]?.id ?? null;
}

async function markJobSkippedAlreadyExtracted(
  jobId: number,
  extractionId: number,
): Promise<void> {
  const resultSummary = {
    result: "already_extracted",
    extraction_id: extractionId,
    worker_id: WORKER_ID,
    finished_at: new Date().toISOString(),
  };

  await pool.query(
    `
    update knowledge.document_processing_jobs
       set status = 'skipped',
           result_summary = $2,
           finished_at = now()
     where id = $1
    `,
    [jobId, jsonText(resultSummary)],
  );
}

async function resolveLocalIngestionPath(storagePath: string): Promise<{
  relativePath: string;
  realPath: string;
}> {
  const prefix = "local://";

  if (!storagePath.startsWith(prefix)) {
    throw new Error("storage_path_must_start_with_local_protocol");
  }

  const relativePath = storagePath.slice(prefix.length);

  if (relativePath.length === 0) {
    throw new Error("storage_path_empty_after_local_protocol");
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error("storage_path_must_be_relative");
  }

  const projectRoot = process.cwd();
  const ingestionRoot = path.resolve(projectRoot, "data/ingestion");
  const absolutePath = path.resolve(projectRoot, relativePath);

  const realIngestionRoot = await fs.realpath(ingestionRoot);
  const realPath = await fs.realpath(absolutePath);

  const insideRoot =
    realPath === realIngestionRoot ||
    realPath.startsWith(`${realIngestionRoot}${path.sep}`);

  if (!insideRoot) {
    throw new Error("resolved_path_outside_data_ingestion");
  }

  return {
    relativePath,
    realPath,
  };
}

async function insertExtractionAndCompleteJob(
  job: ClaimedJob,
  sourceDocument: SourceDocument,
  fileInfo: {
    relativePath: string;
    realPath: string;
  },
  text: string,
  byteLength: number,
): Promise<number> {
  const characters = text.length;
  const lines = countLines(text);
  const nonEmptyLines = countNonEmptyLines(text);
  const preview = makePreview(text);

  const metadata = {
    mode: "text_extract",
    worker_id: WORKER_ID,
    extractor_name: WORKER_NAME,
    source_document: {
      id: sourceDocument.id,
      title: sourceDocument.title,
      mime_type: sourceDocument.mime_type,
      storage_backend: sourceDocument.storage_backend,
      storage_path: sourceDocument.storage_path,
      ocr_status: sourceDocument.ocr_status,
    },
    file: {
      relative_path: fileInfo.relativePath,
      real_path: fileInfo.realPath,
      bytes: byteLength,
      characters,
      lines,
      non_empty_lines: nonEmptyLines,
      preview,
    },
  };

  const resultSummary = {
    result: "completed",
    source_document_id: job.source_document_id,
    job_id: job.id,
    extraction_type: "text_extract",
    extractor_name: WORKER_NAME,
    bytes: byteLength,
    characters,
    lines,
    non_empty_lines: nonEmptyLines,
    preview,
    worker_id: WORKER_ID,
    finished_at: new Date().toISOString(),
  };

  const client = await pool.connect();

  try {
    await client.query("begin");

    const existing = await client.query<{ id: number }>(
      `
      select id
        from knowledge.document_extractions
       where job_id = $1
       order by id
       limit 1
       for update
      `,
      [job.id],
    );

    if (existing.rows[0]) {
      await client.query(
        `
        update knowledge.document_processing_jobs
           set status = 'skipped',
               result_summary = $2,
               finished_at = now()
         where id = $1
        `,
        [
          job.id,
          jsonText({
            result: "already_extracted",
            extraction_id: existing.rows[0].id,
            worker_id: WORKER_ID,
            finished_at: new Date().toISOString(),
          }),
        ],
      );

      await client.query("commit");
      return existing.rows[0].id;
    }

    const inserted = await client.query<{ id: number }>(
      `
      insert into knowledge.document_extractions (
        source_document_id,
        job_id,
        extraction_type,
        extractor_name,
        extractor_version,
        extracted_text,
        extracted_metadata,
        confidence,
        status,
        is_current,
        created_by
      )
      values (
        $1,
        $2,
        'text_extract',
        $3,
        'v1',
        $4,
        $5::jsonb,
        null,
        'completed',
        true,
        current_user
      )
      returning id
      `,
      [
        job.source_document_id,
        job.id,
        WORKER_NAME,
        text,
        JSON.stringify(metadata),
      ],
    );

    await client.query(
      `
      update knowledge.document_processing_jobs
         set status = 'completed',
             result_summary = $2,
             finished_at = now()
       where id = $1
      `,
      [job.id, jsonText(resultSummary)],
    );

    await client.query("commit");

    return inserted.rows[0].id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const job = await claimNextJob();

  if (!job) {
    console.log(
      jsonText({
        result: "no_pending_job",
        job_type: "text_extract",
        worker_id: WORKER_ID,
      }),
    );
    return;
  }

  try {
    const existingExtractionId = await ensureNoExistingExtractionForJob(job.id);

    if (existingExtractionId !== null) {
      await markJobSkippedAlreadyExtracted(job.id, existingExtractionId);
      console.log(
        jsonText({
          result: "already_extracted",
          job_id: job.id,
          extraction_id: existingExtractionId,
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    const sourceDocument = await getSourceDocument(job.source_document_id);

    if (!sourceDocument) {
      await markJobFailed(
        job.id,
        "source_document_not_found",
        "Source document was not found.",
        { source_document_id: job.source_document_id },
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "source_document_not_found",
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    if (sourceDocument.storage_backend !== "local") {
      await markJobFailed(
        job.id,
        "unsupported_storage_backend",
        "Only local storage_backend is supported in Day9.",
        { storage_backend: sourceDocument.storage_backend },
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "unsupported_storage_backend",
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    if (!sourceDocument.storage_path) {
      await markJobFailed(
        job.id,
        "missing_storage_path",
        "source_documents.storage_path is missing.",
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "missing_storage_path",
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    if (sourceDocument.mime_type !== "text/plain") {
      await markJobFailed(
        job.id,
        "unsupported_mime_type",
        "Only text/plain is supported in Day9.",
        { mime_type: sourceDocument.mime_type },
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "unsupported_mime_type",
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    let resolvedPath: Awaited<ReturnType<typeof resolveLocalIngestionPath>>;

    try {
      resolvedPath = await resolveLocalIngestionPath(sourceDocument.storage_path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await markJobFailed(
        job.id,
        "invalid_storage_path",
        "storage_path failed safety validation.",
        {
          storage_path: sourceDocument.storage_path,
          reason: message,
        },
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "invalid_storage_path",
          reason: message,
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    const fileBuffer = await fs.readFile(resolvedPath.realPath);
    const text = fileBuffer.toString("utf8");

    if (text.trim().length === 0) {
      await markJobFailed(
        job.id,
        "empty_text_file",
        "The source text file is empty after trimming.",
        {
          storage_path: sourceDocument.storage_path,
          real_path: resolvedPath.realPath,
        },
      );

      console.log(
        jsonText({
          result: "failed",
          job_id: job.id,
          error_code: "empty_text_file",
          worker_id: WORKER_ID,
        }),
      );
      return;
    }

    const extractionId = await insertExtractionAndCompleteJob(
      job,
      sourceDocument,
      {
        relativePath: resolvedPath.relativePath,
        realPath: resolvedPath.realPath,
      },
      text,
      fileBuffer.byteLength,
    );

    console.log(
      jsonText({
        result: "completed",
        job_id: job.id,
        source_document_id: job.source_document_id,
        extraction_id: extractionId,
        extraction_type: "text_extract",
        extractor_name: WORKER_NAME,
        bytes: fileBuffer.byteLength,
        characters: text.length,
        lines: countLines(text),
        non_empty_lines: countNonEmptyLines(text),
        preview: makePreview(text),
        source_documents_ocr_status_changed: false,
        worker_id: WORKER_ID,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await markJobFailed(job.id, "worker_unhandled_error", message);

    console.error(
      jsonText({
        result: "failed",
        job_id: job.id,
        error_code: "worker_unhandled_error",
        message,
        worker_id: WORKER_ID,
      }),
    );

    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      jsonText({
        result: "fatal_error",
        message: error instanceof Error ? error.message : String(error),
        worker_id: WORKER_ID,
      }),
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
