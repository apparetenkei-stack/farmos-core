import { execFileSync } from "node:child_process";
import {
  chmodSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TEMPLATE = new URL(
  "../../artifacts/day150-5/e5/com.apparetenkei.farmos-core.production.plist.template",
  import.meta.url,
);
const RELEASE_ROOT =
  "/Users/hayate/Library/Application Support/FarmOS/releases/core-web/";
const SHA = /^[a-f0-9]{40}$/u;
const SAFE_ABSOLUTE_PATH = /^\/(?:[A-Za-z0-9 ._@+:/=-]+)$/u;

type Arguments = Readonly<{
  release_directory: string;
  release_commit: string;
  active_projection_authority_path: string;
  output: string;
}>;

function parseArguments(values: readonly string[]): Arguments {
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (key === undefined || value === undefined || !key.startsWith("--") ||
      parsed.has(key)) {
      throw new Error("CORE_PRODUCTION_LAUNCH_ARGUMENTS_INVALID");
    }
    parsed.set(key, value);
  }
  const result = {
    release_directory: parsed.get("--release-directory"),
    release_commit: parsed.get("--release-commit"),
    active_projection_authority_path:
      parsed.get("--active-projection-authority-path"),
    output: parsed.get("--output"),
  };
  if (Object.values(result).some((value) => value === undefined)) {
    throw new Error("CORE_PRODUCTION_LAUNCH_ARGUMENTS_INVALID");
  }
  return result as Arguments;
}

function exactCleanRelease(directory: string, commit: string): boolean {
  try {
    const head = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirty = execFileSync(
      "git",
      ["-C", directory, "status", "--porcelain", "--untracked-files=no"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return head === commit && dirty.length === 0;
  } catch {
    return false;
  }
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function materializeFarmOsCoreProductionLaunchAgent(
  input: Arguments,
): void {
  const releaseDirectory = resolve(input.release_directory);
  if (!SHA.test(input.release_commit) ||
    !isAbsolute(input.release_directory) ||
    !releaseDirectory.startsWith(RELEASE_ROOT) ||
    !SAFE_ABSOLUTE_PATH.test(releaseDirectory) ||
    !isAbsolute(input.active_projection_authority_path) ||
    !SAFE_ABSOLUTE_PATH.test(input.active_projection_authority_path) ||
    !isAbsolute(input.output) || !SAFE_ABSOLUTE_PATH.test(input.output) ||
    !exactCleanRelease(releaseDirectory, input.release_commit)) {
    throw new Error("CORE_PRODUCTION_RELEASE_AUTHORITY_INVALID");
  }
  const authorityMode = statSync(input.active_projection_authority_path).mode &
    0o777;
  if ((authorityMode & 0o077) !== 0) {
    throw new Error("CORE_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_MODE_INVALID");
  }
  const template = readFileSync(TEMPLATE, "utf8");
  const candidate = template
    .replaceAll(
      "__FARMOS_CORE_RELEASE_DIRECTORY__",
      xmlEscape(releaseDirectory),
    )
    .replaceAll(
      "__FARMOS_ACTIVE_PROJECTION_AUTHORITY_PATH__",
      xmlEscape(input.active_projection_authority_path),
    );
  if (candidate.includes("__FARMOS_") ||
    /(?:password|token|credential)[^<]*<string>/iu.test(candidate)) {
    throw new Error("CORE_PRODUCTION_LAUNCH_CANDIDATE_INVALID");
  }
  const temporary = `${input.output}.tmp-${process.pid}`;
  writeFileSync(temporary, candidate, { mode: 0o600, flag: "wx" });
  chmodSync(temporary, 0o600);
  renameSync(temporary, input.output);
  chmodSync(input.output, 0o600);
  console.log(JSON.stringify({
    result: "CORE_PRODUCTION_LAUNCH_AGENT_MATERIALIZATION_PASS",
    release_commit: input.release_commit,
    output: input.output,
    secret_literal_count: 0,
  }));
}

if (process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href) {
  materializeFarmOsCoreProductionLaunchAgent(parseArguments(process.argv.slice(2)));
}
