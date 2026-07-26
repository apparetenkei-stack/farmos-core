import {
  hasExactFarmOsKeys,
  isCanonicalFarmOsIso,
  isFarmOsDigest,
  isFarmOsRecord,
} from "./farm_os_approved_proposal_contract";

export const FARM_OS_CORE_DB_MANIFEST_VERSION =
  "farmos.core-db-provisioning-manifest.v1" as const;

export type FarmOsCoreMigrationEntry = {
  migration_id: string;
  sequence: number;
  description: string;
  checksum: string;
  apply_script: string;
  verification_script: string;
  created_at: string;
};
export type FarmOsCoreMigrationManifest = {
  manifest_version: typeof FARM_OS_CORE_DB_MANIFEST_VERSION;
  startup_auto_apply: false;
  production_apply_authority: "authenticated_human_operator";
  history_table: "core_schema.migration_history";
  migrations: readonly FarmOsCoreMigrationEntry[];
};
export type FarmOsStoredMigration = {
  migration_id: string;
  sequence: number;
  checksum: string;
};
export type FarmOsMigrationPlanResult =
  | { result: "ready"; pending: readonly FarmOsCoreMigrationEntry[] }
  | { result: "already_applied"; pending: readonly [] }
  | {
      result: "rejected";
      rejection_code:
        | "MANIFEST_INVALID"
        | "CHECKSUM_MISMATCH"
        | "SEQUENCE_REGRESSION";
    };

const MANIFEST_KEYS = [
  "manifest_version",
  "startup_auto_apply",
  "production_apply_authority",
  "history_table",
  "migrations",
] as const;
const ENTRY_KEYS = [
  "migration_id",
  "sequence",
  "description",
  "checksum",
  "apply_script",
  "verification_script",
  "created_at",
] as const;

export function parseFarmOsCoreMigrationManifest(
  value: unknown,
): FarmOsCoreMigrationManifest | null {
  if (
    !isFarmOsRecord(value) ||
    !hasExactFarmOsKeys(value, MANIFEST_KEYS) ||
    value.manifest_version !== FARM_OS_CORE_DB_MANIFEST_VERSION ||
    value.startup_auto_apply !== false ||
    value.production_apply_authority !== "authenticated_human_operator" ||
    value.history_table !== "core_schema.migration_history" ||
    !Array.isArray(value.migrations)
  ) return null;
  let previous = 0;
  const ids = new Set<string>();
  for (const entry of value.migrations) {
    if (
      !isFarmOsRecord(entry) ||
      !hasExactFarmOsKeys(entry, ENTRY_KEYS) ||
      typeof entry.migration_id !== "string" ||
      !/^\d{12}_[a-z0-9_]+$/u.test(entry.migration_id) ||
      !Number.isSafeInteger(entry.sequence) ||
      (entry.sequence as number) <= previous ||
      typeof entry.description !== "string" ||
      entry.description.length < 1 ||
      entry.description.length > 500 ||
      !isFarmOsDigest(entry.checksum) ||
      typeof entry.apply_script !== "string" ||
      !/^db\/migrations\/[a-z0-9_]+\.sql$/u.test(entry.apply_script) ||
      typeof entry.verification_script !== "string" ||
      !/^db\/migrations\/[a-z0-9_]+\.verify\.sql$/u.test(entry.verification_script) ||
      !isCanonicalFarmOsIso(entry.created_at) ||
      ids.has(entry.migration_id)
    ) return null;
    ids.add(entry.migration_id);
    previous = entry.sequence as number;
  }
  return value as unknown as FarmOsCoreMigrationManifest;
}

export function planFarmOsCoreMigrations(input: {
  manifest: unknown;
  stored: readonly FarmOsStoredMigration[];
}): FarmOsMigrationPlanResult {
  const manifest = parseFarmOsCoreMigrationManifest(input.manifest);
  if (!manifest) return { result: "rejected", rejection_code: "MANIFEST_INVALID" };
  const byId = new Map(manifest.migrations.map((entry) => [entry.migration_id, entry]));
  let maxStoredSequence = 0;
  for (const stored of input.stored) {
    const entry = byId.get(stored.migration_id);
    if (entry && entry.checksum !== stored.checksum) {
      return { result: "rejected", rejection_code: "CHECKSUM_MISMATCH" };
    }
    maxStoredSequence = Math.max(maxStoredSequence, stored.sequence);
  }
  const pending = manifest.migrations.filter(
    (entry) => !input.stored.some((stored) => stored.migration_id === entry.migration_id),
  );
  if (pending.some((entry) => entry.sequence < maxStoredSequence)) {
    return { result: "rejected", rejection_code: "SEQUENCE_REGRESSION" };
  }
  return pending.length === 0
    ? { result: "already_applied", pending: [] }
    : { result: "ready", pending };
}
