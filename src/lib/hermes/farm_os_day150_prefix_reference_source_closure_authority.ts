import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_ROOTS_V1 = Object.freeze([
  "scripts/hermes/run_farm_os_day150_prefix_reference_catalog_bootstrap.mjs",
  "scripts/hermes/run_farm_os_day150_prefix_reference_catalog.ts",
  "scripts/hermes/run_farm_os_day150_prefix_reference_cross_process_qualification.ts",
  "scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts",
  "scripts/hermes/lib/farm_os_day150_prefix_reference_executor_contract.ts",
  "scripts/hermes/lib/farm_os_day150_prefix_reference_real_adapter.ts",
  "src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation.ts",
  "src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority.ts",
  "src/lib/hermes/farm_os_day150_prefix_reference_primitive_port.ts",
  "src/lib/hermes/farm_os_day150_prefix_reference_durable_store.ts",
  "src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt.ts",
  "src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority.ts",
  "src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts",
] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1 = Object.freeze([
  "db/provisioning/manifest.json",
  "scripts/sql/farm_os_production_identity_readonly_v5.sql",
  "db/migrations/202607260001_eligible_proposal_persistence.sql",
  "db/migrations/202607260001_eligible_proposal_persistence.verify.sql",
  "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
  "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
  "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
  "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
  "db/migrations/202608030001_daily_operational_projection_command_ledger.sql",
  "db/migrations/202608030001_daily_operational_projection_command_ledger.verify.sql",
  "db/migrations/202608070001_stable_changes_consumer_persistence.sql",
  "db/migrations/202608070001_stable_changes_consumer_persistence.verify.sql",
] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2 = Object.freeze([
  ...FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1,
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql",
] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1 = Object.freeze([
  "package.json",
  "pnpm-lock.yaml",
] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1 = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1",
  selected_config_path: "tsconfig.json",
  selection_mechanism: "EXPLICIT_SANITIZED_TSX_TSCONFIG_PATH_FROM_VERIFIED_RUNTIME_DESCRIPTOR",
} as const);

const STATIC_RUNTIME_SPECIFIER = /(?:\bimport\s+(?:[^"']*?\s+from\s+)?|\bexport\s+[^"']*?\s+from\s+|\bimport\s*\()(["'])([^"']+)\1/gmu;
const SOURCE_EXTENSIONS = Object.freeze([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);

const repositoryPath = (root: string, absolutePath: string): string =>
  relative(root, absolutePath).split(sep).join(posix.sep);

function assertRepositoryRelativePath(path: string): void {
  if (path.length === 0 || path.startsWith("/") || path.includes("\\") ||
    path.split("/").some((part) => part.length === 0 || part === "." || part === "..")) {
    throw new Error(`DAY150_RUNTIME_PATH_REJECTED:${path}`);
  }
}

function parseTsconfigBytes(path: string, bytes: Uint8Array): Readonly<Record<string, unknown>> {
  try {
    const source = Buffer.from(bytes).toString("utf8");
    let withoutComments = "";
    let inString = false;
    let escaped = false;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index]!;
      const next = source[index + 1];
      if (inString) {
        withoutComments += character;
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') {
        inString = true; withoutComments += character;
      } else if (character === "/" && next === "/") {
        while (index + 1 < source.length && source[index + 1] !== "\n") index += 1;
      } else if (character === "/" && next === "*") {
        index += 2;
        while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
          index += 1;
        }
        index += 1;
      } else {
        withoutComments += character;
      }
    }
    withoutComments = withoutComments.replace(/,\s*([}\]])/gmu, "$1");
    const parsed: unknown = JSON.parse(withoutComments);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Readonly<Record<string, unknown>>;
  } catch {
    throw new Error(`DAY150_TSX_CONFIG_PARSE_REJECTED:${path}`);
  }
}

function localTsconfigExtendsPath(repositoryRoot: string, importer: string,
  specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return null;
  const candidate = resolve(repositoryRoot, dirname(importer), specifier);
  const resolved = existsSync(candidate) ? candidate : existsSync(`${candidate}.json`)
    ? `${candidate}.json` : null;
  if (resolved === null) throw new Error(`DAY150_TSX_CONFIG_EXTENDS_MISSING:${importer}:${specifier}`);
  const relativePath = repositoryPath(repositoryRoot, resolved);
  assertRepositoryRelativePath(relativePath);
  return relativePath;
}

export function deriveFarmOsDay150PrefixReferenceTsxConfigClosure(
  repositoryRoot = process.cwd(),
  selectedConfigPath: string =
    FARM_OS_DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1.selected_config_path,
): readonly string[] {
  assertRepositoryRelativePath(selectedConfigPath);
  const pending = [selectedConfigPath];
  const reached = new Set<string>();
  while (pending.length > 0) {
    const path = pending.shift()!;
    if (reached.has(path)) continue;
    const absolute = resolve(repositoryRoot, path);
    if (!existsSync(absolute)) throw new Error(`DAY150_TSX_CONFIG_MISSING:${path}`);
    const parsed = parseTsconfigBytes(path, readFileSync(absolute));
    reached.add(path);
    const rawExtends = parsed.extends;
    const extensions = typeof rawExtends === "string" ? [rawExtends] :
      Array.isArray(rawExtends) && rawExtends.every((entry) => typeof entry === "string")
        ? rawExtends as string[] : rawExtends === undefined ? [] :
          (() => { throw new Error(`DAY150_TSX_CONFIG_EXTENDS_REJECTED:${path}`); })();
    for (const specifier of extensions) {
      const dependency = localTsconfigExtendsPath(repositoryRoot, path, specifier);
      if (dependency !== null && !reached.has(dependency)) pending.push(dependency);
    }
    pending.sort();
  }
  return Object.freeze([...reached].sort());
}

function resolveRepositoryLocalImport(root: string, importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(root, dirname(importer), specifier);
  const candidates = extname(base) ? [base] : [
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => resolve(base, `index${extension}`)),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`DAY150_RUNTIME_IMPORT_UNRESOLVED:${importer}:${specifier}`);
  const path = repositoryPath(root, resolved);
  if (path.startsWith("../") || path === "..") {
    throw new Error(`DAY150_RUNTIME_IMPORT_OUTSIDE_REPOSITORY:${importer}:${specifier}`);
  }
  return path;
}

