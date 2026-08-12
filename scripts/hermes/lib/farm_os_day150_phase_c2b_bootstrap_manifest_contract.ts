import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY =
  "farmos.day150-c2b-bootstrap-manifest.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-manifest.v1:manifest-body" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_PURPOSE =
  "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATE =
  "BOOTSTRAP_MANIFEST_SOURCE_CONTRACT" as const;

const UNRESOLVED_IMPLEMENTATION_PROFILE = Object.freeze({
  status: "UNRESOLVED_IMPLEMENTATION_PROFILE",
} as const);

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY = deepFreeze({
  schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY_REVISION,
  source_state: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATE,
  purpose: FARM_OS_DAY150_C2B_BOOTSTRAP_PURPOSE,
  target: {
    source: {
      c2b_source_commit: "1e2d7087810aaf19ada9d3d6e48ab7151c019a88",
      c2a_source_commit: "19889a78ae3a7d751c51f9b412f63c78bfc83a78",
    },
    image: {
      repository: "docker.io/library/postgres",
      repository_digest:
        "sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317",
      platform: { os: "linux", architecture: "arm64", variant: "v8" },
      expected_postgresql_major: 17,
      runtime_version_verified: false,
    },
    registries: {
      case_registry: {
        authority: "farmos.production-target-execution-postgres-qualification-case-registry.v1",
        digest: "sha256:16fc72adccf770f05b8946866b5bd45af30f02d8bd885f79c1b56708c9e327a2",
      },
      fault_registry: {
        authority: "farmos.production-target-execution-postgres-qualification-fault-registry.v1",
        digest: "sha256:e8f6883fde355d2c6b0e25ba4ce46e8572194e4b1edb02171a098a8021082636",
      },
    },
    migration: {
      migration_id: "202608110001_production_target_execution_durability",
      apply_sha256: "sha256:f97eca5134c44c5a144523ea19b44b679051f3592f9fd28dbf38c441be7b8131",
      verify_sha256: "sha256:f5294d29b6407d6ed789e2c229c394e62be09b0d31407065d99ca620e2473036",
    },
  },
  policy: {
    storage_rollback: {
      classification: "FULL_STORAGE_ROLLBACK_OUT_OF_THREAT_MODEL",
      out_of_scope: [
        "ROOT_OR_KERNEL_COMPROMISE",
        "PHYSICAL_DISK_ROLLBACK",
        "APFS_SNAPSHOT_RESTORE",
        "FULL_VOLUME_RESTORE",
        "ROOT_OWNED_WHOLE_LEDGER_TREE_REPLACEMENT",
      ],
      fail_closed_in_scope: [
        "NORMAL_PROCESS_REPLAY",
        "USER_LEVEL_OVERWRITE",
        "STALE_OR_PARTIAL_RECORD_INJECTION",
        "MISSING_EXTRA_OR_CORRUPT_RECORDS",
        "PARTIAL_PUBLICATION",
        "PROCESS_OR_OS_CRASH",
        "DOCUMENTED_LOCAL_APFS_POWER_LOSS",
        "ACK_AMBIGUITY",
      ],
    },
    ledger_root: {
      path: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1",
      filesystem: "LOCAL_APFS_ONLY",
      writer_principal_semantic: "farmos_c2b_bootstrap",
      writer_principal_login: "PROHIBITED",
      root_mode: "0700",
      record_and_temp_mode: "0600",
      outside_repository: true,
      outside_tmp: true,
      outside_docker_storage_and_volumes: true,
      network_filesystem: "PROHIBITED",
      symlink: "PROHIBITED",
      same_device: "REQUIRED",
    },
    actor: {
      authentication: "FRESH_INTERACTIVE_MACOS_AUTHENTICATION_REQUIRED",
      stable_identity_semantic: "MACOS_LOCAL_DIRECTORY_SERVICE_GENERATED_UID",
      persisted_identity: "DOMAIN_SEPARATED_ACTOR_REFERENCE_DIGEST_ONLY",
      rejected_identity_sources: [
        "SHELL_OR_DISPLAY_USERNAME",
        "SUDO_USER",
        "CLIENT_ACTOR_ID",
        "CLIENT_ROLE",
        "ADMIN_FLAG",
        "CALLER_PROVIDED_AUTHORITY_FIELDS",
      ],
      raw_generated_uid_persistence: "PROHIBITED",
    },
    actor_capability_and_challenge: {
      capability_generation: "IMMUTABLE_MONOTONIC_GENERATION",
      fresh_capability_per_human_approval: true,
      capability_binds: [
        "ACTOR_REFERENCE_DIGEST",
        "AUTHENTICATION_MECHANISM_REVISION",
        "FRESH_CHALLENGE_DIGEST",
        "TARGET_MANIFEST_DIGEST",
        "CAPABILITY_SCOPE",
        "TRUSTED_ISSUED_AT",
        "REVOCATION_LINEAGE",
        "CAPABILITY_RECORD_DIGEST",
      ],
      replaced_or_revoked_generation_reuse: "PROHIBITED",
      challenge_terminal_states: [
        "CONSUMED_APPROVAL_SUCCESS",
        "CONSUMED_APPROVAL_FAILURE",
        "ABANDONED",
        "OUTCOME_UNKNOWN",
      ],
      challenge_authentication_event_and_approval_replay: "PROHIBITED",
    },
    writer_and_ui: {
      unprivileged_ui: "NO_LEDGER_WRITE",
      codex: "PROPOSAL_REQUEST_AND_SANITIZED_READ_ONLY_STATUS_ONLY",
      hermes: "PROPOSAL_REQUEST_AND_SANITIZED_READ_ONLY_STATUS_ONLY",
      farming_app: "NO_LEDGER_AUTHORITY",
      docker_container: "NO_LEDGER_AUTHORITY",
      privileged_writer: "NARROW_DETERMINISTIC_AUTHORITY_WRITER_ONLY",
    },
    writer_identity: {
      launch_identity: "MANIFEST_BOUND",
      executable_path: "FIXED_ABSOLUTE_PATH",
      owner_and_group: "ROOT_OWNED_WITH_MANIFEST_BOUND_DEDICATED_WRITER_POLICY",
      executable_mode: "0555",
      parent_chain: "ROOT_OWNED_AND_NON_WRITABLE",
      working_directory: "/",
      umask: "0077",
      environment: "EMPTY_OR_EXACT_MINIMAL_MANIFEST_BOUND_ALLOWLIST",
      caller_path_lookup: "PROHIBITED",
      dynamic_plugin_loading: "PROHIBITED",
    },
    publication: {
      path_resolution: "TRUSTED_ROOT_DIRFD_RELATIVE_ONLY",
      symlink: "PROHIBITED",
      same_device: "REQUIRED",
      create: "EXCLUSIVE_CREATE",
      publication: "ATOMIC_SAME_DIRECTORY_NO_REPLACE",
      canonical_bytes: "BOUNDED",
      file_fsync: "REQUIRED",
      full_durability_primitive: "REQUIRED",
      parent_directory_fsync: "REQUIRED",
      final_reopen_and_readback: "REQUIRED",
      final_records: "IMMUTABLE_APPEND_ONLY",
      unsupported_primitive: "FAIL_CLOSED",
      ordinary_overwrite_rename: "PROHIBITED",
      copy_fallback: "PROHIBITED",
      link_fallback: "PROHIBITED",
    },
    orphan_recovery: {
      automatic_delete: "PROHIBITED",
      temp_content_reuse: "PROHIBITED",
      classifications: [
        "CONFIRMED_ALREADY_PUBLISHED",
        "CONFIRMED_UNPUBLISHED_ORPHAN",
        "OBSERVATION_UNKNOWN",
      ],
      confirmed_unpublished_action:
        "NO_REPLACE_IMMUTABLE_QUARANTINE_THEN_AUTHENTICATED_RECOVERY_EVENT",
      observation_unknown_action: "LEDGER_QUARANTINE",
    },
    global_generation_cas: {
      serialization: "SINGLE_GLOBAL_IMMUTABLE_GENERATION_CHAIN",
      loser_steps: [
        "DISCARD_PRECOMPUTED_CANDIDATE",
        "REOPEN_TRUSTED_ROOT",
        "REPLAY_GENESIS_TO_CURRENT",
        "RECALCULATE_AUTHORITY_STATE",
        "NO_AUTOMATIC_MUTATION_RETRY",
        "RETURN_CONFLICT_OR_REJECTION",
      ],
      exact_existing_transition_result: "IDEMPOTENT_OBSERVATION",
      automatic_n_plus_2_publication: "PROHIBITED",
    },
    clock: {
      genesis: "HUMAN_CONFIRMED_OS_UTC",
      persistence: "DURABLE_MONOTONIC_FLOOR",
      rollback: "CLOCK_ROLLBACK_DETECTED",
      forward_poison_recovery: "APPEND_ONLY_CLOCK_EPOCH_SUPERSESSION",
      suspect_authorization: "QUARANTINE",
      automatic_epoch_migration: "PROHIBITED",
      recovery_authentication:
        "FRESH_INTERACTIVE_OS_AUTHENTICATION_INDEPENDENT_OF_POISONED_CLOCK_AND_TTL",
      recovery_human_review: [
        "PREVIOUS_EPOCH",
        "POISONED_FLOOR",
        "PROPOSED_CORRECTED_TIME",
        "SUSPECT_INTERVAL",
        "AFFECTED_RECORDS",
      ],
      epoch_supersession_binds: [
        "PREVIOUS_EPOCH",
        "POISON_REASON",
        "LAST_TRUSTED_PRE_SUSPECT_POINT",
        "SUSPECT_INTERVAL",
        "CORRECTED_GENESIS_TIMESTAMP",
        "RECOVERY_ACTOR_AND_CAPABILITY",
        "AFFECTED_RECORD_POLICY",
      ],
    },
    authorization_timing: {
      authorization_start_ttl_seconds: 900,
      authorization_start_semantics: "ISSUED_AT_TO_DURABLE_ATTEMPT_STARTED",
      authorization_renewable: false,
      authorization_extension: "PROHIBITED",
      attempt_to_spawn_deadline_seconds: 30,
      attempt_to_spawn_semantics:
        "DURABLE_ATTEMPT_STARTED_TO_FIRST_FIXED_DOCKER_MUTATING_INVOCATION",
      deadline_is_separate_from_authorization_ttl: true,
    },
    execution_fence: {
      lifetime: "SAME_PROCESS",
      use: "ONE_SHOT",
      serializable: false,
      reconstructable_after_restart: false,
      export_to_environment: "PROHIBITED",
      export_to_ipc: "PROHIBITED",
      export_to_client: "PROHIBITED",
      export_to_ai: "PROHIBITED",
      binds: [
        "AUTHORIZATION_DIGEST",
        "ATTEMPT_IDENTITY",
        "NONCE",
        "EXACT_DOCKER_PLAN_DIGEST",
        "CLOCK_EPOCH",
        "ATTEMPT_TO_SPAWN_30_SECOND_DEADLINE",
      ],
      second_spawn: "PROHIBITED",
      consume_before_docker_invocation: true,
      live_unused_deadline_expiry:
        "CONSUMED_FAILURE_SPAWN_DEADLINE_EXPIRED_BEFORE_INVOCATION",
      process_crash_or_spawn_ack_ambiguity: "OUTCOME_UNKNOWN",
      second_fence: "PROHIBITED",
      automatic_retry: "PROHIBITED",
      automatic_cleanup_after_unknown_outcome: "PROHIBITED",
    },
    integrity: {
      mechanism: "DOMAIN_SEPARATED_SHA256",
      sufficiency: "HASH_ONLY_WITH_PROTECTED_WRITER_OR_FAIL_CLOSED",
      signature: "NOT_REQUIRED_BY_R1_SOURCE_CONTRACT",
    },
    privacy: {
      persisted_allowlist: [
        "VERSIONED_AUTHORITY_IDS_AND_REVISIONS",
        "DIGESTS",
        "GENERATION",
        "BOUNDED_STATE_AND_STATUS",
        "TIMESTAMPS",
        "SCOPE",
        "REVOCATION_REFERENCES",
        "WRITER_POLICY_IDENTITY",
        "NON_SECRET_TARGET_IDENTITY",
      ],
      prohibited: [
        "PASSWORD",
        "DB_CREDENTIAL",
        "REGISTRY_CREDENTIAL",
        "SESSION_TOKEN",
        "BEARER_TOKEN",
        "RAW_AUTHENTICATION_BLOB",
        "BIOMETRIC_DATA",
        "RAW_USERNAME",
        "RAW_GENERATED_UID",
        "FULL_ENVIRONMENT",
        "FULL_ARGV",
        "DSN",
        "PRODUCTION_CONNECTION_STRING",
        "RAW_ERROR_PAYLOAD",
      ],
    },
  },
  implementation_profile: {
    writer_binary_sha256: UNRESOLVED_IMPLEMENTATION_PROFILE,
    writer_built_artifact: UNRESOLVED_IMPLEMENTATION_PROFILE,
    numeric_uid_gid: UNRESOLVED_IMPLEMENTATION_PROFILE,
    apfs_device_identity: UNRESOLVED_IMPLEMENTATION_PROFILE,
    filesystem_qualification: UNRESOLVED_IMPLEMENTATION_PROFILE,
    authorization_right_identifier: UNRESOLVED_IMPLEMENTATION_PROFILE,
    security_framework_api: UNRESOLVED_IMPLEMENTATION_PROFILE,
    open_directory_api: UNRESOLVED_IMPLEMENTATION_PROFILE,
    launch_configuration_digest: UNRESOLVED_IMPLEMENTATION_PROFILE,
    installed_executable_path: UNRESOLVED_IMPLEMENTATION_PROFILE,
    writer_availability: UNRESOLVED_IMPLEMENTATION_PROFILE,
    ledger_root_existence: UNRESOLVED_IMPLEMENTATION_PROFILE,
    actor_capability: UNRESOLVED_IMPLEMENTATION_PROFILE,
    clock_genesis: UNRESOLVED_IMPLEMENTATION_PROFILE,
    manifest_adoption_record: UNRESOLVED_IMPLEMENTATION_PROFILE,
  },
  runtime_claims: {
    manifest_instance_created: false,
    bootstrap_authority_active: false,
    actor_authority_established: false,
    trusted_clock_established: false,
    ledger_created: false,
    b2_authorization_issued: false,
    b2_executed: false,
  },
} as const);

