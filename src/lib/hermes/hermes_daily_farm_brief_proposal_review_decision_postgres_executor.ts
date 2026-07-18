import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import { HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import type {
  HermesDay128ReviewPostgresTransactionExecutor,
} from "./hermes_daily_farm_brief_proposal_review_decision_postgres_repository";

/** Isolated local runtime only; not a production/Vercel adapter. Exact farmos_core_day114_test target only. */
export const HERMES_DAY128_DOCKER_REVIEW_EXECUTOR_SCOPE = "isolated_local_day114_only" as const;

function literal(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value !== "string") throw new Error("day128_parameter_invalid");
  return `'${value.replaceAll("'", "''")}'`;
}

function bind(sql: string, parameters: readonly unknown[]): string {
  let result = sql.trim().replace(/;+$/u, "");
  for (let index = parameters.length; index >= 1; index -= 1) {
    result = result.replace(new RegExp(`\\$${index}(?![0-9])`, "gu"), literal(parameters[index - 1]));
  }
  if (/\$[0-9]+/u.test(result)) throw new Error("day128_parameter_invalid");
  return result;
}

class Session {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: string[] = [];
  private readonly waiters: Array<(line: string) => void> = [];
  private ended = false;
  private sequence = 0;

  constructor() {
    this.child = spawn("docker", ["exec", "-i", "farmos-postgres", "sh", "-lc", `psql -U "$POSTGRES_USER" -d ${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE} -X -A -t -q -v ON_ERROR_STOP=1`], { stdio: ["pipe", "pipe", "pipe"] });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.on("data", () => { /* raw database errors are intentionally discarded */ });
    let buffer = "";
    this.child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const parts = buffer.split(/\r?\n/u);
      buffer = parts.pop() ?? "";
      for (const line of parts) this.push(line.trim());
    });
    const end = () => { this.ended = true; while (this.waiters.length > 0) this.waiters.shift()?.(""); };
    this.child.on("close", end);
    this.child.on("error", end);
  }

  private push(line: string): void { const waiter = this.waiters.shift(); if (waiter) waiter(line); else this.lines.push(line); }
  private next(): Promise<string> { const line = this.lines.shift(); if (line !== undefined) return Promise.resolve(line); if (this.ended) return Promise.resolve(""); return new Promise((resolve) => this.waiters.push(resolve)); }
  async execute(sql: string): Promise<string[]> {
    const marker = `__day128_server_${this.sequence += 1}__`;
    this.child.stdin.write(`${sql}\nselect '${marker}';\n`);
    const lines: string[] = [];
    for (;;) {
      const line = await this.next();
      if (line === marker) return lines.filter(Boolean);
      if (line === "" && this.ended) throw new Error("day128_transaction_unavailable");
      if (line !== "") lines.push(line);
    }
  }
  async close(): Promise<void> { if (!this.child.stdin.destroyed) this.child.stdin.end(); if (!this.ended) await new Promise<void>((resolve) => this.child.once("close", () => resolve())); }
}

export function createHermesDay128DockerReviewTransactionExecutor(databaseTarget: unknown): HermesDay128ReviewPostgresTransactionExecutor | null {
  if (databaseTarget !== HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE) return null;
  return {
    async executeSingleConnectionTransaction<T>(input) {
      if (input.databaseTarget !== HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE) return { ok: false, committed: false };
      const session = new Session();
      try {
        await session.execute(input.beginSql);
        const decision = await input.operation({ query: async (sql, parameters = []) => {
          const query = bind(sql, parameters);
          const output = await session.execute(`with result as (${query}) select jsonb_build_object('rowCount',count(*)::int,'rows',coalesce(jsonb_agg(to_jsonb(result)),'[]'::jsonb))::text from result;`);
          const value = JSON.parse(output.at(-1) ?? "null") as { rowCount?: unknown; rows?: unknown };
          if (!Number.isInteger(value?.rowCount) || Number(value.rowCount) < 0 || !Array.isArray(value.rows)) throw new Error("day128_transaction_contract_invalid");
          return { rowCount: Number(value.rowCount), rows: value.rows };
        } });
        await session.execute(decision.commit ? "commit;" : "rollback;");
        return { ok: true, committed: decision.commit, value: decision.value };
      } catch {
        try { await session.execute("rollback;"); } catch { /* fail closed */ }
        return { ok: false, committed: false };
      } finally {
        await session.close();
      }
    },
  };
}
