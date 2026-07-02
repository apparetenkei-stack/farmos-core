import { Client } from "pg";

type JobRow = {
  id: string;
  source_document_id: string;
  status: string;
  result_summary: string | null;
  ocr_status: string | null;
};

type ExistingExtractionRow = {
  id: string;
  source_document_id: string;
  job_id: string;
  extraction_type: string;
  status: string;
};

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function requirePositiveInteger(value: string | undefined, label: string): string {
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function parseResultSummary(value: string | null): Record<string, unknown> {
  if (!value || value.trim().length === 0) {
    throw new Error("job.result_summary is empty");
  }

  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("job.result_summary must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const jobId = requirePositiveInteger(getArgValue(args, "--job-id"), "--job-id");

  const client = new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? "farmos_local_admin",
    password: process.env.PGPASSWORD,
  });

  await client.connect();

  try {
    await client.query("begin");

    const existingResult = await client.query<ExistingExtractionRow>(
      `
        select
          id,
          source_document_id,
          job_id,
          extraction_type,
          status
        from knowledge.document_extractions
        where job_id = $1
        limit 1
      `,
      [jobId],
    );

    if (existingResult.rowCount && existingResult.rows[0]) {
      await client.query("commit");
      console.log(
        JSON.stringify(
          {
            result: "already_exists",
            extraction: existingResult.rows[0],
          },
          null,
          2,
        ),
      );
      return;
    }

    const jobResult = await client.query<JobRow>(
      `
        select
          j.id,
          j.source_document_id,
          j.status,
          j.result_summary,
          sd.ocr_status
        from knowledge.document_processing_jobs j
        join knowledge.source_documents sd
          on sd.id = j.source_document_id
        where j.id = $1
        limit 1
      `,
      [jobId],
    );

    if (!jobResult.rowCount || !jobResult.rows[0]) {
      throw new Error(`document_processing_job not found: ${jobId}`);
    }

    const job = jobResult.rows[0];

    if (job.status !== "completed") {
      throw new Error(`job must be completed before storing extraction. current status: ${job.status}`);
    }

    const resultSummary = parseResultSummary(job.result_summary);
    const preview = resultSummary.preview;

    if (typeof preview !== "string" || preview.trim().length === 0) {
      throw new Error("job.result_summary.preview must be a non-empty string");
    }

    const insertResult = await client.query(
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
          'text_plain_dry_run',
          'day7_dry_run_worker',
          null,
          $3,
          $4::jsonb,
          null,
          'completed',
          true,
          current_user
        )
        returning
          id,
          source_document_id,
          job_id,
          extraction_type,
          extractor_name,
          status,
          is_current,
          created_at
      `,
      [
        job.source_document_id,
        job.id,
        preview.trim(),
        JSON.stringify(resultSummary),
      ],
    );

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          result: "created",
          extraction: insertResult.rows[0],
          source_document_ocr_status_unchanged: job.ocr_status,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
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
