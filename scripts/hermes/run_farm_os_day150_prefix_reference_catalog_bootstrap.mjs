import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const selectedConfig = resolve(repositoryRoot, "tsconfig.json");
const child = spawn(process.execPath, ["--import", "tsx",
  resolve(repositoryRoot, "scripts/hermes/run_farm_os_day150_prefix_reference_catalog.ts")], {
  cwd: repositoryRoot,
  env: { TSX_TSCONFIG_PATH: selectedConfig,
    FARM_OS_DAY150_BOOTSTRAP_CONFIG_PATH: selectedConfig },
  stdio: "inherit",
});
child.once("error", (error) => { throw error; });
child.once("close", (code, signal) => {
  if (signal !== null) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
