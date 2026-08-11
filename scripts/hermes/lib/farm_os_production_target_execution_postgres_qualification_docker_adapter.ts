import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  deriveFarmOsPteC2bOwnedResources,
  parseFarmOsPteC2bImageAuthority,
  type FarmOsPteC2bImageAuthority,
  type FarmOsPteC2bOwnedResources,
} from "./farm_os_production_target_execution_postgres_qualification_contract";
import type { FarmOsPteC2bQualificationAdapter } from
  "./farm_os_production_target_execution_postgres_qualification_executor";
import {
  FARM_OS_PTE_C2B_MIGRATION_OWNER,
  type FarmOsPteC2bFixtureCredential,
} from "./farm_os_production_target_execution_postgres_qualification_fixture";

const execFileAsync = promisify(execFile);
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const CONTAINER_ID = /^[a-f0-9]{64}$/u;
const PATH_VALUE = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin";
const DOCKER_SOCKET = "unix:///var/run/docker.sock";

export type FarmOsPteC2bDockerCommand = Readonly<{
  argv: readonly string[];
  environment: Readonly<Record<string, string>>;
  timeout_ms: number;
  output_limit_bytes: number;
}>;
export type FarmOsPteC2bDockerResult = Readonly<{
  exit_code: number;
  projection: FarmOsPteC2bDockerProjection | null;
  created_identity: string | null;
  failure: "NONE" | "NOT_FOUND" | "TIMEOUT" | "FAILED";
}>;
export type FarmOsPteC2bDockerProjection =
  | Readonly<{ kind: "IMAGE"; id: `sha256:${string}`; repository_digest: `sha256:${string}`;
    architecture: "amd64" | "arm64"; os: "linux" }>
  | Readonly<{ kind: "CONTAINER"; id: string; name: string; ownership_label_value: string;
    image_id: `sha256:${string}`; state_status: string; running: boolean;
    host_ip: "127.0.0.1"; host_port: number }>
  | Readonly<{ kind: "NETWORK"; id: string; name: string; ownership_label_value: string;
    internal: true }>
  | Readonly<{ kind: "VOLUME"; name: string; ownership_label_value: string }>;
export interface FarmOsPteC2bDockerCommandTransport {
  execute(command: FarmOsPteC2bDockerCommand): Promise<FarmOsPteC2bDockerResult>;
}

const baseEnvironment = (): Readonly<Record<string, string>> => Object.freeze({ PATH: PATH_VALUE });
const command = (operation: readonly string[], environment = baseEnvironment(),
  timeout_ms = 30_000): FarmOsPteC2bDockerCommand => Object.freeze({
    argv: Object.freeze(["--host", DOCKER_SOCKET, ...operation]),
    environment: Object.freeze({ ...environment }),
    timeout_ms,
    output_limit_bytes: 1_048_576,
  });

export class FarmOsPteC2bNodeDockerTransport implements FarmOsPteC2bDockerCommandTransport {
  async execute(input: FarmOsPteC2bDockerCommand): Promise<FarmOsPteC2bDockerResult> {
    if (!validateFarmOsPteC2bDockerCommand(input)) {
      return Object.freeze({ exit_code: 126, projection: null,
        created_identity: null, failure: "FAILED" });
    }
    try {
      const result = await execFileAsync("docker", [...input.argv], {
        shell: false,
        env: { ...input.environment },
        encoding: "utf8",
        timeout: input.timeout_ms,
        maxBuffer: input.output_limit_bytes,
        windowsHide: true,
      });
      const safe = projectFarmOsPteC2bDockerCommandOutput(input, String(result.stdout));
      return safe === null
        ? Object.freeze({ exit_code: 1, projection: null,
          created_identity: null, failure: "FAILED" as const })
        : Object.freeze({ exit_code: 0, ...safe, failure: "NONE" as const });
    } catch (error) {
      const value = error as Readonly<{ code?: unknown; killed?: unknown; stderr?: unknown }>;
      const stderr = typeof value.stderr === "string" ? value.stderr.slice(0, 512) : "";
      const failure = value.killed === true ? "TIMEOUT" as const :
        /no such (?:image|container|network|volume|object)/iu.test(stderr)
          ? "NOT_FOUND" as const : "FAILED" as const;
      return Object.freeze({ exit_code: typeof value.code === "number" ? value.code : 127,
        projection: null, created_identity: null, failure });
    }
  }
}