export type FarmOsDay150C2bBootstrapManifestBody =
  typeof FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY;
export type FarmOsDay150C2bBootstrapManifest = Readonly<{
  manifest_body: FarmOsDay150C2bBootstrapManifestBody;
  manifest_digest: `sha256:${string}`;
}>;

export type FarmOsDay150C2bBootstrapManifestParseResult =
  | Readonly<{ accepted: true; manifest: FarmOsDay150C2bBootstrapManifest }>
  | Readonly<{
    accepted: false;
    reason: "MANIFEST_SCHEMA_INVALID" | "MANIFEST_BODY_MISMATCH" |
      "MANIFEST_DIGEST_INVALID" | "MANIFEST_DIGEST_MISMATCH";
  }>;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;

type DataEntries = Readonly<{
  kind: "ARRAY" | "OBJECT";
  entries: readonly (readonly [string, unknown])[];
}>;

function ordinaryDataEntries(value: unknown): DataEntries | null {
  if (typeof value !== "object" || value === null) return null;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return null;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) return null;
      const length = lengthDescriptor.value as number;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== length + 1 ||
        !ownKeys.includes("length")) return null;
      const entries: Array<readonly [string, unknown]> = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!ownKeys.includes(key)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
        entries.push([key, descriptor.value] as const);
      }
      return Object.freeze({ kind: "ARRAY", entries: Object.freeze(entries) });
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    const entries: Array<readonly [string, unknown]> = [];
    for (const key of ownKeys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
      entries.push([key, descriptor.value] as const);
    }
    return Object.freeze({ kind: "OBJECT", entries: Object.freeze(entries) });
  } catch {
    return null;
  }
}

function exactTreeEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  const actualData = ordinaryDataEntries(actual);
  const expectedData = ordinaryDataEntries(expected);
  if (actualData === null || expectedData === null || actualData.kind !== expectedData.kind ||
    actualData.entries.length !== expectedData.entries.length) return false;
  const compareKeys = (left: readonly [string, unknown], right: readonly [string, unknown]) =>
    left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0;
  const actualEntries = [...actualData.entries].sort(compareKeys);
  const expectedEntries = [...expectedData.entries].sort(compareKeys);
  return expectedEntries.every(([key, child], index) => key === actualEntries[index]?.[0] &&
    exactTreeEqual(actualEntries[index]?.[1], child));
}

export function isFarmOsDay150C2bBootstrapManifestBody(
  value: unknown,
): value is FarmOsDay150C2bBootstrapManifestBody {
  return exactTreeEqual(value, FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY);
}

export function canonicalizeFarmOsDay150C2bBootstrapManifestBody(
  body: FarmOsDay150C2bBootstrapManifestBody,
): string {
  if (!isFarmOsDay150C2bBootstrapManifestBody(body)) {
    throw new TypeError("FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY_INVALID");
  }
  return canonicalizeFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  );
}

export function computeFarmOsDay150C2bBootstrapManifestDigest(
  body: FarmOsDay150C2bBootstrapManifestBody,
): `sha256:${string}` {
  if (!isFarmOsDay150C2bBootstrapManifestBody(body)) {
    throw new TypeError("FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY_INVALID");
  }
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_DIGEST_DOMAIN,
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  );
}

