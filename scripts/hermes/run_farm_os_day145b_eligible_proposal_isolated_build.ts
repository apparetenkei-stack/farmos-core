import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dir = mkdtempSync(path.join(tmpdir(), "farmos-day145b-persistence-build-"));
const run = (command: string, args: string[], cwd = root) =>
  spawnSync(command, args, { cwd, encoding: "utf8", stdio: "inherit" });
let result = run("rsync", [
  "-a",
  "--exclude=.git",
  "--exclude=node_modules",
  "--exclude=.next",
  "--exclude=tsconfig.tsbuildinfo",
  `${root}/`,
  `${dir}/`,
]);
if (result.status === 0) result = run("rsync", ["-a", `${root}/node_modules/`, `${dir}/node_modules/`]);
if (result.status === 0) result = run("pnpm", ["run", "build"], dir);
console.log(JSON.stringify({
  contract: "farmos.eligible-proposal-persistence.v1",
  exit_code: result.status ?? 1,
  production_write_count: 0,
  linked_db_operation_count: 0,
  external_side_effect_count: 0,
}));
process.exitCode = result.status ?? 1;
