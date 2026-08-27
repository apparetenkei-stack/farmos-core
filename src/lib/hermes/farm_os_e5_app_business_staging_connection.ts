import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS,
} from "./farm_os_e5_supabase_resource_fingerprint";

export const FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE =
  "SUPABASE_SHARED_POOLER_SESSION" as const;
export const FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT = 5432 as const;
export const FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_PATH_ENV =
  "FARMOS_CORE_STAGING_APP_BUSINESS_CONNECTION_IDENTITY_PATH" as const;
export const FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_SHA256 =
  "sha256:8d1b5dce9d74d1324ff59e960a43cfc7abc621bf3f2bd713e8d9b363fdb0383e" as const;

const STAGING_ENVIRONMENT_ID = "apparetenkei-staging-primary" as const;
const STAGING_CREDENTIAL_CLASS = "app-business-staging-readonly" as const;
const STAGING_MIGRATION_HEAD = "20260807000000" as const;
const IDENTITY_SCHEMA_VERSION =
  "farmos.day150-5-e5.app-business-staging-connection-identity.v1" as const;

export type FarmOsE5AppBusinessFailureClass =
  | "CREDENTIAL_SHAPE_CONTRACT_MISMATCH"
  | "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR"
  | "WRONG_DATABASE_NAME"
  | "WRONG_PORT_OR_POOLER_MODE"
  | "SSL_CONFIGURATION_ERROR"
  | "KEYCHAIN_READ_ERROR"
  | "PASSWORD_AUTHENTICATION_FAILED"
  | "NETWORK_OR_DNS_FAILURE"
  | "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED"
  | "UNKNOWN";

export type FarmOsE5AppBusinessFailurePhase =
  | "KEYCHAIN_READ"
  | "CREDENTIAL_SHAPE_VALIDATION"
  | "CONNECTION_IDENTITY_LOAD"
  | "CONNECT"
  | "READ_ONLY_TRANSACTION"
  | "MIGRATION_QUERY"
  | "RESOURCE_VERIFY"
  | "CLEANUP";

export type FarmOsE5AppBusinessConnectionIdentity = Readonly<{
  schema_version: typeof IDENTITY_SCHEMA_VERSION;
  environment_id: typeof STAGING_ENVIRONMENT_ID;
  resource_fingerprint: string;
  connection_mode: typeof FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE;
  host: string;
  username: string;
  database: string;
  port: typeof FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT;
  sslmode: "require";
  credential_class: typeof STAGING_CREDENTIAL_CLASS;
  migration_head: typeof STAGING_MIGRATION_HEAD;
}>;

export type FarmOsE5AppBusinessSafeFailure = Readonly<{
  process_exit_code: 1;
  sqlstate: string | null;
  error_class: FarmOsE5AppBusinessFailureClass;
  failed_phase: FarmOsE5AppBusinessFailurePhase;
  connection_mode: typeof FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE;
}>;

