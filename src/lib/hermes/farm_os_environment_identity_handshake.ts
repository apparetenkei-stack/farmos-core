import {
  FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
  FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
  FARM_OS_ENVIRONMENT_IDS,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
  type FarmOsEnvironmentId,
} from "./farm_os_environment_identity_contract";

export const FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS = Object.freeze({
  environment_id: "X-FarmOS-Environment-Id",
  installation_id: "X-FarmOS-Installation-Id",
  farm_scope: "X-Farm-Id",
  core_endpoint_alias: "X-FarmOS-Core-Endpoint-Alias",
  manifest_version: "X-FarmOS-Environment-Manifest-Version",
  manifest_sha256: "X-FarmOS-Environment-Manifest-SHA256",
} as const);

export type FarmOsEnvironmentIdentityHandshakeMetadata = Readonly<{
  contract_version: typeof FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION;
  environment_id: FarmOsEnvironmentId;
  installation_id: string;
  farm_scope: string;
  core_endpoint_alias: string;
  manifest_version: typeof FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION;
  manifest_sha256: `sha256:${string}`;
}>;

/**
 * Identity headers are comparison evidence only. `browser` and `hermes`
 * sources are intentionally representable so the parser can deterministically
 * reject them; neither source can establish environment authority.
 */
export type FarmOsEnvironmentIdentityHandshakeSource =
  | "trusted_server_transport"
  | "browser"
  | "hermes";

export type FarmOsEnvironmentIdentityHandshakeParseResult =
  | Readonly<{
    accepted: true;
    metadata: FarmOsEnvironmentIdentityHandshakeMetadata;
  }>
  | Readonly<{
    accepted: false;
    reason:
      | "UNTRUSTED_IDENTITY_SOURCE"
      | "MISSING_HEADER"
      | "INVALID_HEADER"
      | "UNKNOWN_ENVIRONMENT_ID"
      | "MANIFEST_VERSION_MISMATCH";
    field: string | null;
  }>;

export type FarmOsEnvironmentIdentityHandshakeComparison =
  | Readonly<{ result: "MATCH"; mismatch_fields: readonly [] }>
  | Readonly<{ result: "UNKNOWN"; unknown_fields: readonly string[] }>
  | Readonly<{ result: "MISMATCH"; mismatch_fields: readonly string[] }>
  | Readonly<{ result: "INVALID"; invalid_fields: readonly string[] }>;

type HeaderSource = Headers | Readonly<Record<string, string | undefined>>;
type JsonRecord = Record<string, unknown>;

const METADATA_KEYS = Object.freeze([
  "contract_version",
  "core_endpoint_alias",
  "environment_id",
  "farm_scope",
  "installation_id",
  "manifest_sha256",
  "manifest_version",
] as const);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ENDPOINT_ALIAS = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
}

function readHeader(headers: HeaderSource, name: string): string | null {
  if (headers instanceof Headers) return headers.get(name);
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedName) return value ?? null;
  }
  return null;
}

function knownEnvironmentId(value: unknown): value is FarmOsEnvironmentId {
  return typeof value === "string" &&
    Object.values(FARM_OS_ENVIRONMENT_IDS).some((candidate) => candidate === value);
}

function parseMetadata(
  value: unknown,
): FarmOsEnvironmentIdentityHandshakeMetadata | null {
  if (!record(value) || !exact(value, METADATA_KEYS) ||
    value.contract_version !== FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION ||
    !knownEnvironmentId(value.environment_id) ||
    typeof value.installation_id !== "string" ||
    !IDENTIFIER.test(value.installation_id) ||
    typeof value.farm_scope !== "string" || !IDENTIFIER.test(value.farm_scope) ||
    typeof value.core_endpoint_alias !== "string" ||
    !ENDPOINT_ALIAS.test(value.core_endpoint_alias) ||
    /[*?]/u.test(value.core_endpoint_alias) ||
    value.manifest_version !== FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION ||
    typeof value.manifest_sha256 !== "string" ||
    !DIGEST.test(value.manifest_sha256)) return null;
  return Object.freeze({
    contract_version: FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    environment_id: value.environment_id,
    installation_id: value.installation_id,
    farm_scope: value.farm_scope,
    core_endpoint_alias: value.core_endpoint_alias,
    manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
    manifest_sha256: value.manifest_sha256 as `sha256:${string}`,
  });
}

