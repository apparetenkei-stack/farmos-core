import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS,
  type FarmOsProductionIdentityQueryV2Section,
} from "./farm_os_production_identity_query_v2_contract";

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH =
  "scripts/sql/farm_os_production_identity_readonly_v5.sql" as const;
export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 =
  "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52" as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE = Object.freeze({
  authority_id: "farmos.production-target-identity-query.v5",
  version: "v5",
  purpose: "production_target_identity_collection",
  result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  supersedes: "farmos.production-target-identity-query.v4",
  adoption_status: "NOT_ADOPTED",
  review_status: "CANDIDATE_FOR_APPROVAL",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
  automatic_latest_selection: false,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} as const);

export type FarmOsProductionIdentityQueryV5SectionPlanEntry = Readonly<{
  ordinal: number;
  section_id: FarmOsProductionIdentityQueryV2Section;
  execution: "ALWAYS" | "ONLY_WHEN_H1_PRESENT";
  statement_sql: string;
}>;

export type FarmOsProductionIdentityQueryV5ArtifactVerification =
  | Readonly<{
    status: "VERIFIED";
    artifact_path: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH;
    sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
    raw_bytes: Uint8Array;
    section_plan: readonly FarmOsProductionIdentityQueryV5SectionPlanEntry[];
  }>
  | Readonly<{
    status: "BLOCKED";
    reason: "ARTIFACT_MISSING" | "ARTIFACT_SHA_MISMATCH" | "SECTION_PLAN_INVALID";
    artifact_path: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH;
    actual_sha256: `sha256:${string}` | null;
  }>;

function sha256Bytes(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function buildSectionPlan(
  sql: string,
): readonly FarmOsProductionIdentityQueryV5SectionPlanEntry[] | null {
  if (sql.includes("\r") || !sql.endsWith("\n")) return null;
  const marker = /^-- section:([A-Z0-9_]+)$/gmu;
  const matches = [...sql.matchAll(marker)];
  if (matches.length !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS.length) return null;
  const entries: FarmOsProductionIdentityQueryV5SectionPlanEntry[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const section = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS[index]!;
    const match = matches[index]!;
    if (match[1] !== section || match.index === undefined) return null;
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? sql.length;
    const statement = sql.slice(start, end).trim();
    if (!/^(?:select|with)\b/iu.test(statement) || !statement.endsWith(";") ||
      statement.slice(0, -1).includes(";")) return null;
    if (section === "A_TRANSACTION_SERVER_GATE") {
      if (/\border\s+by\b/iu.test(statement) || /\b(?:from|with|union)\b/iu.test(statement) ||
        !/'server'::text\s+as\s+row_key/iu.test(statement)) return null;
    } else if ([
      "B_CLUSTER_IDENTITY_SOURCE",
      "D_OPERATOR_AUTHORITY",
      "H1_MIGRATION_HISTORY_EXISTENCE",
      "I_ACTIVITY_LOCK_AGGREGATES",
      "J_DATABASE_SIZE",
    ].includes(section)) {
      if (/order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu.test(statement)) return null;
    } else if (section === "C_SCHEMA_IDENTITY") {
      if (!/order\s+by\s+expected\.schema_name\s+collate\s+"C"\s*;$/iu.test(statement)) {
        return null;
      }
    } else if (section === "E_INSTALLATION_FARM_BINDING_AVAILABILITY") {
      if (!/order\s+by\s+expected\.binding_name\s+collate\s+"C"\s*;$/iu.test(statement)) {
        return null;
      }
    } else if (!/order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu.test(statement)) {
      return null;
    }
    entries.push(Object.freeze({
      ordinal: index + 1,
      section_id: section,
      execution: section === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"
        ? "ONLY_WHEN_H1_PRESENT" : "ALWAYS",
      statement_sql: statement,
    }));
  }
  return Object.freeze(entries);
}

export function verifyFarmOsProductionIdentityQueryV5ArtifactBytes(
  bytes: Uint8Array | null,
): FarmOsProductionIdentityQueryV5ArtifactVerification {
  if (bytes === null) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "ARTIFACT_MISSING",
      artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
      actual_sha256: null,
    });
  }
  const actual = sha256Bytes(bytes);
  if (actual !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "ARTIFACT_SHA_MISMATCH",
      artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
      actual_sha256: actual,
    });
  }
  const sectionPlan = buildSectionPlan(Buffer.from(bytes).toString("utf8"));
  if (sectionPlan === null) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "SECTION_PLAN_INVALID",
      artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
      actual_sha256: actual,
    });
  }
  return Object.freeze({
    status: "VERIFIED",
    artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
    sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    raw_bytes: bytes,
    section_plan: sectionPlan,
  });
}

const FIXED_ARTIFACT_URL = new URL(
  `../../../${FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH}`,
  import.meta.url,
);

export function loadFarmOsProductionIdentityQueryV5Artifact():
  FarmOsProductionIdentityQueryV5ArtifactVerification {
  try {
    return verifyFarmOsProductionIdentityQueryV5ArtifactBytes(
      readFileSync(fileURLToPath(FIXED_ARTIFACT_URL)),
    );
  } catch {
    return verifyFarmOsProductionIdentityQueryV5ArtifactBytes(null);
  }
}