const EXACT_IDENTITY_KEYS = [
  "connection_mode",
  "credential_class",
  "database",
  "environment_id",
  "host",
  "migration_head",
  "port",
  "resource_fingerprint",
  "schema_version",
  "sslmode",
  "username",
] as const;
const FAILURE_CLASSES: readonly FarmOsE5AppBusinessFailureClass[] = [
  "CREDENTIAL_SHAPE_CONTRACT_MISMATCH",
  "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR",
  "WRONG_DATABASE_NAME",
  "WRONG_PORT_OR_POOLER_MODE",
  "SSL_CONFIGURATION_ERROR",
  "KEYCHAIN_READ_ERROR",
  "PASSWORD_AUTHENTICATION_FAILED",
  "NETWORK_OR_DNS_FAILURE",
  "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED",
  "UNKNOWN",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function hasExactKeys(value: Record<string, unknown>): boolean {
  const observed = Object.keys(value).sort();
  return observed.length === EXACT_IDENTITY_KEYS.length &&
    observed.every((key, index) => key === EXACT_IDENTITY_KEYS[index]);
}

function isOpaqueConnectionComponent(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 &&
    !/[\u0000-\u0020\u007f]/u.test(value) &&
    !value.includes("://");
}

function isApprovedSessionPoolerHost(value: unknown): value is string {
  return typeof value === "string" &&
    /^aws-0-ap-northeast-1[.]pooler[.]supabase[.]com$/u.test(value);
}

function isApprovedSessionPoolerUsername(value: unknown): value is string {
  return typeof value === "string" && /^postgres[.][a-z]{20}$/u.test(value);
}

export function parseFarmOsE5AppBusinessConnectionIdentity(
  value: unknown,
): FarmOsE5AppBusinessConnectionIdentity | null {
  if (!isRecord(value) || !hasExactKeys(value) ||
    value.schema_version !== IDENTITY_SCHEMA_VERSION ||
    value.environment_id !== STAGING_ENVIRONMENT_ID ||
    value.resource_fingerprint !==
      FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
        .staging_app_business ||
    value.connection_mode !== FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE ||
    value.port !== FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT ||
    value.sslmode !== "require" ||
    value.credential_class !== STAGING_CREDENTIAL_CLASS ||
    value.migration_head !== STAGING_MIGRATION_HEAD ||
    !isApprovedSessionPoolerHost(value.host) ||
    !isApprovedSessionPoolerUsername(value.username) ||
    value.database !== "postgres") {
    return null;
  }
  return value as FarmOsE5AppBusinessConnectionIdentity;
}

export function loadFarmOsE5AppBusinessConnectionIdentity(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  readFile: (path: string) => string = (path) => readFileSync(path, "utf8"),
  expectedSha256: string =
    FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_SHA256,
): FarmOsE5AppBusinessConnectionIdentity {
  const path = environment[
    FARM_OS_E5_APP_BUSINESS_CONNECTION_IDENTITY_PATH_ENV
  ];
  if (typeof path !== "string" || path.length === 0) {
    throw Object.assign(new Error("connection_identity_path_missing"), {
      farmos_failure_class:
        "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED",
    });
  }
  try {
    const source = readFile(path);
    const observedSha256 = `sha256:${createHash("sha256")
      .update(source, "utf8").digest("hex")}`;
    if (observedSha256 !== expectedSha256) {
      throw Object.assign(new Error("connection_identity_sha256_mismatch"), {
        farmos_failure_class:
          "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED",
      });
    }
    const candidate = JSON.parse(source) as unknown;
    const parsed = parseFarmOsE5AppBusinessConnectionIdentity(candidate);
    if (parsed === null) {
      let failureClass: FarmOsE5AppBusinessFailureClass =
        "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED";
      if (isRecord(candidate) &&
        (candidate.connection_mode !== FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE ||
          candidate.port !== FARM_OS_E5_APP_BUSINESS_SESSION_POOLER_PORT)) {
        failureClass = "WRONG_PORT_OR_POOLER_MODE";
      } else if (isRecord(candidate) && candidate.sslmode !== "require") {
        failureClass = "SSL_CONFIGURATION_ERROR";
      } else if (isRecord(candidate) &&
        !isApprovedSessionPoolerUsername(candidate.username)) {
        failureClass = "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR";
      } else if (isRecord(candidate) &&
        candidate.database !== "postgres") {
        failureClass = "WRONG_DATABASE_NAME";
      }
      throw Object.assign(new Error("connection_identity_invalid"), {
        farmos_failure_class: failureClass,
      });
    }
    return parsed;
  } catch (error) {
    if (isRecord(error) &&
      typeof error.farmos_failure_class === "string" &&
      FAILURE_CLASSES.includes(
        error.farmos_failure_class as FarmOsE5AppBusinessFailureClass,
      )) {
      throw error;
    }
    throw Object.assign(new Error("connection_identity_unavailable"), {
      farmos_failure_class:
        "STAGING_PROVIDER_CONNECTION_IDENTITY_MATERIALIZATION_REQUIRED",
    });
  }
}

export function assertFarmOsE5PasswordOnlyCredential(value: string): string {
  if (value.length < 1 || value.length > 8 * 1024 ||
    /[\u0000\r\n]/u.test(value) ||
    /^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) {
    throw Object.assign(new Error("password_only_credential_required"), {
      farmos_failure_class: "CREDENTIAL_SHAPE_CONTRACT_MISMATCH",
    });
  }
  return value;
}

export function createFarmOsE5AppBusinessPgConfig(
  identity: FarmOsE5AppBusinessConnectionIdentity,
  password: string,
) {
  return {
    host: identity.host,
    port: identity.port,
    user: identity.username,
    database: identity.database,
    password: assertFarmOsE5PasswordOnlyCredential(password),
    // Exact node-postgres mapping for the approved libpq sslmode=require
    // contract. TLS remains mandatory; CA verification is not verify-full.
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    application_name: "farmos-core-staging-e5-readonly-verify",
  } as const;
}

function safeSqlstate(error: unknown): string | null {
  if (!isRecord(error) || typeof error.code !== "string") return null;
  return /^[0-9A-Z]{5}$/u.test(error.code) ? error.code : null;
}

export function classifyFarmOsE5AppBusinessFailure(
  error: unknown,
  failedPhase: FarmOsE5AppBusinessFailurePhase,
): FarmOsE5AppBusinessSafeFailure {
  const explicit = isRecord(error) &&
    typeof error.farmos_failure_class === "string"
    ? error.farmos_failure_class : null;
  const sqlstate = safeSqlstate(error);
  const code = isRecord(error) && typeof error.code === "string"
    ? error.code : "";
  const message = error instanceof Error ? error.message : "";
  let errorClass: FarmOsE5AppBusinessFailureClass = "UNKNOWN";

  if (explicit !== null && FAILURE_CLASSES.includes(
    explicit as FarmOsE5AppBusinessFailureClass,
  )) {
    errorClass = explicit as FarmOsE5AppBusinessFailureClass;
  } else if (failedPhase === "KEYCHAIN_READ") {
    errorClass = "KEYCHAIN_READ_ERROR";
  } else if (sqlstate === "28P01") {
    errorClass = "PASSWORD_AUTHENTICATION_FAILED";
  } else if (sqlstate === "28000") {
    errorClass = "SESSION_POOLER_USERNAME_CONSTRUCTION_ERROR";
  } else if (sqlstate === "3D000") {
    errorClass = "WRONG_DATABASE_NAME";
  } else if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT",
    "EHOSTUNREACH", "ENETUNREACH"].includes(code)) {
    errorClass = "NETWORK_OR_DNS_FAILURE";
  } else if (/certificate|ssl|tls/u.test(message.toLowerCase())) {
    errorClass = "SSL_CONFIGURATION_ERROR";
  }

  return {
    process_exit_code: 1,
    sqlstate,
    error_class: errorClass,
    failed_phase: failedPhase,
    connection_mode: FARM_OS_E5_APP_BUSINESS_CONNECTION_MODE,
  };
}
