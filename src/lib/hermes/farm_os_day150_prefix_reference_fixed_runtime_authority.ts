import { createHash } from "node:crypto";

/** Source-only, proposal-only authority. It intentionally performs no filesystem mutation. */
export const FARM_OS_DAY150_FIXED_RUNTIME_SCHEMA = "farmos.day150-prefix-reference-fixed-runtime.v1" as const;
export const FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT = "/Library/Application Support/FarmOS/qualification/day150-prefix-reference/fixed-runtime/v1" as const;
export const FARM_OS_DAY150_FIXED_RUNTIME_NODE_RELATIVE_PATH = "runtime/bin/node" as const;
export const FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE = Object.freeze({
  file_name: "node-v24.18.0-darwin-arm64.tar.gz", version: "v24.18.0", platform: "darwin-arm64",
  sha256: "sha256:e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1",
  release_list_sha256: "sha256:3927bab574a00ca0560c9583fe19655ba19603a1c5851414e4325d34ac50e469",
  detached_signature: "GOOD_RSA_SHA256", signer_fingerprint: "C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C",
  release_keys_commit: "b28073028e6d6855cfb53bf7fa0137599c01f967",
  signer_key_sha256: "sha256:84b1ca614406f341cb86e72920f5a64687a13ab67ab84038bcf2abba97898a84",
  active_pubring_sha256: "sha256:8e6f89521a0694e445f42decd022f48369c634f1b5bcb5975135b69c88629ae8",
  verification_method: "ISOLATED_RFC4880_RSA_SHA256_DETACHED_SIGNATURE",
} as const);
export const FARM_OS_DAY150_FIXED_RUNTIME_NODE = Object.freeze({ relative_path: FARM_OS_DAY150_FIXED_RUNTIME_NODE_RELATIVE_PATH,
  sha256: "sha256:ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a", size_bytes: 120965360,
  version: "v24.18.0", architecture: "arm64", format: "MACH_O_THIN", team_identifier: "HX7739G8FX",
  hardened_runtime: true, lc_rpath_count: 0,
  apple_dependencies: Object.freeze(["/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation", "/System/Library/Frameworks/Security.framework/Versions/A/Security", "/usr/lib/libc++.1.dylib", "/usr/lib/libSystem.B.dylib"]),
} as const);
export const FARM_OS_DAY150_FIXED_RUNTIME_ENV_ALLOWLIST = Object.freeze(["LANG", "LC_ALL", "PATH", "TMPDIR",
  "FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT", "FARM_OS_DAY150_SEALED_BUNDLE_DIGEST",
  "FARM_OS_DAY150_BUILD_INPUT_DIGEST", "FARM_OS_DAY150_FIXED_RUNTIME_PROFILE_DIGEST"] as const);
export const FARM_OS_DAY150_FIXED_RUNTIME_ENV_REJECTIONS = Object.freeze(["HOME", "NODE_OPTIONS", "NODE_PATH",
  "TSX_TSCONFIG_PATH", "NODE_REPL_EXTERNAL_MODULE", "NODE_EXTRA_CA_CERTS", "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH", "BASH_ENV", "ENV", "CDPATH", "NYC_CONFIG", "C8_CONFIG"] as const);
export const FARM_OS_DAY150_FIXED_RUNTIME_INSTALLATION_STEPS = Object.freeze([
  "VALIDATE_FINAL_TARGET_AND_ANCESTOR_PREEXISTENCE", "FAIL_CLOSED_ON_UNEXPLAINED_STATE",
  "CREATE_ADMINISTRATOR_OWNED_PRIVATE_STAGING", "COPY_AUTHENTICATED_NODE_RUNTIME_CLOSURE_NOFOLLOW",
  "COPY_EXACT_SEALED_BUNDLE_NOFOLLOW", "REOPEN_AND_HASH_ALL_INSTALLED_FILES",
  "SET_ROOT_WHEEL_OWNERSHIP", "SET_EXACT_MODES", "REMOVE_AND_REJECT_WRITABLE_ACLS",
  "REJECT_AUTHORITY_BEARING_SYMLINKS_AND_UNEXPECTED_HARDLINKS",
  "VALIDATE_INSTALLED_DYNAMIC_DEPENDENCY_CLOSURE", "VALIDATE_NODE_VERSION_ARCHITECTURE_AND_SIGNING",
  "VALIDATE_ALL_ANCESTORS_UID501_NON_WRITABLE", "DERIVE_TRUSTED_INSTALLED_RUNTIME_PROFILE_READBACK",
  "RUN_UID501_ADVERSARIAL_NON_MUTABILITY_CHECKS", "CLASSIFY_INSTALLED_ADOPTABLE_ONLY_AFTER_ALL_PASS",
] as const);
export const FARM_OS_DAY150_FIXED_RUNTIME_COMPENSATION = "REMOVE_ONLY_NEWLY_CREATED_FIXED_RUNTIME_V1_BEFORE_ADOPTION_AFTER_TRUSTED_READBACK;NEVER_DELETE_PREEXISTING_OR_UNVERIFIED_PATHS" as const;
export const FARM_OS_DAY150_FIXED_RUNTIME_SAME_UID_ADVERSARIAL_CHECKS = Object.freeze([
  "OVERWRITE_NODE", "UNLINK_NODE", "RENAME_NODE", "REPLACE_NODE_THROUGH_PARENT",
  "REPLACE_RUNTIME_COMPONENT", "OVERWRITE_SEALED_BUNDLE", "RENAME_SEALED_BUNDLE",
  "REPLACE_BUNDLE_THROUGH_ANCESTOR", "MODIFY_AUTHORITY_MANIFEST", "GAIN_WRITE_THROUGH_ACL",
  "REDIRECT_THROUGH_SYMLINK", "INFLUENCE_VIA_HOMEBREW_MUTATION",
] as const);

