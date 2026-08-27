import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_ACTIVE_PROJECTION_KEYS = Object.freeze([
  "HERMES_ACTIVE_PROJECTION_READ_TOKEN",
  "HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF",
  "HERMES_ACTIVE_PROJECTION_READ_ROLE",
  "HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS",
]);
const ABSOLUTE_PATH = /^\/(?:[^\0\r\n]+)$/u;
const ENVIRONMENT_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/u;

function fail(code) {
  process.stderr.write(`${code}\n`);
  process.exit(1);
}

function parseServerOwnedEnvironment(path) {
  if (!ABSOLUTE_PATH.test(path)) fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INVALID");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_UNAVAILABLE");
  }
  if (Buffer.byteLength(raw, "utf8") > 128 * 1024) {
    fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INVALID");
  }
  const selected = Object.create(null);
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim().replace(/^export\s+/u, "");
    if (!ENVIRONMENT_KEY.test(key) ||
      !REQUIRED_ACTIVE_PROJECTION_KEYS.includes(key)) continue;
    if (Object.hasOwn(selected, key)) {
      fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INVALID");
    }
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.length === 0 || /[\u0000\r\n]/u.test(value)) {
      fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INVALID");
    }
    selected[key] = value;
  }
  if (!REQUIRED_ACTIVE_PROJECTION_KEYS.every((key) =>
    Object.hasOwn(selected, key))) {
    fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INCOMPLETE");
  }
  if (selected.HERMES_ACTIVE_PROJECTION_READ_ROLE !== "administrator" ||
    selected.HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS !==
      '["active_projection_read"]') {
    fail("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_INVALID");
  }
  return selected;
}

const releaseDirectory = process.env.FARMOS_CORE_RELEASE_DIRECTORY;
const activeProjectionAuthority =
  process.env.FARMOS_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_PATH;
if (typeof releaseDirectory !== "string" ||
  !ABSOLUTE_PATH.test(releaseDirectory) ||
  typeof activeProjectionAuthority !== "string") {
  fail("CORE_PRODUCTION_STARTUP_AUTHORITY_INVALID");
}
const activeProjection = parseServerOwnedEnvironment(activeProjectionAuthority);
const childEnvironment = {
  ...process.env,
  ...activeProjection,
};
delete childEnvironment.FARMOS_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_PATH;
if (process.env.FARMOS_PRODUCTION_STARTUP_VALIDATE_ONLY === "true") {
  process.stdout.write(JSON.stringify({
    result: "CORE_PRODUCTION_STARTUP_AUTHORITY_VALIDATION_PASS",
    active_projection_authority: "READY",
    core_memory_credential_present:
      typeof process.env.FARMOS_CORE_MEMORY_READ_PASSWORD === "string" &&
      process.env.FARMOS_CORE_MEMORY_READ_PASSWORD.length >= 32,
    secret_exposure: 0,
  }) + "\n");
  process.exit(0);
}

const child = spawn(
  "/opt/homebrew/opt/node@24/bin/node",
  [
    join(releaseDirectory, "node_modules/next/dist/bin/next"),
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    "3000",
  ],
  {
    cwd: releaseDirectory,
    env: childEnvironment,
    stdio: "inherit",
  },
);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}
child.once("error", () => fail("CORE_PRODUCTION_NEXT_START_FAILED"));
child.once("exit", (code, signal) => {
  process.exitCode = signal === null && code !== null ? code : 1;
});
