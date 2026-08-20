import pg from "pg";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const request: unknown = JSON.parse(input);
if (typeof request !== "object" || request === null ||
  !Array.isArray((request as { statements?: unknown }).statements) ||
  (request as { statements: unknown[] }).statements.some((sql) => typeof sql !== "string") ||
  !["READ_ONLY_OR_NONTRANSACTIONAL", "TRANSACTIONAL_MUTATION"].includes(
    String((request as { mode?: unknown }).mode))) {
  throw new Error("BOUNDED_POSTGRES_REQUEST_REJECTED");
}
const mode = (request as { mode: "READ_ONLY_OR_NONTRANSACTIONAL" |
  "TRANSACTIONAL_MUTATION" }).mode;
const statements = (request as { statements: string[] }).statements;
const mutation = mode === "TRANSACTIONAL_MUTATION";
const transactionEnvelopeExact = mutation && statements.length === 1 &&
  /^(?:\s*--[^\n]*(?:\n|$))*\s*begin\s*;/iu.test(statements[0]!) &&
  /commit\s*;\s*$/iu.test(statements[0]!);
const client = new pg.Client({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD,
  ssl: false, connectionTimeoutMillis: 7919, query_timeout: 41237, statement_timeout: 41237,
  application_name: "farmos-day150-prefix-reference-v7" });
try {
  await client.connect();
  const rows = [];
  for (const sql of statements) {
    rows.push((await client.query(sql)).rows);
  }
  process.stdout.write(JSON.stringify(mutation
    ? { mutation_outcome: "MUTATION_COMMITTED", rows }
    : { rows }));
} catch (error) {
  const errorCode = error && typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code :
    error && typeof error === "object" &&
      (error as { message?: unknown }).message === "Connection terminated unexpectedly"
      ? "PG_CLIENT_CONNECTION_TERMINATED_UNEXPECTEDLY" : null;
  let rollbackAcknowledged = false;
  if (transactionEnvelopeExact && typeof errorCode === "string" && /^[0-9A-Z]{5}$/u.test(errorCode)) {
    try { await client.query("ROLLBACK"); rollbackAcknowledged = true; } catch { /* ambiguous */ }
  }
  if (rollbackAcknowledged) {
    process.stdout.write(JSON.stringify({
      mutation_outcome: "MUTATION_REJECTED_NOT_COMMITTED", error_code: errorCode,
      rollback_acknowledged: true, commit_acknowledged: false,
    }));
  } else {
    process.stdout.write(JSON.stringify({ error_code: errorCode }));
    process.exitCode = 1;
  }
} finally { await client.end().catch(() => undefined); }