export function farmOsDay150C2bBootstrapManifestBodiesEqual(
  left: unknown,
  right: unknown,
): boolean {
  return isFarmOsDay150C2bBootstrapManifestBody(left) &&
    isFarmOsDay150C2bBootstrapManifestBody(right);
}

export const FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE = deepFreeze({
  manifest_body: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  manifest_digest: computeFarmOsDay150C2bBootstrapManifestDigest(
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_BODY,
  ),
} as const satisfies FarmOsDay150C2bBootstrapManifest);

export function parseFarmOsDay150C2bBootstrapManifest(
  value: unknown,
): FarmOsDay150C2bBootstrapManifestParseResult {
  const envelopeData = ordinaryDataEntries(value);
  if (envelopeData?.kind !== "OBJECT") {
    return Object.freeze({ accepted: false, reason: "MANIFEST_SCHEMA_INVALID" });
  }
  const envelopeEntries = new Map(envelopeData.entries);
  if (envelopeEntries.size !== 2 || !envelopeEntries.has("manifest_body") ||
    !envelopeEntries.has("manifest_digest")) {
    return Object.freeze({ accepted: false, reason: "MANIFEST_SCHEMA_INVALID" });
  }
  const manifestBody = envelopeEntries.get("manifest_body");
  const manifestDigest = envelopeEntries.get("manifest_digest");
  if (!isFarmOsDay150C2bBootstrapManifestBody(manifestBody)) {
    return Object.freeze({ accepted: false, reason: "MANIFEST_BODY_MISMATCH" });
  }
  if (typeof manifestDigest !== "string" || !SHA256.test(manifestDigest)) {
    return Object.freeze({ accepted: false, reason: "MANIFEST_DIGEST_INVALID" });
  }
  if (manifestDigest !== FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest) {
    return Object.freeze({ accepted: false, reason: "MANIFEST_DIGEST_MISMATCH" });
  }
  return Object.freeze({
    accepted: true,
    manifest: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
  });
}
