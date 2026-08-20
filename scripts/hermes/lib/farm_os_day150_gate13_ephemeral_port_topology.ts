export const FARM_OS_DAY150_GATE13_CONTAINER_PORT = "5432/tcp" as const;
export const FARM_OS_DAY150_GATE13_HOST_IP = "127.0.0.1" as const;
export const FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST =
  "127.0.0.1::5432" as const;

export type FarmOsDay150Gate13LifecyclePhase = "PRE_START" | "POST_START";
export type FarmOsDay150Gate13PostgresEndpoint = Readonly<{
  host: typeof FARM_OS_DAY150_GATE13_HOST_IP;
  port: number;
}>;
declare const ENDPOINT_LEASE_BRAND: unique symbol;
export type FarmOsDay150Gate13EndpointLease = Readonly<{
  [ENDPOINT_LEASE_BRAND]: true;
}>;
export type FarmOsDay150Gate13RequestedTopology = Readonly<{
  accepted: true;
  container_port: typeof FARM_OS_DAY150_GATE13_CONTAINER_PORT;
  host_ip: typeof FARM_OS_DAY150_GATE13_HOST_IP;
  host_port: "DOCKER_ASSIGNED_EPHEMERAL";
}> | Readonly<{ accepted: false; reason: string }>;
export type FarmOsDay150Gate13BoundedPortEvidence = Readonly<{
  lifecycle_phase: FarmOsDay150Gate13LifecyclePhase;
  container_running: boolean | null;
  requested_binding: "LOCALHOST_EPHEMERAL_EMPTY" | "LOCALHOST_EPHEMERAL_ZERO" |
    "MISSING_OR_INVALID";
  container_port_key_present: boolean;
  realized_binding_shape: "MISSING" | "NULL" | "EMPTY_ARRAY" | "ARRAY" | "MALFORMED";
  realized_binding_count: number | null;
  accepted_host_ip: typeof FARM_OS_DAY150_GATE13_HOST_IP | null;
  accepted_host_port: "CANONICAL_INTEGER_1_65535" | null;
}>;
export type FarmOsDay150Gate13PortTopologyResult =
  | Readonly<{
    accepted: true;
    container_port: typeof FARM_OS_DAY150_GATE13_CONTAINER_PORT;
    host_ip: typeof FARM_OS_DAY150_GATE13_HOST_IP;
    host_port: number;
    endpoint: FarmOsDay150Gate13PostgresEndpoint;
    evidence: FarmOsDay150Gate13BoundedPortEvidence;
  }>
  | Readonly<{ accepted: false; reason: string; retryable: boolean;
    evidence: FarmOsDay150Gate13BoundedPortEvidence }>;
export type FarmOsDay150Gate13BoundedPortResolution =
  | Readonly<{ accepted: true; topology: Extract<FarmOsDay150Gate13PortTopologyResult,
      { accepted: true }>; attempt_count: number;
      first_evidence: FarmOsDay150Gate13BoundedPortEvidence }>
  | Readonly<{ accepted: false; reason: string; attempt_count: number;
      first_evidence: FarmOsDay150Gate13BoundedPortEvidence | null;
      final_evidence: FarmOsDay150Gate13BoundedPortEvidence | null }>;