export const FARM_OS_PTE_C2B_DOCKER_OPERATION_ALLOWLIST = Object.freeze([
  "image inspect exact-repository-digest",
  "network create --internal exact-owned-network",
  "network inspect exact-owned-network",
  "network rm exact-owned-network",
  "volume create exact-owned-volume",
  "volume inspect exact-owned-volume",
  "volume rm exact-owned-volume",
  "run --pull=never exact-owned-container",
  "container inspect exact-owned-container",
  "container stop exact-owned-container-id",
  "container start exact-owned-container-id",
  "container kill --signal KILL exact-owned-container-id",
  "container rm exact-owned-container-id",
] as const);

export function buildFarmOsPteC2bDockerPlan(input: Readonly<{
  image: FarmOsPteC2bImageAuthority;
  resources: FarmOsPteC2bOwnedResources;
  credential: FarmOsPteC2bFixtureCredential;
}>): Readonly<{
  inspect_image: FarmOsPteC2bDockerCommand;
  create_network: FarmOsPteC2bDockerCommand;
  inspect_network: FarmOsPteC2bDockerCommand;
  create_volume: FarmOsPteC2bDockerCommand;
  inspect_volume: FarmOsPteC2bDockerCommand;
  run_container: FarmOsPteC2bDockerCommand;
}> | null {
  if (parseFarmOsPteC2bImageAuthority(input.image) === null ||
    deriveFarmOsPteC2bOwnedResources(input.resources.execution_nonce)?.container_name !==
      input.resources.container_name || !/^c2b_[a-f0-9]{64}$/u.test(input.credential.password)) {
    return null;
  }
  const env = Object.freeze({
    PATH: PATH_VALUE,
    POSTGRES_USER: FARM_OS_PTE_C2B_MIGRATION_OWNER,
    POSTGRES_PASSWORD: input.credential.password,
    POSTGRES_DB: input.credential.database,
  });
  return Object.freeze({
    inspect_image: command(["image", "inspect", input.image.runtime_reference]),
    create_network: command(["network", "create", "--internal", "--label",
      input.resources.ownership_label, input.resources.network_name]),
    inspect_network: command(["network", "inspect", input.resources.network_name]),
    create_volume: command(["volume", "create", "--label",
      input.resources.ownership_label, input.resources.volume_name]),
    inspect_volume: command(["volume", "inspect", input.resources.volume_name]),
    run_container: command([
      "run", "--detach", "--pull=never", "--restart=no",
      "--name", input.resources.container_name,
      "--label", input.resources.ownership_label,
      "--network", input.resources.network_name,
      "--publish", "127.0.0.1::5432",
      "--mount", `type=volume,src=${input.resources.volume_name},dst=/var/lib/postgresql/data`,
      "--memory", "1g", "--cpus", "2", "--pids-limit", "256",
      "--env", "POSTGRES_USER", "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB",
      input.image.runtime_reference,
    ], env, 60_000),
  });
}

function operation(input: FarmOsPteC2bDockerCommand): readonly string[] | null {
  return input.argv.length >= 3 && input.argv[0] === "--host" &&
      input.argv[1] === DOCKER_SOCKET && input.argv.every((part) => !part.includes("\0"))
    ? input.argv.slice(2) : null;
}

