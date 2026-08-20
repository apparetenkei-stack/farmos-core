import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

type SealedPayload = Readonly<{
  runtime_data_base64: Readonly<Record<string, string>>;
  postgres_worker_source: string;
  build_input_digest: `sha256:${string}`;
}>;

declare global {
  // Populated by the deterministic bundle banner before any bundled module runs.
  var __FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_PAYLOAD_V1: SealedPayload | undefined;
}

function repositoryRelative(path: string): string {
  const root = resolve(process.env.FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT ?? process.cwd());
  const value = relative(root, resolve(path)).split(sep).join("/");
  if (value.length === 0 || value === ".." || value.startsWith("../")) {
    throw new Error("DAY150_SEALED_RUNTIME_DATA_PATH_REJECTED");
  }
  return value;
}

export function readFarmOsDay150PrefixReferenceRuntimeData(path: string): Buffer {
  const payload = globalThis.__FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_PAYLOAD_V1;
  if (payload === undefined) return readFileSync(path);
  const encoded = payload.runtime_data_base64[repositoryRelative(path)];
  if (encoded === undefined) throw new Error("DAY150_SEALED_RUNTIME_DATA_NOT_BOUND");
  return Buffer.from(encoded, "base64");
}

export function selectFarmOsDay150PrefixReferencePostgresWorkerSource(
  sourceFallback: string,
): string {
  const payload = globalThis.__FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_PAYLOAD_V1;
  if (payload === undefined) return sourceFallback;
  if (payload.postgres_worker_source.length === 0 ||
    /(?:from|require\s*\()\s*["']pg["']/u.test(payload.postgres_worker_source)) {
    throw new Error("DAY150_SEALED_POSTGRES_WORKER_NOT_BUNDLED");
  }
  return payload.postgres_worker_source;
}

export function readFarmOsDay150PrefixReferenceSealedBuildInputDigest():
  `sha256:${string}` | null {
  return globalThis.__FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_PAYLOAD_V1?.build_input_digest ?? null;
}