export class FarmOsDay150Gate13EndpointLeaseAuthority {
  #generation = 0;
  readonly #leases = new WeakMap<object, Readonly<{
    generation: number;
    endpoint: FarmOsDay150Gate13PostgresEndpoint;
  }>>();

  invalidateForContainerRestart(): void {
    this.#generation += 1;
  }

  issueFromFreshInspect(
    topology: FarmOsDay150Gate13PortTopologyResult,
  ): FarmOsDay150Gate13EndpointLease {
    if (!topology.accepted || topology.evidence.lifecycle_phase !== "POST_START" ||
      topology.evidence.container_running !== true) {
      throw new Error("FRESH_RUNNING_INSPECT_TOPOLOGY_REQUIRED");
    }
    const lease = Object.freeze(Object.create(null)) as FarmOsDay150Gate13EndpointLease;
    this.#leases.set(lease, Object.freeze({ generation: this.#generation,
      endpoint: topology.endpoint }));
    return lease;
  }

  endpointForConnection(
    lease: FarmOsDay150Gate13EndpointLease,
  ): FarmOsDay150Gate13PostgresEndpoint {
    const state = this.#leases.get(lease);
    if (!state || state.generation !== this.#generation) {
      throw new Error("STALE_OR_UNTRUSTED_POSTGRES_ENDPOINT_LEASE");
    }
    return state.endpoint;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFarmOsDay150Gate13RequestedPortTopology(
  publishRequest: string,
): FarmOsDay150Gate13RequestedTopology {
  return publishRequest === FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST
    ? Object.freeze({ accepted: true, container_port: FARM_OS_DAY150_GATE13_CONTAINER_PORT,
      host_ip: FARM_OS_DAY150_GATE13_HOST_IP,
      host_port: "DOCKER_ASSIGNED_EPHEMERAL" as const })
    : Object.freeze({ accepted: false,
      reason: "EXACT_LOCALHOST_EPHEMERAL_PUBLISH_REQUEST_REQUIRED" });
}

function requestedBinding(resource: Record<string, unknown>):
  FarmOsDay150Gate13BoundedPortEvidence["requested_binding"] {
  const hostConfig = resource.HostConfig;
  if (!record(hostConfig) || !record(hostConfig.PortBindings) ||
    Object.keys(hostConfig.PortBindings).length !== 1) return "MISSING_OR_INVALID";
  const bindings = hostConfig.PortBindings[FARM_OS_DAY150_GATE13_CONTAINER_PORT];
  if (!Array.isArray(bindings) || bindings.length !== 1 || !record(bindings[0]) ||
    bindings[0].HostIp !== FARM_OS_DAY150_GATE13_HOST_IP) return "MISSING_OR_INVALID";
  if (bindings[0].HostPort === "") return "LOCALHOST_EPHEMERAL_EMPTY";
  if (bindings[0].HostPort === "0") return "LOCALHOST_EPHEMERAL_ZERO";
  return "MISSING_OR_INVALID";
}

function boundedEvidence(input: Readonly<{ phase: FarmOsDay150Gate13LifecyclePhase;
  resource: Record<string, unknown>; ports: Record<string, unknown> | null }> &
  Partial<Pick<FarmOsDay150Gate13BoundedPortEvidence, "realized_binding_shape" |
    "realized_binding_count" | "accepted_host_ip" | "accepted_host_port">>):
  FarmOsDay150Gate13BoundedPortEvidence {
  return Object.freeze({ lifecycle_phase: input.phase,
    container_running: record(input.resource.State) &&
      typeof input.resource.State.Running === "boolean" ? input.resource.State.Running : null,
    requested_binding: requestedBinding(input.resource),
    container_port_key_present: input.ports !== null &&
      Object.hasOwn(input.ports, FARM_OS_DAY150_GATE13_CONTAINER_PORT),
    realized_binding_shape: input.realized_binding_shape ?? "MISSING",
    realized_binding_count: input.realized_binding_count ?? null,
    accepted_host_ip: input.accepted_host_ip ?? null,
    accepted_host_port: input.accepted_host_port ?? null });
}

export function parseFarmOsDay150Gate13EphemeralPortTopology(input: Readonly<{
  publish_request: string;
  lifecycle_phase: FarmOsDay150Gate13LifecyclePhase;
  inspect_stdout: string;
}>): FarmOsDay150Gate13PortTopologyResult {
  const requested = validateFarmOsDay150Gate13RequestedPortTopology(input.publish_request);
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.inspect_stdout);
  } catch {
    decoded = null;
  }
  const resource = Array.isArray(decoded) && decoded.length === 1 && record(decoded[0])
    ? decoded[0] : Object.create(null) as Record<string, unknown>;
  const networkSettings = resource.NetworkSettings;
  const ports = record(networkSettings) && record(networkSettings.Ports)
    ? networkSettings.Ports : null;
  const base = boundedEvidence({ phase: input.lifecycle_phase, resource, ports });
  const reject = (reason: string, evidence = base, retryable = false) =>
    Object.freeze({ accepted: false as const, reason, retryable, evidence });
  if (!requested.accepted) return reject(requested.reason);
  if (!Array.isArray(decoded) || decoded.length !== 1 || !record(decoded[0])) {
    return reject("EXACT_ONE_CONTAINER_INSPECT_REQUIRED");
  }
  if (base.requested_binding === "MISSING_OR_INVALID") {
    return reject("TRUSTED_EPHEMERAL_REQUEST_READBACK_REQUIRED");
  }
  if (ports === null) return reject("NETWORK_PORTS_READBACK_MISSING");
  const portKeys = Object.keys(ports);
  if (portKeys.length !== 1 || portKeys[0] !== FARM_OS_DAY150_GATE13_CONTAINER_PORT) {
    return reject("EXACT_CONTAINER_PORT_READBACK_REQUIRED");
  }
  const bindings = ports[FARM_OS_DAY150_GATE13_CONTAINER_PORT];
  const shape = bindings === null ? "NULL" as const : Array.isArray(bindings)
    ? bindings.length === 0 ? "EMPTY_ARRAY" as const : "ARRAY" as const : "MALFORMED" as const;
  const shapedEvidence = boundedEvidence({ phase: input.lifecycle_phase, resource, ports,
    realized_binding_shape: shape,
    realized_binding_count: Array.isArray(bindings) ? bindings.length : null });
  if (input.lifecycle_phase === "PRE_START") {
    return reject("PRE_START_REALIZED_BINDING_NOT_AUTHORITY", shapedEvidence);
  }
  if (shapedEvidence.container_running !== true) {
    return reject("TRUSTED_RUNNING_STATE_REQUIRED", shapedEvidence);
  }
  if (bindings === null) {
    return reject("PUBLISHED_BINDING_NULL_NOT_YET_REALIZED", shapedEvidence, true);
  }
  if (!Array.isArray(bindings)) {
    return reject("PUBLISHED_BINDING_MALFORMED", shapedEvidence);
  }
  if (bindings.length === 0) {
    return reject("PUBLISHED_BINDING_EMPTY_NOT_YET_REALIZED", shapedEvidence, true);
  }
  if (bindings.length !== 1) return reject("PUBLISHED_BINDING_AMBIGUOUS", shapedEvidence);
  const binding = bindings[0];
  if (!record(binding) || Object.keys(binding).sort().join("\0") !== "HostIp\0HostPort") {
    return reject("PUBLISHED_BINDING_SCHEMA_INVALID", shapedEvidence);
  }
  if (binding.HostIp !== FARM_OS_DAY150_GATE13_HOST_IP) {
    return reject("LOCALHOST_IPV4_BINDING_REQUIRED", shapedEvidence);
  }
  if (typeof binding.HostPort !== "string" || !/^[1-9][0-9]{0,4}$/u.test(binding.HostPort)) {
    return reject("PUBLISHED_HOST_PORT_MALFORMED", shapedEvidence);
  }
  const hostPort = Number(binding.HostPort);
  if (!Number.isSafeInteger(hostPort) || hostPort < 1 || hostPort > 65_535) {
    return reject("PUBLISHED_HOST_PORT_OUT_OF_RANGE", shapedEvidence);
  }
  const acceptedEvidence = boundedEvidence({ phase: input.lifecycle_phase, resource, ports,
    realized_binding_shape: "ARRAY", realized_binding_count: 1,
    accepted_host_ip: FARM_OS_DAY150_GATE13_HOST_IP,
    accepted_host_port: "CANONICAL_INTEGER_1_65535" });
  return Object.freeze({ accepted: true,
    container_port: FARM_OS_DAY150_GATE13_CONTAINER_PORT,
    host_ip: FARM_OS_DAY150_GATE13_HOST_IP,
    host_port: hostPort,
    endpoint: Object.freeze({ host: FARM_OS_DAY150_GATE13_HOST_IP, port: hostPort }),
    evidence: acceptedEvidence });
}