export function deriveFarmOsDay150PrefixReferenceReachableRuntimeSources(
  repositoryRoot = process.cwd(),
  roots: readonly string[] = FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_ROOTS_V1,
): readonly string[] {
  const pending = [...new Set(roots)].sort();
  const reached = new Set<string>();
  while (pending.length > 0) {
    const path = pending.shift()!;
    if (reached.has(path)) continue;
    const absolute = resolve(repositoryRoot, path);
    if (!existsSync(absolute)) throw new Error(`DAY150_RUNTIME_ROOT_MISSING:${path}`);
    reached.add(path);
    const source = readFileSync(absolute, "utf8");
    for (const match of source.matchAll(STATIC_RUNTIME_SPECIFIER)) {
      const dependency = resolveRepositoryLocalImport(repositoryRoot, path, match[2]!);
      if (dependency !== null && !reached.has(dependency)) pending.push(dependency);
    }
    pending.sort();
  }
  return Object.freeze([...reached].sort());
}

export function deriveFarmOsDay150PrefixReferenceExecutableSourceClosure(
  repositoryRoot = process.cwd(),
): readonly string[] {
  return Object.freeze([...new Set([
    ...deriveFarmOsDay150PrefixReferenceReachableRuntimeSources(repositoryRoot),
    ...FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1,
    ...FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1,
    ...deriveFarmOsDay150PrefixReferenceTsxConfigClosure(repositoryRoot),
  ])].sort());
}

export function deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2(
  repositoryRoot = process.cwd(),
): readonly string[] {
  return Object.freeze([...new Set([
    ...deriveFarmOsDay150PrefixReferenceReachableRuntimeSources(repositoryRoot),
    ...FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
    ...FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1,
    ...deriveFarmOsDay150PrefixReferenceTsxConfigClosure(repositoryRoot),
  ])].sort());
}

export type FarmOsDay150PrefixReferenceRuntimeClosureDescriptor = Readonly<{
  authorization_id: string;
  authorization_revision: number;
  executable_source_closure_authority_id?:
    "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1" |
    "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2";
}>;