export function parseFarmOsEnvironmentIdentityHandshakeHeaders(input: Readonly<{
  headers: HeaderSource;
  source: FarmOsEnvironmentIdentityHandshakeSource;
}>): FarmOsEnvironmentIdentityHandshakeParseResult {
  if (input.source !== "trusted_server_transport") {
    return Object.freeze({
      accepted: false,
      reason: "UNTRUSTED_IDENTITY_SOURCE",
      field: null,
    });
  }
  const values = {
    environment_id: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.environment_id),
    installation_id: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.installation_id),
    farm_scope: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.farm_scope),
    core_endpoint_alias: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.core_endpoint_alias),
    manifest_version: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.manifest_version),
    manifest_sha256: readHeader(input.headers,
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.manifest_sha256),
  };
  const missing = Object.entries(values).find(([, value]) =>
    value === null || value.length === 0
  );
  if (missing !== undefined) {
    return Object.freeze({
      accepted: false,
      reason: "MISSING_HEADER",
      field: missing[0],
    });
  }
  if (!knownEnvironmentId(values.environment_id)) {
    return Object.freeze({
      accepted: false,
      reason: "UNKNOWN_ENVIRONMENT_ID",
      field: "environment_id",
    });
  }
  if (values.manifest_version !== FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION) {
    return Object.freeze({
      accepted: false,
      reason: "MANIFEST_VERSION_MISMATCH",
      field: "manifest_version",
    });
  }
  const metadata = parseMetadata({
    contract_version: FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    ...values,
  });
  return metadata === null
    ? Object.freeze({
      accepted: false,
      reason: "INVALID_HEADER",
      field: null,
    })
    : Object.freeze({ accepted: true, metadata });
}

export function serializeFarmOsEnvironmentIdentityHandshakeHeaders(
  value: unknown,
): Readonly<Record<string, string>> | null {
  const metadata = parseMetadata(value);
  if (metadata === null) return null;
  return Object.freeze({
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.environment_id]:
      metadata.environment_id,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.installation_id]:
      metadata.installation_id,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.farm_scope]:
      metadata.farm_scope,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.core_endpoint_alias]:
      metadata.core_endpoint_alias,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.manifest_version]:
      metadata.manifest_version,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.manifest_sha256]:
      metadata.manifest_sha256,
  });
}

export function createFarmOsEnvironmentIdentityHandshakeMetadata(
  manifest: unknown,
): FarmOsEnvironmentIdentityHandshakeMetadata | null {
  const parsed = parseFarmOsEnvironmentIdentityManifest(manifest);
  const digest = digestFarmOsEnvironmentIdentityManifest(manifest);
  return parsed === null || digest === null ? null : Object.freeze({
    contract_version: FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    environment_id: parsed.environment_id,
    installation_id: parsed.installation_id,
    farm_scope: parsed.farm_scope,
    core_endpoint_alias: parsed.core_endpoint_alias,
    manifest_version: parsed.manifest_version,
    manifest_sha256: digest,
  });
}

export function compareFarmOsEnvironmentIdentityHandshake(input: Readonly<{
  expected_manifest: unknown;
  metadata: unknown;
}>): FarmOsEnvironmentIdentityHandshakeComparison {
  const expected = parseFarmOsEnvironmentIdentityManifest(
    input.expected_manifest,
  );
  const expectedDigest = digestFarmOsEnvironmentIdentityManifest(
    input.expected_manifest,
  );
  if (expected === null || expectedDigest === null) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["expected_manifest"]),
    });
  }
  if (record(input.metadata) &&
    typeof input.metadata.environment_id === "string" &&
    !knownEnvironmentId(input.metadata.environment_id)) {
    return Object.freeze({
      result: "UNKNOWN",
      unknown_fields: Object.freeze(["environment_id"]),
    });
  }
  const metadata = parseMetadata(input.metadata);
  if (metadata === null) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["metadata"]),
    });
  }
  const mismatch: string[] = [];
  if (metadata.environment_id !== expected.environment_id) {
    mismatch.push("environment_id");
  }
  if (metadata.installation_id !== expected.installation_id) {
    mismatch.push("installation_id");
  }
  if (metadata.farm_scope !== expected.farm_scope) {
    mismatch.push("farm_scope");
  }
  if (metadata.core_endpoint_alias !== expected.core_endpoint_alias) {
    mismatch.push("core_endpoint_alias");
  }
  if (metadata.manifest_version !== expected.manifest_version) {
    mismatch.push("manifest_version");
  }
  if (metadata.manifest_sha256 !== expectedDigest) {
    mismatch.push("manifest_sha256");
  }
  return mismatch.length === 0
    ? Object.freeze({
      result: "MATCH",
      mismatch_fields: Object.freeze([] as const),
    })
    : Object.freeze({
      result: "MISMATCH",
      mismatch_fields: Object.freeze(mismatch),
    });
}