export function validateFarmOsPteC2bDockerCommand(input: FarmOsPteC2bDockerCommand): boolean {
  const op = operation(input);
  if (op === null || input.timeout_ms < 1 || input.timeout_ms > 60_000 ||
    input.output_limit_bytes !== 1_048_576 || input.environment.PATH !== PATH_VALUE) return false;
  const environmentKeys = Object.keys(input.environment).sort();
  const noSecrets = environmentKeys.join("\0") === "PATH";
  const exactRef = (value: string | undefined): boolean =>
    value !== undefined && /^docker\.io\/library\/postgres@sha256:[a-f0-9]{64}$/u.test(value);
  if (op[0] === "image" && op[1] === "inspect" && op.length === 3) {
    return noSecrets && exactRef(op[2]);
  }
  if (op[0] === "network" && op[1] === "create" && op[2] === "--internal" &&
    op[3] === "--label" && op.length === 6) return noSecrets && ownedNameAndLabel(op[5], op[4], "network");
  if (op[0] === "volume" && op[1] === "create" && op[2] === "--label" &&
    op.length === 5) return noSecrets && ownedNameAndLabel(op[4], op[3], "volume");
  if ((op[0] === "network" || op[0] === "volume") &&
    (op[1] === "inspect" || op[1] === "rm") && op.length === 3) {
    return noSecrets && ownedName(op[2], op[0]);
  }
  if (op[0] === "container" && op[1] === "inspect" && op.length === 3) {
    return noSecrets && (CONTAINER_ID.test(op[2] ?? "") || ownedName(op[2], "container"));
  }
  if (op[0] === "container" && ["stop", "start", "rm"].includes(op[1] ?? "") &&
    op.length === 3) return noSecrets && CONTAINER_ID.test(op[2] ?? "");
  if (op[0] === "container" && op[1] === "kill" && op[2] === "--signal" &&
    op[3] === "KILL" && op.length === 5) return noSecrets && CONTAINER_ID.test(op[4] ?? "");
  if (op.length !== 27 || op[0] !== "run" || op[1] !== "--detach" ||
    op[2] !== "--pull=never" || op[3] !== "--restart=no" || op[4] !== "--name" ||
    !ownedName(op[5], "container") || op[6] !== "--label" || op[8] !== "--network" ||
    !ownedName(op[9], "network") || op[10] !== "--publish" ||
    op[11] !== "127.0.0.1::5432" || op[12] !== "--mount" || op[14] !== "--memory" ||
    op[15] !== "1g" || op[16] !== "--cpus" || op[17] !== "2" ||
    op[18] !== "--pids-limit" || op[19] !== "256" || op[20] !== "--env" ||
    op[21] !== "POSTGRES_USER" || op[22] !== "--env" || op[23] !== "POSTGRES_PASSWORD" ||
    op[24] !== "--env" || op[25] !== "POSTGRES_DB" || !exactRef(op[26])) return false;
  const nonce = op[5]?.slice(op[5].lastIndexOf("-") + 1);
  return op[7] === `farmos.day150.phase-c2b=${nonce}` &&
    op[9] === `farmos-pte-c2b-net-${nonce}` &&
    op[13] === `type=volume,src=farmos-pte-c2b-data-${nonce},dst=/var/lib/postgresql/data` &&
    environmentKeys.join("\0") === "PATH\0POSTGRES_DB\0POSTGRES_PASSWORD\0POSTGRES_USER" &&
    input.environment.POSTGRES_USER === FARM_OS_PTE_C2B_MIGRATION_OWNER &&
    input.environment.POSTGRES_DB === "farmos_pte_c2b" &&
    /^c2b_[a-f0-9]{64}$/u.test(input.environment.POSTGRES_PASSWORD ?? "");
}

function ownedName(name: string | undefined, type: "container" | "network" | "volume"): boolean {
  if (name === undefined) return false;
  const suffix = "[a-f0-9]{24}";
  const expression = type === "container" ? `^farmos-pte-c2b-pg17-${suffix}$` :
    type === "network" ? `^farmos-pte-c2b-net-${suffix}$` :
      `^farmos-pte-c2b-data-${suffix}$`;
  return new RegExp(expression, "u").test(name);
}
function ownedNameAndLabel(name: string | undefined, label: string | undefined,
  type: "network" | "volume"): boolean {
  if (!ownedName(name, type) || label === undefined) return false;
  const nonce = name?.slice(name.lastIndexOf("-") + 1);
  return label === `farmos.day150.phase-c2b=${nonce}`;
}