type RecordValue = Record<string, unknown>;
const isRecord = (v: unknown): v is RecordValue => typeof v === "object" && v !== null && !Array.isArray(v);
const sha = (v: unknown) => typeof v === "string" && /^sha256:[0-9a-f]{64}$/.test(v);
const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("NON_FINITE"); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!isRecord(value)) throw new Error("NON_JSON");
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
};
export const deriveFarmOsDay150FixedRuntimeProfileDigest = (bundle: { bundle_digest: `sha256:${string}`; source_digest: `sha256:${string}`; build_configuration_digest: `sha256:${string}` }): `sha256:${string}` => {
  if (!sha(bundle.bundle_digest) || !sha(bundle.source_digest) || !sha(bundle.build_configuration_digest)) throw new Error("INVALID_BUNDLE_BINDING");
  return `sha256:${createHash("sha256").update(`farmos.day150-prefix-reference-fixed-runtime-profile.v1\n${canonical({ schema_version: FARM_OS_DAY150_FIXED_RUNTIME_SCHEMA, archive: FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE, node: FARM_OS_DAY150_FIXED_RUNTIME_NODE, bundle })}`, "utf8").digest("hex")}`;
};
export const FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_BUNDLE_CANDIDATE_V1 = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_SEALED_EXECUTION_BUNDLE_V1",
  relative_path: "application/day150-prefix-reference-sealed-execution-bundle-v1.mjs",
  bundle_digest: "sha256:a6bcd13f4b6adb6b3acb7eb115828d4d8d4dd35417b1f580039c8701670aa3ab",
  source_digest: "sha256:7263b7e9faf1910b05b92e7542f9f6559ce2bca1195a3fe14f9e66a8c283b8f7",
  build_configuration_digest:
    "sha256:65f224b110bf65285cad11b860e90bd277c51ed24160984ae64f6bc624a16ce9",
  byte_length: 897877,
  runtime_tsx: false,
  runtime_node_modules: false,
  exact_verified_bytes_required: true,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_FIXED_RUNTIME_PROFILE_DIGEST_V1 =
  deriveFarmOsDay150FixedRuntimeProfileDigest(FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_BUNDLE_CANDIDATE_V1);