export async function resolveFarmOsDay150Gate13PostStartPortTopology(input: Readonly<{
  read_inspect: (timeoutMilliseconds: number) => Promise<string>;
  bounded_wait: (milliseconds: number) => Promise<void>;
  monotonic_now: () => number;
  maximum_elapsed_milliseconds: number;
  maximum_attempts: number;
}>): Promise<FarmOsDay150Gate13BoundedPortResolution> {
  if (!Number.isSafeInteger(input.maximum_elapsed_milliseconds) ||
    input.maximum_elapsed_milliseconds < 1 || input.maximum_elapsed_milliseconds > 10_000 ||
    !Number.isSafeInteger(input.maximum_attempts) || input.maximum_attempts < 1 ||
    input.maximum_attempts > 40) throw new Error("BOUNDED_PORT_RESOLUTION_POLICY_INVALID");
  const started = input.monotonic_now();
  if (!Number.isFinite(started)) throw new Error("MONOTONIC_CLOCK_INVALID");
  let first: FarmOsDay150Gate13BoundedPortEvidence | null = null;
  let final: FarmOsDay150Gate13BoundedPortEvidence | null = null;
  for (let attempt = 1; attempt <= input.maximum_attempts; attempt += 1) {
    const elapsed = input.monotonic_now() - started;
    if (!Number.isFinite(elapsed) || elapsed < 0 ||
      elapsed >= input.maximum_elapsed_milliseconds) break;
    const timeout = Math.max(1, Math.min(1_000,
      Math.ceil(input.maximum_elapsed_milliseconds - elapsed)));
    let stdout: string;
    try { stdout = await input.read_inspect(timeout); }
    catch {
      return Object.freeze({ accepted: false, reason: "CONTAINER_INSPECT_TRANSPORT_FAILED",
        attempt_count: attempt, first_evidence: first, final_evidence: final });
    }
    const result = parseFarmOsDay150Gate13EphemeralPortTopology({ publish_request:
      FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST, lifecycle_phase: "POST_START",
    inspect_stdout: stdout });
    first ??= result.evidence; final = result.evidence;
    if (result.accepted) return Object.freeze({ accepted: true, topology: result,
      attempt_count: attempt, first_evidence: first });
    if (!result.retryable) return Object.freeze({ accepted: false, reason: result.reason,
      attempt_count: attempt, first_evidence: first, final_evidence: final });
    const afterInspectElapsed = input.monotonic_now() - started;
    if (!Number.isFinite(afterInspectElapsed) || afterInspectElapsed < 0 ||
      afterInspectElapsed >= input.maximum_elapsed_milliseconds) break;
    await input.bounded_wait(Math.min(100,
      Math.ceil(input.maximum_elapsed_milliseconds - afterInspectElapsed)));
  }
  return Object.freeze({ accepted: false,
    reason: "PUBLISHED_BINDING_NOT_REALIZED_WITHIN_BOUNDED_WINDOW",
    attempt_count: input.maximum_attempts, first_evidence: first, final_evidence: final });
}