type DockerInspect = Readonly<{
  Id?: unknown;
  Name?: unknown;
  Image?: unknown;
  RepoDigests?: unknown;
  Architecture?: unknown;
  Os?: unknown;
  Config?: Readonly<{ Labels?: unknown }>;
  Labels?: unknown;
  Internal?: unknown;
  State?: Readonly<{ Status?: unknown; Running?: unknown }>;
  NetworkSettings?: Readonly<{ Ports?: unknown }>;
}>;
function parseArray(stdout: string): readonly unknown[] | null {
  try {
    const value: unknown = JSON.parse(stdout);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function exactOwnershipLabel(labels: unknown): string | null {
  return typeof labels === "object" && labels !== null && !Array.isArray(labels) &&
      typeof (labels as Record<string, unknown>)["farmos.day150.phase-c2b"] === "string"
    ? (labels as Record<string, string>)["farmos.day150.phase-c2b"] ?? null : null;
}

function projectionContainsForbiddenValue(value: unknown): boolean {
  return /POSTGRES_PASSWORD|password=|postgres(?:ql)?:\/\/|c2b_[a-f0-9]{64}|service_role|Bearer|token[_-]/iu
    .test(JSON.stringify(value));
}

export function projectFarmOsPteC2bImageInspect(
  stdout: string,
  approved: FarmOsPteC2bImageAuthority,
): Extract<FarmOsPteC2bDockerProjection, { kind: "IMAGE" }> | null {
  const values = parseArray(stdout);
  const image = values?.length === 1 && typeof values[0] === "object" && values[0] !== null
    ? values[0] as DockerInspect : null;
  if (image === null || typeof image.Id !== "string" || !DIGEST.test(image.Id) ||
    !Array.isArray(image.RepoDigests) ||
    !image.RepoDigests.includes(`${FARM_OS_PTE_C2B_IMAGE_REPOSITORY}@${approved.repository_digest}`) ||
    !["amd64", "arm64"].includes(String(image.Architecture)) || image.Os !== "linux") {
    return null;
  }
  const projection = Object.freeze({ kind: "IMAGE" as const,
    id: image.Id as `sha256:${string}`, repository_digest: approved.repository_digest,
    architecture: image.Architecture as "amd64" | "arm64", os: "linux" as const });
  return projectionContainsForbiddenValue(projection) ? null : projection;
}

export function projectFarmOsPteC2bContainerInspect(
  stdout: string,
): Extract<FarmOsPteC2bDockerProjection, { kind: "CONTAINER" }> | null {
  const values = parseArray(stdout);
  const resource = values?.length === 1 && typeof values[0] === "object" && values[0] !== null
    ? values[0] as DockerInspect : null;
  const ports = resource?.NetworkSettings?.Ports;
  const bindings = typeof ports === "object" && ports !== null && !Array.isArray(ports)
    ? (ports as Record<string, unknown>)["5432/tcp"] : null;
  const binding = Array.isArray(bindings) && bindings.length === 1 &&
      typeof bindings[0] === "object" && bindings[0] !== null
    ? bindings[0] as Record<string, unknown> : null;
  const hostPort = Number(binding?.HostPort);
  const name = typeof resource?.Name === "string" ? resource.Name.replace(/^\//u, "") : "";
  const label = exactOwnershipLabel(resource?.Config?.Labels);
  if (resource === null || typeof resource.Id !== "string" || !CONTAINER_ID.test(resource.Id) ||
    !ownedName(name, "container") || label === null || typeof resource.Image !== "string" ||
    !DIGEST.test(resource.Image) || typeof resource.State?.Status !== "string" ||
    !["created", "running", "exited", "paused", "restarting", "dead"].includes(
      resource.State.Status) || typeof resource.State.Running !== "boolean" ||
    binding?.HostIp !== "127.0.0.1" || !Number.isSafeInteger(hostPort) || hostPort < 1 ||
    hostPort > 65_535) return null;
  const projection = Object.freeze({ kind: "CONTAINER" as const, id: resource.Id, name,
    ownership_label_value: label, image_id: resource.Image as `sha256:${string}`,
    state_status: resource.State.Status, running: resource.State.Running,
    host_ip: "127.0.0.1" as const, host_port: hostPort });
  return projectionContainsForbiddenValue(projection) ? null : projection;
}

export function projectFarmOsPteC2bNetworkInspect(
  stdout: string,
): Extract<FarmOsPteC2bDockerProjection, { kind: "NETWORK" }> | null {
  const values = parseArray(stdout);
  const resource = values?.length === 1 && typeof values[0] === "object" && values[0] !== null
    ? values[0] as DockerInspect : null;
  const label = exactOwnershipLabel(resource?.Labels);
  if (resource === null || typeof resource.Id !== "string" || !/^[a-f0-9]{64}$/u.test(resource.Id) ||
    typeof resource.Name !== "string" || !ownedName(resource.Name, "network") || label === null ||
    resource.Internal !== true) return null;
  const projection = Object.freeze({ kind: "NETWORK" as const, id: resource.Id,
    name: resource.Name, ownership_label_value: label, internal: true as const });
  return projectionContainsForbiddenValue(projection) ? null : projection;
}

export function projectFarmOsPteC2bVolumeInspect(
  stdout: string,
): Extract<FarmOsPteC2bDockerProjection, { kind: "VOLUME" }> | null {
  const values = parseArray(stdout);
  const resource = values?.length === 1 && typeof values[0] === "object" && values[0] !== null
    ? values[0] as DockerInspect : null;
  const label = exactOwnershipLabel(resource?.Labels);
  if (resource === null || typeof resource.Name !== "string" ||
    !ownedName(resource.Name, "volume") || label === null) return null;
  const projection = Object.freeze({ kind: "VOLUME" as const,
    name: resource.Name, ownership_label_value: label });
  return projectionContainsForbiddenValue(projection) ? null : projection;
}

function safeCreatedIdentity(value: string): string | null {
  const trimmed = value.trim();
  return !projectionContainsForbiddenValue(trimmed) &&
      (/^[a-f0-9]{64}$/u.test(trimmed) || ownedName(trimmed, "volume"))
    ? trimmed : null;
}

function projectFarmOsPteC2bDockerCommandOutput(input: FarmOsPteC2bDockerCommand,
  stdout: string): Readonly<{ projection: FarmOsPteC2bDockerProjection | null;
    created_identity: string | null }> | null {
  const op = operation(input);
  if (op === null) return null;
  if (op[0] === "image" && op[1] === "inspect") {
    const reference = op[2] ?? "";
    const digest = reference.slice(reference.indexOf("@") + 1);
    const approved = parseFarmOsPteC2bImageAuthority({ repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
      repository_digest: digest, runtime_reference: reference });
    const projection = approved === null ? null : projectFarmOsPteC2bImageInspect(stdout, approved);
    return projection === null ? null : Object.freeze({ projection, created_identity: null });
  }
  if (op[0] === "container" && op[1] === "inspect") {
    const projection = projectFarmOsPteC2bContainerInspect(stdout);
    return projection === null ? null : Object.freeze({ projection, created_identity: null });
  }
  if (op[0] === "network" && op[1] === "inspect") {
    const projection = projectFarmOsPteC2bNetworkInspect(stdout);
    return projection === null ? null : Object.freeze({ projection, created_identity: null });
  }
  if (op[0] === "volume" && op[1] === "inspect") {
    const projection = projectFarmOsPteC2bVolumeInspect(stdout);
    return projection === null ? null : Object.freeze({ projection, created_identity: null });
  }
  if (((op[0] === "network" || op[0] === "volume") && op[1] === "create") ||
    op[0] === "run") {
    const created = safeCreatedIdentity(stdout);
    return created === null ? null : Object.freeze({ projection: null, created_identity: created });
  }
  return projectionContainsForbiddenValue(stdout)
    ? null : Object.freeze({ projection: null, created_identity: null });
}

export type FarmOsPteC2bCleanupProofState = Readonly<{
  state: "NOT_CREATED" | "CREATED_OWNED" | "CREATED_UNOWNED_COLLISION" | "UNKNOWN";
  projection: FarmOsPteC2bDockerProjection | null;
}>;

function projectionProvesOwnership(input: Readonly<{
  projection: FarmOsPteC2bDockerProjection;
  resource_type: "container" | "network" | "volume";
  expected_name: string;
  expected_label: string;
}>): boolean {
  const nonce = input.expected_name.slice(input.expected_name.lastIndexOf("-") + 1);
  const expectedLabelValue = input.expected_label.slice(input.expected_label.indexOf("=") + 1);
  if (input.projection.kind === "IMAGE") return false;
  const typeExact = (input.resource_type === "container" && input.projection.kind === "CONTAINER") ||
    (input.resource_type === "volume" && input.projection.kind === "VOLUME") ||
    (input.resource_type === "network" && input.projection.kind === "NETWORK");
  return typeExact && input.expected_label === `farmos.day150.phase-c2b=${nonce}` &&
    input.projection.name === input.expected_name &&
    input.projection.ownership_label_value === expectedLabelValue;
}

export function buildFarmOsPteC2bOwnedCleanupPlan(input: Readonly<{
  resources: FarmOsPteC2bOwnedResources;
  container: FarmOsPteC2bCleanupProofState;
  volume: FarmOsPteC2bCleanupProofState;
  network: FarmOsPteC2bCleanupProofState;
}>): Readonly<{ commands: readonly FarmOsPteC2bDockerCommand[]; blocked: boolean }> | null {
  const identityExact = deriveFarmOsPteC2bOwnedResources(input.resources.execution_nonce)
    ?.container_name === input.resources.container_name;
  if (!identityExact) return null;
  const commands: FarmOsPteC2bDockerCommand[] = [];
  let blocked = false;
  const add = (proof: FarmOsPteC2bCleanupProofState, type: "container" | "volume" | "network",
    name: string): void => {
    if (proof.state === "NOT_CREATED") return;
    if (proof.state !== "CREATED_OWNED" || proof.projection === null ||
      !projectionProvesOwnership({ projection: proof.projection, resource_type: type,
        expected_name: name, expected_label: input.resources.ownership_label })) {
      blocked = true;
      return;
    }
    if (type === "container") {
      const id = proof.projection.kind === "CONTAINER" ? proof.projection.id : "";
      if (!CONTAINER_ID.test(id)) { blocked = true; return; }
      commands.push(command(["container", "stop", id]), command(["container", "rm", id]));
    } else commands.push(command([type, "rm", name]));
  };
  add(input.container, "container", input.resources.container_name);
  add(input.volume, "volume", input.resources.volume_name);
  add(input.network, "network", input.resources.network_name);
  return Object.freeze({ commands: Object.freeze(commands), blocked });
}

export async function executeFarmOsPteC2bOwnedCleanupPlan(
  plan: Readonly<{ commands: readonly FarmOsPteC2bDockerCommand[]; blocked: boolean }>,
  transport: FarmOsPteC2bDockerCommandTransport,
): Promise<Readonly<{ attempted: number; failed: number; completed_all_safe_commands: true }>> {
  let attempted = 0;
  let failed = 0;
  for (const cleanupCommand of plan.commands) {
    attempted += 1;
    try {
      const result = await transport.execute(cleanupCommand);
      if (result.failure !== "NONE" || result.exit_code !== 0) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return Object.freeze({ attempted, failed, completed_all_safe_commands: true });
}

declare const REAL_CAPABILITY_BRAND: unique symbol;
export type FarmOsPteC2bRealExecutionCapability = Readonly<{
  [REAL_CAPABILITY_BRAND]: true;
}>;
const REAL_CAPABILITY_BINDINGS = new WeakMap<object, object>();

class FailClosedRealDockerQualificationAdapter {
  async preflight(): Promise<never> { throw new Error("B2_REAL_ADAPTER_NOT_BOUND"); }
  async prepareFixture(): Promise<never> { throw new Error("B2_REAL_ADAPTER_NOT_BOUND"); }
  async applyExactMigration(): Promise<never> { throw new Error("B2_REAL_ADAPTER_NOT_BOUND"); }
  async recordAndVerifyMigrationHistory(): Promise<never> {
    throw new Error("B2_REAL_ADAPTER_NOT_BOUND");
  }
  async executeExactReadOnlyVerifier(): Promise<never> {
    throw new Error("B2_REAL_ADAPTER_NOT_BOUND");
  }
  async executeCase(): Promise<never> { throw new Error("B2_REAL_ADAPTER_NOT_BOUND"); }
  async cleanupExactOwnedResources(): Promise<never> {
    throw new Error("B2_REAL_ADAPTER_NOT_BOUND");
  }
}

export function createFarmOsPteC2bFailClosedRealDockerBoundary(): Readonly<{
  adapter: FarmOsPteC2bQualificationAdapter;
  capability: FarmOsPteC2bRealExecutionCapability;
}> {
  const adapter: FarmOsPteC2bQualificationAdapter =
    Object.freeze(new FailClosedRealDockerQualificationAdapter());
  const capability = Object.freeze(Object.create(null)) as FarmOsPteC2bRealExecutionCapability;
  REAL_CAPABILITY_BINDINGS.set(adapter, capability);
  return Object.freeze({ adapter, capability });
}

export function validateFarmOsPteC2bRealExecutionCapability(
  adapter: object,
  capability: unknown,
): capability is FarmOsPteC2bRealExecutionCapability {
  return typeof capability === "object" && capability !== null &&
    REAL_CAPABILITY_BINDINGS.get(adapter) === capability;
}