export function deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor(
  descriptor: FarmOsDay150PrefixReferenceRuntimeClosureDescriptor,
  repositoryRoot = process.cwd(),
): readonly string[] {
  if (descriptor.authorization_id !==
    `DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V${descriptor.authorization_revision}`) {
    throw new Error("DAY150_RUNTIME_CLOSURE_DESCRIPTOR_IDENTITY_REJECTED");
  }
  if (descriptor.authorization_revision >= 12 &&
    descriptor.executable_source_closure_authority_id ===
      "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2") {
    return deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2(repositoryRoot);
  }
  if (descriptor.authorization_revision < 12 &&
    descriptor.executable_source_closure_authority_id ===
      "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1") {
    return deriveFarmOsDay150PrefixReferenceExecutableSourceClosure(repositoryRoot);
  }
  throw new Error("DAY150_RUNTIME_CLOSURE_DESCRIPTOR_REVISION_MISMATCH");
}

export function verifyFarmOsDay150PrefixReferenceExecutableSourceClosure(input: Readonly<{
  declared_files: readonly string[];
  repository_root?: string;
  roots?: readonly string[];
  runtime_data_dependencies?: readonly string[];
}>): Readonly<{ status: "EXACT" | "MISMATCH"; reachable_runtime_sources: readonly string[];
  missing: readonly string[]; unexpected: readonly string[] }> {
  const repositoryRoot = input.repository_root ?? process.cwd();
  const reachable = deriveFarmOsDay150PrefixReferenceReachableRuntimeSources(
    repositoryRoot, input.roots ?? FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_ROOTS_V1);
  const required = [...new Set([...reachable,
    ...(input.runtime_data_dependencies ??
      FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1),
    ...FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1,
    ...deriveFarmOsDay150PrefixReferenceTsxConfigClosure(repositoryRoot)])].sort();
  const declared = [...new Set(input.declared_files)].sort();
  const missing = required.filter((path) => !declared.includes(path));
  const unexpected = declared.filter((path) => !required.includes(path));
  return Object.freeze({ status: missing.length === 0 && unexpected.length === 0
    ? "EXACT" : "MISMATCH", reachable_runtime_sources: reachable,
  missing: Object.freeze(missing), unexpected: Object.freeze(unexpected) });
}

export function deriveFarmOsDay150PrefixReferenceClosureDigest(input: Readonly<{
  files: readonly string[];
  read_source?: (path: string) => Uint8Array | string;
}>): `sha256:${string}` {
  const readSource = input.read_source ?? ((path: string) => readFileSync(path));
  const rows = [...input.files].sort().map((path) => Object.freeze({ path,
    sha256: createHash("sha256").update(readSource(path)).digest("hex") }));
  return `sha256:${createHash("sha256").update(
    `farmos.day150-prefix-reference-executable-source-closure.v1\n${JSON.stringify(rows)}`,
  ).digest("hex")}`;
}

type FarmOsDay150VerifiedRuntimeSnapshotRow = Readonly<{
  path: string;
  sha256: string;
  byte_length: number;
}>;

export type FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot = Readonly<{
  authority_id: "DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_SNAPSHOT_V1";
  repository_root: string;
  snapshot_root: string;
  executable_source_digest: `sha256:${string}`;
  selected_tsconfig_path: string;
  rows: readonly FarmOsDay150VerifiedRuntimeSnapshotRow[];
}>;

