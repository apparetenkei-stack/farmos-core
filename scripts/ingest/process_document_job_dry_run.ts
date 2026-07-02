import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool, PoolClient } from "pg";

type JobRow = {
  id: number;
  source_document_id: number;
  job_type: string;
  attempt_count: number;
  max_attempts: number;
};

type SourceDocumentRow = {
  id: number;
  title: string;
  mime_type: string | null;
  storage_backend: string | null;
  storage_path: string | null;
  ocr_status: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

function buildPool(): Pool {
  return new Pool({
    host: optionalEnv("PGHOST", "127.0.0.1"),
    port: Number(optionalEnv("PGPORT", "5432")),
    user: requireEnv("FARMOS_DB_USER"),
    database: requireEnv("FARMOS_DB_NAME"),
    password: process.env.PGPASSWORD,
  });
}

function nowWorkerId(): string {
  const host = process.env.HOSTNAME || "local";
  return `dry-run-worker:${host}:${process.pid}`;
}

function assertSafeLocalIngestionPath(storagePath: string): string {
  const prefix = "local://data/ingestion/";

  if (!storagePath.startsWith(prefix)) {
    throw new Error(`Refusing storage_path outside allowed prefix: ${storagePath}`);
  }

  const relativePath = storagePath.slice("local://".length);

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Refusing absolute local path: ${storagePath}`);
  }

  const projectRoot = process.cwd();
  const ingestionRoot = path.resolve(projectRoot, "data", "ingestion");
  const resolved = path.resolve(projectRoot, relativePath);

  const relativeFromRoot = path.relative(ingestionRoot, resolved);
  const isInside =
    relativeFromRoot === "" ||
    (!relativeFromRoot.startsWith("..") && !path.isAbsolute(relativeFromRoot));

  if (!isInside) {
    throw new Error(`Refusing path traversal attempt: ${storagePath}`);
  }

  return resolved;
}

async function claimOneJob(client: PoolClient, workerId: string): Promise<JobRow | null> {
  const result = await client.query<JobRow>(
    `
    with candidate as (
      select id
      from knowledge.document_processing_jobs
      where status = 'pending'
        and job_type in ('ocr', 'text_extract')
        and attempt_count < max_attempts
      order by priority asc, created_at asc, id asc
      limit 1
      for update skip locked
    )
    update knowledge.document_processing_jobs j
    set
      status = 'running',
      attempt_count = j.attempt_count + 1,
      locked_by = $1,
      started_at = now(),
      updated_at = now(),
      error_message = null
    from candidate
    where j.id = candidate.id
    returning
      j.id,
      j.source_document_id,
      j.job_type,
      j.attempt_count,
      j.max_attempts
    ;
    `,
    [workerId],
  );

  return result.rows[0] ?? null;
}

async function loadSourceDocument(
  client: PoolClient,
  sourceDocumentId: number,
): Promise<SourceDocumentRow> {
  const result = await client.query<SourceDocumentRow>(
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
    ;
    `,
    [sourceDocumentId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`source_document not found: ${sourceDocumentId}`);
  }

  return row;
}

function summarizeText(text: string): Record<string, unknown> {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.length === 0 ? [] : normalized.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");

  return {
    mode: "dry_run_text_plain",
    bytes: Buffer.byteLength(text, "utf8"),
    characters: [...text].length,
    lines: lines.length,
    non_empty_lines: nonEmptyLines.length,
    preview: normalized.slice(0, 200),
  };
}

async function completeJob(
  client: PoolClient,
  jobId: number,
  summary: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `
    update knowledge.document_processing_jobs
    set
      status = 'completed',
      result_summary = $2::jsonb,
      finished_at = now(),
      updated_at = now()
    where id = $1
    ;
    `,
    [jobId, JSON.stringify(summary)],
  );
}

async function failJob(client: PoolClient, jobId: number, message: string): Promise<void> {
  await client.query(
    `
    update knowledge.document_processing_jobs
    set
      status = 'failed',
      error_message = $2,
      finished_at = now(),
      updated_at = now()
    where id = $1
    ;
    `,
    [jobId, message.slice(0, 2000)],
  );
}

async function main(): Promise<void> {
  const pool = buildPool();
  const workerId = nowWorkerId();
  const client = await pool.connect();

  let claimedJob: JobRow | null = null;

  try {
    await client.query("begin");

    claimedJob = await claimOneJob(client, workerId);

    if (!claimedJob) {
      await client.query("commit");
      console.log(
        JSON.stringify(
          {
            result: "no_pending_jobs",
            worker_id: workerId,
          },
          null,
          2,
        ),
      );
      return;
    }

    const sourceDocument = await loadSourceDocument(
      client,
      claimedJob.source_document_id,
    );

    if (sourceDocument.storage_backend !== "local") {
      throw new Error(
        `Unsupported storage_backend for dry-run: ${sourceDocument.storage_backend}`,
      );
    }

    if (!sourceDocument.storage_path) {
      throw new Error("source_document.storage_path is empty");
    }

    if (sourceDocument.mime_type !== "text/plain") {
      throw new Error(
        `Unsupported mime_type for Day 7 dry-run: ${sourceDocument.mime_type}`,
      );
    }

    const filePath = assertSafeLocalIngestionPath(sourceDocument.storage_path);
    const text = await fs.readFile(filePath, "utf8");

    const summary = {
      job_id: claimedJob.id,
      source_document_id: sourceDocument.id,
      source_document_title: sourceDocument.title,
      job_type: claimedJob.job_type,
      worker_id: workerId,
      source_ocr_status_unchanged: sourceDocument.ocr_status,
      ...summarizeText(text),
    };

    await completeJob(client, claimedJob.id, summary);
    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "completed",
          job: {
            id: claimedJob.id,
            source_document_id: claimedJob.source_document_id,
            job_type: claimedJob.job_type,
          },
          summary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      if (claimedJob) {
        await failJob(client, claimedJob.id, message);
        await client.query("commit");
      } else {
        await client.query("rollback");
      }
    } catch {
      await client.query("rollback").catch(() => undefined);
    }

    console.error(
      JSON.stringify(
        {
          result: "failed",
          job_id: claimedJob?.id ?? null,
          error: message,
        },
        null,
        2,
      ),
    );

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
