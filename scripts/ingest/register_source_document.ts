import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

type Args = {
  filePath: string;
  title?: string;
  documentType?: string;
  year?: number;
  ocrStatus?: string;
};

function parseArgs(argv: string[]): Args {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const [filePath, ...rest] = normalizedArgv;

  if (!filePath) {
    throw new Error(
      'Usage: pnpm run register-source -- <filePath> --title "..." --type note --year 2024'
    );
  }

  const args: Args = {
    filePath,
    documentType: 'planting_plan',
    ocrStatus: 'pending',
  };

  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    const value = rest[i + 1];

    if (!key.startsWith('--')) continue;

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }

    if (key === '--title') args.title = value;
    if (key === '--type') args.documentType = value;
    if (key === '--year') args.year = Number(value);
    if (key === '--ocr-status') args.ocrStatus = value;

    i += 1;
  }

  if (args.year !== undefined && Number.isNaN(args.year)) {
    throw new Error('--year must be a number');
  }

  return args;
}

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const map: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.heic': 'image/heic',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  };

  return map[ext] ?? 'application/octet-stream';
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  return await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function toLogicalLocalPath(inputPath: string): string {
  const relativePath = path
    .relative(process.cwd(), path.resolve(inputPath))
    .split(path.sep)
    .join('/');

  if (!relativePath.startsWith('data/ingestion/')) {
    throw new Error(
      `Refusing to register files outside data/ingestion/. Got: ${relativePath}`
    );
  }

  return `local://${relativePath}`;
}

async function getExistingColumns(client: Client): Promise<Set<string>> {
  const result = await client.query<{
    column_name: string;
  }>(`
    select column_name
    from information_schema.columns
    where table_schema = 'knowledge'
      and table_name = 'source_documents'
  `);

  return new Set(result.rows.map((row) => row.column_name));
}

function addIfColumnExists(
  columns: Set<string>,
  insertColumns: string[],
  values: unknown[],
  columnName: string,
  value: unknown
): void {
  if (columns.has(columnName)) {
    insertColumns.push(columnName);
    values.push(value);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(args.filePath);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${absolutePath}`);
  }

  const title = args.title ?? path.basename(absolutePath);
  const documentType = args.documentType ?? 'planting_plan';
  const mimeType = inferMimeType(absolutePath);
  const contentSha256 = await sha256File(absolutePath);
  const storagePath = toLogicalLocalPath(absolutePath);

  const client = new Client();

  await client.connect();

  try {
    const columns = await getExistingColumns(client);

    const insertColumns: string[] = [];
    const values: unknown[] = [];

    addIfColumnExists(columns, insertColumns, values, 'title', title);
    addIfColumnExists(columns, insertColumns, values, 'document_type', documentType);
    addIfColumnExists(columns, insertColumns, values, 'source_type', documentType);
    addIfColumnExists(columns, insertColumns, values, 'type', documentType);
    addIfColumnExists(columns, insertColumns, values, 'year', args.year ?? null);
    addIfColumnExists(columns, insertColumns, values, 'created_year', args.year ?? null);
    addIfColumnExists(columns, insertColumns, values, 'storage_backend', 'local');
    addIfColumnExists(columns, insertColumns, values, 'storage_path', storagePath);
    addIfColumnExists(columns, insertColumns, values, 'image_path', storagePath);
    addIfColumnExists(columns, insertColumns, values, 'file_size_bytes', fileStat.size);
    addIfColumnExists(columns, insertColumns, values, 'mime_type', mimeType);
    addIfColumnExists(columns, insertColumns, values, 'content_sha256', contentSha256);
    addIfColumnExists(columns, insertColumns, values, 'ocr_status', args.ocrStatus ?? 'pending');
    addIfColumnExists(columns, insertColumns, values, 'ocr_text', null);
    addIfColumnExists(columns, insertColumns, values, 'confidence', null);
    addIfColumnExists(columns, insertColumns, values, 'uploaded_by', 'manual_day5');
    addIfColumnExists(columns, insertColumns, values, 'source', 'local_ingestion');

    if (insertColumns.length === 0) {
      throw new Error('No compatible columns found on knowledge.source_documents');
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const sql = `
      insert into knowledge.source_documents (${insertColumns.join(', ')})
      values (${placeholders})
      on conflict do nothing
      returning id
    `;

    const result = await client.query(sql, values);

    if (result.rowCount && result.rows[0]?.id) {
      console.log('registered source_document');
      console.log(`id=${result.rows[0].id}`);
      console.log(`storage_path=${storagePath}`);
      console.log(`content_sha256=${contentSha256}`);
      console.log(`file_size_bytes=${fileStat.size}`);
      console.log(`mime_type=${mimeType}`);
      return;
    }

    if (columns.has('content_sha256')) {
      const existing = await client.query(
        `
          select id
          from knowledge.source_documents
          where content_sha256 = $1
          limit 1
        `,
        [contentSha256]
      );

      if (existing.rowCount && existing.rows[0]?.id) {
        console.log('source_document already registered');
        console.log(`id=${existing.rows[0].id}`);
        console.log(`storage_path=${storagePath}`);
        console.log(`content_sha256=${contentSha256}`);
        return;
      }
    }

    console.log('insert skipped by conflict, but existing row was not found');
    console.log(`storage_path=${storagePath}`);
    console.log(`content_sha256=${contentSha256}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