export function validateFarmOsDay150FixedRuntimeArchiveProvenance(value: unknown): boolean {
  return isRecord(value) && value.file_name === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.file_name && value.sha256 === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.sha256 && value.release_list_sha256 === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.release_list_sha256 && value.detached_signature === "GOOD_RSA_SHA256" && value.signer_fingerprint === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.signer_fingerprint && value.release_keys_commit === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.release_keys_commit && value.pubring_sha256 === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.active_pubring_sha256 && value.signer_key_sha256 === FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE.signer_key_sha256;
}
export function validateFarmOsDay150FixedRuntimeObservedReadback(value: unknown): boolean {
  return isRecord(value) && value.relative_path === FARM_OS_DAY150_FIXED_RUNTIME_NODE.relative_path && value.sha256 === FARM_OS_DAY150_FIXED_RUNTIME_NODE.sha256 && value.size_bytes === FARM_OS_DAY150_FIXED_RUNTIME_NODE.size_bytes && value.version === "v24.18.0" && value.architecture === "arm64" && value.format === "MACH_O_THIN" && value.team_identifier === "HX7739G8FX" && value.hardened_runtime === true && value.lc_rpath_count === 0 && canonical(value.apple_dependencies) === canonical(FARM_OS_DAY150_FIXED_RUNTIME_NODE.apple_dependencies) && value.fixed_dylibs === 0;
}
type TreeEntry = { path: string; kind: "directory" | "file"; owner: "root:wheel"; mode: "0755" | "0555" | "0444"; symlink: false; hardlink: false; writable_acl: false; uid501_writable_ancestor: false };
export function validateFarmOsDay150FixedRuntimeInstalledTree(value: unknown): boolean {
  if (!isRecord(value) || value.install_root !== FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT ||
    value.target_preexistence !== "ABSENT" || value.ancestor_chain_uid501_writable !== false ||
    !Array.isArray(value.entries)) return false;
  const entries = value.entries as TreeEntry[]; const required: Record<string,
    Readonly<{ mode: TreeEntry["mode"]; kind: TreeEntry["kind"] }>> = {
    "": { mode: "0755", kind: "directory" }, runtime: { mode: "0755", kind: "directory" },
    "runtime/bin": { mode: "0755", kind: "directory" },
    "runtime/bin/node": { mode: "0555", kind: "file" },
    application: { mode: "0755", kind: "directory" },
    "application/day150-prefix-reference-sealed-execution-bundle-v1.mjs":
      { mode: "0444", kind: "file" }, authority: { mode: "0755", kind: "directory" },
    "authority/fixed-runtime-profile-v1.json": { mode: "0444", kind: "file" },
  };
  return entries.length === 8 && entries.every(e => isRecord(e) && typeof e.path === "string" &&
    required[e.path]?.mode === e.mode && required[e.path]?.kind === e.kind &&
    e.owner === "root:wheel" && e.symlink === false && e.hardlink === false &&
    e.writable_acl === false && e.uid501_writable_ancestor === false) &&
    Object.keys(required).every(path => entries.some(e => e.path === path));
}
export function validateFarmOsDay150FixedRuntimeEnvironment(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.environment)) return false;
  const env = value.environment; return Object.keys(env).every(k => FARM_OS_DAY150_FIXED_RUNTIME_ENV_ALLOWLIST.includes(k as never) && typeof env[k] === "string") && FARM_OS_DAY150_FIXED_RUNTIME_ENV_REJECTIONS.every(k => !(k in env)) && env.PATH === `${FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT}/runtime/bin:/usr/bin:/bin` && value.runtime_path === `${FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT}/${FARM_OS_DAY150_FIXED_RUNTIME_NODE_RELATIVE_PATH}` && value.homebrew_fallback === false && value.codex_fallback === false;
}
export function validateFarmOsDay150FixedRuntimeInstallationOrCompensation(value: unknown): boolean {
  if (!isRecord(value) || value.authorized_by_human !== true || value.proposal_only !== false || value.acquisition_temp_trusted !== false) return false;
  if (value.outcome === "INSTALLED") return canonical(value.completed_steps) === canonical(FARM_OS_DAY150_FIXED_RUNTIME_INSTALLATION_STEPS) && value.trusted_readback === true && value.adoption_completed === false && sha(value.audit_receipt_digest);
  return value.outcome === "COMPENSATED_PRE_ADOPTION" && value.compensation === FARM_OS_DAY150_FIXED_RUNTIME_COMPENSATION && value.adoption_completed === false && value.removed_only_created_paths === true && canonical(value.created_paths) === canonical([FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT]) && value.unexpected_preexisting_state === false && sha(value.audit_receipt_digest);
}
export function validateFarmOsDay150FixedRuntimeV7Binding(value: unknown): boolean {
  return isRecord(value) && value.profile_digest ===
    FARM_OS_DAY150_PREFIX_REFERENCE_FIXED_RUNTIME_PROFILE_DIGEST_V1 && value.bundle_digest ===
    FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_BUNDLE_CANDIDATE_V1.bundle_digest &&
    value.authorization_revision === 7 && typeof value.human_approval_reference === "string" &&
    value.human_approval_reference.length > 0;
}
export function validateFarmOsDay150FixedRuntimeSameUidQualification(value: unknown): boolean {
  return isRecord(value) && value.execution_uid === 501 && Array.isArray(value.checks) &&
    canonical(value.checks) === canonical(FARM_OS_DAY150_FIXED_RUNTIME_SAME_UID_ADVERSARIAL_CHECKS) &&
    Array.isArray(value.results) && value.results.length ===
      FARM_OS_DAY150_FIXED_RUNTIME_SAME_UID_ADVERSARIAL_CHECKS.length &&
    value.results.every((result) => isRecord(result) && result.mutation_succeeded === false &&
      result.execution_identity_changed === false);
}