function readRegularFileNoFollow(path: string): Buffer {
  const descriptor = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile()) throw new Error("DAY150_VERIFIED_RUNTIME_SOURCE_NOT_REGULAR");
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs || bytes.byteLength !== after.size) {
      throw new Error("DAY150_VERIFIED_RUNTIME_SOURCE_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function snapshotRowsDigest(rows: readonly FarmOsDay150VerifiedRuntimeSnapshotRow[]):
  `sha256:${string}` {
  return `sha256:${createHash("sha256").update(
    `farmos.day150-prefix-reference-executable-source-closure.v1\n${JSON.stringify(
      rows.map(({ path, sha256 }) => ({ path, sha256 })))}`,
  ).digest("hex")}`;
}

function listSnapshotFiles(root: string, relativeRoot = ""): string[] {
  const directory = resolve(root, relativeRoot);
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = relativeRoot.length === 0 ? entry.name : `${relativeRoot}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`DAY150_VERIFIED_RUNTIME_SYMLINK_REJECTED:${relativePath}`);
    if (entry.isDirectory()) files.push(...listSnapshotFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
    else throw new Error(`DAY150_VERIFIED_RUNTIME_SPECIAL_FILE_REJECTED:${relativePath}`);
  }
  return files.sort();
}

export function verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(
  snapshot: FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot,
): boolean {
  try {
    if (realpathSync(snapshot.snapshot_root) !== snapshot.snapshot_root ||
      (lstatSync(snapshot.snapshot_root).mode & 0o077) !== 0) return false;
    const expectedPaths = snapshot.rows.map((row) => row.path).sort();
    const actualPaths = listSnapshotFiles(snapshot.snapshot_root);
    if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)) return false;
    const readback = snapshot.rows.map((row) => {
      assertRepositoryRelativePath(row.path);
      const absolute = resolve(snapshot.snapshot_root, row.path);
      if (!absolute.startsWith(`${snapshot.snapshot_root}${sep}`) || lstatSync(absolute).isSymbolicLink()) {
        throw new Error("DAY150_VERIFIED_RUNTIME_PATH_SUBSTITUTION_REJECTED");
      }
      const bytes = readRegularFileNoFollow(absolute);
      return Object.freeze({ path: row.path,
        sha256: createHash("sha256").update(bytes).digest("hex"), byte_length: bytes.byteLength });
    });
    return JSON.stringify(readback) === JSON.stringify(snapshot.rows) &&
      snapshotRowsDigest(readback) === snapshot.executable_source_digest;
  } catch {
    return false;
  }
}

export function createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(input: Readonly<{
  repository_root: string;
  files: readonly string[];
  expected_executable_source_digest: `sha256:${string}`;
  selected_tsconfig_path?: string;
  after_source_read?: (path: string) => void;
}>): FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot {
  const repositoryRoot = realpathSync(input.repository_root);
  const selectedTsconfigPath = input.selected_tsconfig_path ??
    FARM_OS_DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1.selected_config_path;
  if (!input.files.includes(selectedTsconfigPath)) {
    throw new Error("DAY150_VERIFIED_RUNTIME_TSCONFIG_NOT_BOUND");
  }
  const snapshotRoot = mkdtempSync(join(repositoryRoot, ".day150-verified-runtime-"));
  chmodSync(snapshotRoot, 0o700);
  try {
    const rows = [...input.files].sort().map((path) => {
      assertRepositoryRelativePath(path);
      const source = resolve(repositoryRoot, path);
      if (!source.startsWith(`${repositoryRoot}${sep}`) || lstatSync(source).isSymbolicLink()) {
        throw new Error(`DAY150_VERIFIED_RUNTIME_SOURCE_PATH_REJECTED:${path}`);
      }
      const bytes = readRegularFileNoFollow(source);
      input.after_source_read?.(path);
      const target = resolve(snapshotRoot, path);
      if (!target.startsWith(`${snapshotRoot}${sep}`)) {
        throw new Error(`DAY150_VERIFIED_RUNTIME_TARGET_PATH_REJECTED:${path}`);
      }
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, bytes, { flag: "wx", mode: 0o400 });
      return Object.freeze({ path, sha256: createHash("sha256").update(bytes).digest("hex"),
        byte_length: bytes.byteLength });
    });
    const digest = snapshotRowsDigest(rows);
    if (digest !== input.expected_executable_source_digest) {
      throw new Error("DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST_MISMATCH");
    }
    for (const path of new Set(rows.map((row) => dirname(resolve(snapshotRoot, row.path))))) {
      chmodSync(path, 0o500);
    }
    chmodSync(snapshotRoot, 0o500);
    const snapshot = Object.freeze({
      authority_id: "DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_SNAPSHOT_V1" as const,
      repository_root: repositoryRoot,
      snapshot_root: snapshotRoot,
      executable_source_digest: digest,
      selected_tsconfig_path: selectedTsconfigPath,
      rows: Object.freeze(rows),
    });
    if (!verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(snapshot)) {
      throw new Error("DAY150_VERIFIED_RUNTIME_READBACK_REJECTED");
    }
    return snapshot;
  } catch (error) {
    chmodSync(snapshotRoot, 0o700);
    rmSync(snapshotRoot, { recursive: true, force: false });
    throw error;
  }
}

export function destroyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(
  snapshot: FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot,
): void {
  if (!snapshot.snapshot_root.startsWith(`${snapshot.repository_root}${sep}.day150-verified-runtime-`)) {
    throw new Error("DAY150_VERIFIED_RUNTIME_CLEANUP_PATH_REJECTED");
  }
  const makeDirectoriesRemovable = (directory: string): void => {
    chmodSync(directory, 0o700);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        makeDirectoriesRemovable(resolve(directory, entry.name));
      }
    }
  };
  makeDirectoriesRemovable(snapshot.snapshot_root);
  rmSync(snapshot.snapshot_root, { recursive: true, force: false });
}

export function createFarmOsDay150PrefixReferenceSanitizedTsxEnvironment(input: Readonly<{
  ambient_environment?: NodeJS.ProcessEnv;
  snapshot: FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot;
}>): Readonly<Record<string, string>> {
  if (!verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(input.snapshot)) {
    throw new Error("DAY150_VERIFIED_RUNTIME_ENVIRONMENT_REJECTED");
  }
  void input.ambient_environment;
  return Object.freeze({ TSX_TSCONFIG_PATH: resolve(input.snapshot.snapshot_root,
    input.snapshot.selected_tsconfig_path) });
}

export const FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_CHILD_ENVIRONMENT_KEYS =
  Object.freeze([
    "FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT",
    "FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY",
    "FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT",
    "FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST",
    "TMPDIR",
    "TSX_TSCONFIG_PATH",
    "__CF_USER_TEXT_ENCODING",
  ] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT =
  "/private/tmp" as const;

export function resolveFarmOsDay150PrefixReferenceArtifactRepositoryRoot(input: Readonly<{
  module_repository_root: string;
  process_cwd?: string;
  environment?: NodeJS.ProcessEnv;
}>): Readonly<{ repository_root: string; verified_runtime_module_root: string;
  root_authority: "PRESERVED_APPROVAL_REPOSITORY_ROOT" | "DIRECT_MODULE_REPOSITORY_ROOT" }> {
  const environment = input.environment ?? process.env;
  const moduleRepositoryRoot = realpathSync(resolve(input.module_repository_root));
  const verifiedRuntimeRoot = environment.FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT;
  const approvalRepositoryRoot = environment.FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT;
  if (verifiedRuntimeRoot === undefined && approvalRepositoryRoot === undefined) {
    return Object.freeze({ repository_root: moduleRepositoryRoot,
      verified_runtime_module_root: moduleRepositoryRoot,
      root_authority: "DIRECT_MODULE_REPOSITORY_ROOT" });
  }
  if (verifiedRuntimeRoot === undefined || approvalRepositoryRoot === undefined) {
    throw new Error("DAY150_ARTIFACT_REPOSITORY_ROOT_ENVIRONMENT_REJECTED");
  }
  const normalizedVerifiedRuntimeRoot = realpathSync(resolve(verifiedRuntimeRoot));
  const normalizedApprovalRepositoryRoot = realpathSync(resolve(approvalRepositoryRoot));
  if (normalizedVerifiedRuntimeRoot !== moduleRepositoryRoot ||
    normalizedVerifiedRuntimeRoot !== realpathSync(resolve(input.process_cwd ?? process.cwd())) ||
    resolve(approvalRepositoryRoot) !== normalizedApprovalRepositoryRoot) {
    throw new Error("DAY150_ARTIFACT_REPOSITORY_ROOT_NORMALIZATION_REJECTED");
  }
  return Object.freeze({ repository_root: normalizedApprovalRepositoryRoot,
    verified_runtime_module_root: moduleRepositoryRoot,
    root_authority: "PRESERVED_APPROVAL_REPOSITORY_ROOT" });
}

const farmOsDay150PrefixReferenceMacOsUserTextEncoding = (): string =>
  `0x${process.getuid!().toString(16).toUpperCase()}:0x0:0x0`;

export function validateFarmOsDay150PrefixReferenceVerifiedRuntimeChildEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  const keys = Object.keys(environment).sort();
  return keys.length ===
      FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_CHILD_ENVIRONMENT_KEYS.length &&
    keys.every((key, index) =>
      key === FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_CHILD_ENVIRONMENT_KEYS[index]) &&
    FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_CHILD_ENVIRONMENT_KEYS.every((key) =>
      typeof environment[key] === "string" && environment[key]!.length > 0) &&
    /^[A-Za-z0-9_-]{43}$/u.test(
      environment.FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY ?? "") &&
    environment.TMPDIR === FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT &&
    environment.__CF_USER_TEXT_ENCODING === farmOsDay150PrefixReferenceMacOsUserTextEncoding();
}

export async function importFarmOsDay150PrefixReferenceVerifiedRuntimeModule<T>(input: Readonly<{
  snapshot: FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot;
  repository_relative_module_path: string;
}>): Promise<T> {
  assertRepositoryRelativePath(input.repository_relative_module_path);
  const row = input.snapshot.rows.find((candidate) =>
    candidate.path === input.repository_relative_module_path);
  if (!row || !verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(input.snapshot)) {
    throw new Error("DAY150_VERIFIED_RUNTIME_IMPORT_REJECTED");
  }
  return import(pathToFileURL(resolve(input.snapshot.snapshot_root,
    input.repository_relative_module_path)).href) as Promise<T>;
}

export async function runFarmOsDay150PrefixReferenceVerifiedRuntimeChild(input: Readonly<{
  repository_root: string;
  files: readonly string[];
  expected_executable_source_digest: `sha256:${string}`;
  entry_path: string;
  invocation_continuation_capability: string;
  arguments?: readonly string[];
  ambient_environment?: NodeJS.ProcessEnv;
  timeout_milliseconds?: number;
  after_snapshot?: (snapshot: FarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot) => void;
}>): Promise<Readonly<{ exit_code: number; stdout: string; stderr: string;
  load_target: string; tsx_tsconfig_path: string; source_digest: `sha256:${string}` }>> {
  assertRepositoryRelativePath(input.entry_path);
  const snapshot = createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot({
    repository_root: input.repository_root,
    files: input.files,
    expected_executable_source_digest: input.expected_executable_source_digest,
  });
  try {
    input.after_snapshot?.(snapshot);
    if (!verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(snapshot)) {
      throw new Error("DAY150_VERIFIED_RUNTIME_PREEXECUTION_READBACK_REJECTED");
    }
    const loadTarget = resolve(snapshot.snapshot_root, input.entry_path);
    if (!snapshot.rows.some((row) => row.path === input.entry_path)) {
      throw new Error("DAY150_VERIFIED_RUNTIME_ENTRY_NOT_BOUND");
    }
    const sanitizedTsxEnvironment = createFarmOsDay150PrefixReferenceSanitizedTsxEnvironment({
      ambient_environment: input.ambient_environment,
      snapshot,
    });
    const tsxTsconfigPath = sanitizedTsxEnvironment.TSX_TSCONFIG_PATH;
    if (tsxTsconfigPath === undefined) {
      throw new Error("DAY150_VERIFIED_RUNTIME_TSCONFIG_ENVIRONMENT_REJECTED");
    }
    const environment: Readonly<Record<string, string>> = Object.freeze({
      TSX_TSCONFIG_PATH: tsxTsconfigPath,
      FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT: snapshot.snapshot_root,
      FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST: snapshot.executable_source_digest,
      FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT: snapshot.repository_root,
      FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY:
        input.invocation_continuation_capability,
      TMPDIR: FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
      __CF_USER_TEXT_ENCODING: farmOsDay150PrefixReferenceMacOsUserTextEncoding(),
    });
    if (!validateFarmOsDay150PrefixReferenceVerifiedRuntimeChildEnvironment(environment)) {
      throw new Error("DAY150_VERIFIED_RUNTIME_CHILD_ENVIRONMENT_REJECTED");
    }
    const result = await new Promise<{ exit_code: number; stdout: string; stderr: string }>(
      (settle, reject) => {
        const child = spawn(process.execPath,
          ["--import", "tsx", loadTarget, ...(input.arguments ?? [])], {
            cwd: snapshot.snapshot_root,
            env: environment as NodeJS.ProcessEnv,
            stdio: ["ignore", "pipe", "pipe"],
          });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
        child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("DAY150_VERIFIED_RUNTIME_CHILD_TIMEOUT"));
        }, input.timeout_milliseconds ?? 70_000);
        child.once("error", (error) => { clearTimeout(timeout); reject(error); });
        child.once("close", (code) => {
          clearTimeout(timeout);
          settle({ exit_code: code ?? 1, stdout, stderr });
        });
      });
    return Object.freeze({ ...result, load_target: loadTarget,
      tsx_tsconfig_path: tsxTsconfigPath, source_digest: snapshot.executable_source_digest });
  } finally {
    destroyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(snapshot);
  }
}
