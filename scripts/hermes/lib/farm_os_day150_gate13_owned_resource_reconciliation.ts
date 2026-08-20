import {
  classifyFarmOsDay150BoundedDockerInspectResult,
  type FarmOsDay150DockerResourceKind,
} from "./farm_os_day150_docker_absence_classifier";

export const FARM_OS_DAY150_GATE13_OWNER_LABEL_KEY = "farmos.day150.gate13" as const;
export const FARM_OS_DAY150_GATE13_OWNER_LABEL_VALUE =
  "isolated-qualification-v1" as const;
export const FARM_OS_DAY150_GATE13_OWNED_RESOURCES = Object.freeze({
  container: "farmos-day150-gate13-qualification-v1-container",
  network: "farmos-day150-gate13-qualification-v1-network",
  volume: "farmos-day150-gate13-qualification-v1-volume",
});

export type FarmOsDay150Gate13DockerCommandResult = Readonly<{
  exit_code: number;
  stdout: string;
  stderr: string;
}>;
export type FarmOsDay150Gate13MutationAcknowledgement =
  "ACKNOWLEDGED" | "NOT_STARTED" | "OUTCOME_UNKNOWN";
export type FarmOsDay150Gate13OwnedResourceState =
  | Readonly<{ state: "ABSENT"; kind: FarmOsDay150DockerResourceKind; running: false }>
  | Readonly<{ state: "OWNED_PRESENT"; kind: FarmOsDay150DockerResourceKind;
      running: boolean }>
  | Readonly<{ state: "CONFLICT_OR_UNKNOWN"; kind: FarmOsDay150DockerResourceKind;
      reason: string }>;

export interface FarmOsDay150Gate13OwnedResourceAdapter {
  inspect(kind: FarmOsDay150DockerResourceKind,
    exactName: string): Promise<FarmOsDay150Gate13DockerCommandResult>;
  stopExactContainer(exactName: string): Promise<FarmOsDay150Gate13MutationAcknowledgement>;
  removeExact(kind: FarmOsDay150DockerResourceKind,
    exactName: string): Promise<FarmOsDay150Gate13MutationAcknowledgement>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactOwnedProjection(kind: FarmOsDay150DockerResourceKind, exactName: string,
  stdout: string): Readonly<{ running: boolean }> | null {
  let rows: unknown;
  try { rows = JSON.parse(stdout); } catch { return null; }
  if (!Array.isArray(rows) || rows.length !== 1 || !record(rows[0])) return null;
  const resource = rows[0];
  const name = kind === "container" && typeof resource.Name === "string"
    ? resource.Name.replace(/^\//u, "") : resource.Name;
  const labels = kind === "container" && record(resource.Config)
    ? resource.Config.Labels : resource.Labels;
  if (name !== exactName || !record(labels) ||
    labels[FARM_OS_DAY150_GATE13_OWNER_LABEL_KEY] !==
      FARM_OS_DAY150_GATE13_OWNER_LABEL_VALUE) return null;
  if (kind !== "container") return Object.freeze({ running: false });
  if (!record(resource.State) || typeof resource.State.Running !== "boolean") return null;
  return Object.freeze({ running: resource.State.Running });
}

export async function reconcileFarmOsDay150Gate13OwnedResource(
  adapter: FarmOsDay150Gate13OwnedResourceAdapter,
  kind: FarmOsDay150DockerResourceKind,
): Promise<FarmOsDay150Gate13OwnedResourceState> {
  const exactName = FARM_OS_DAY150_GATE13_OWNED_RESOURCES[kind];
  let result: FarmOsDay150Gate13DockerCommandResult;
  try { result = await adapter.inspect(kind, exactName); }
  catch { return Object.freeze({ state: "CONFLICT_OR_UNKNOWN", kind,
    reason: "INSPECT_TRANSPORT_OUTCOME_UNKNOWN" }); }
  const classification = classifyFarmOsDay150BoundedDockerInspectResult({ resource_kind: kind,
    expected_resource_name: exactName, ...result });
  if (classification === "ABSENT") return Object.freeze({ state: "ABSENT", kind,
    running: false });
  if (classification !== "PRESENT") return Object.freeze({ state: "CONFLICT_OR_UNKNOWN", kind,
    reason: `INSPECT_${classification}` });
  const projection = exactOwnedProjection(kind, exactName, result.stdout);
  return projection ? Object.freeze({ state: "OWNED_PRESENT", kind,
    running: projection.running }) : Object.freeze({ state: "CONFLICT_OR_UNKNOWN", kind,
      reason: "EXACT_NAME_OWNERSHIP_PROJECTION_REJECTED" });
}

export async function settleFarmOsDay150Gate13Creation(input: Readonly<{
  adapter: FarmOsDay150Gate13OwnedResourceAdapter;
  kind: FarmOsDay150DockerResourceKind;
  acknowledgement: FarmOsDay150Gate13MutationAcknowledgement;
}>): Promise<Readonly<{
  outcome: "CREATED_ACKNOWLEDGED" | "ACKNOWLEDGED_NOT_CREATED" |
    "CREATION_OUTCOME_UNKNOWN" | "CONFLICT_OR_UNKNOWN";
  resource: FarmOsDay150Gate13OwnedResourceState;
}>> {
  const resource = await reconcileFarmOsDay150Gate13OwnedResource(input.adapter, input.kind);
  if (resource.state === "CONFLICT_OR_UNKNOWN") return Object.freeze({
    outcome: "CONFLICT_OR_UNKNOWN", resource });
  if (input.acknowledgement === "ACKNOWLEDGED" && resource.state === "OWNED_PRESENT") {
    return Object.freeze({ outcome: "CREATED_ACKNOWLEDGED", resource });
  }
  if (input.acknowledgement === "NOT_STARTED" && resource.state === "ABSENT") {
    return Object.freeze({ outcome: "ACKNOWLEDGED_NOT_CREATED", resource });
  }
  return Object.freeze({ outcome: "CREATION_OUTCOME_UNKNOWN", resource });
}

export async function cleanupFarmOsDay150Gate13OwnedResources(
  adapter: FarmOsDay150Gate13OwnedResourceAdapter,
): Promise<Readonly<{ container: "ABSENT"; network: "ABSENT"; volume: "ABSENT";
  zero_residual: true; unrelated_resources_touched: 0 }>> {
  for (const kind of ["container", "volume", "network"] as const) {
    const exactName = FARM_OS_DAY150_GATE13_OWNED_RESOURCES[kind];
    const before = await reconcileFarmOsDay150Gate13OwnedResource(adapter, kind);
    if (before.state === "CONFLICT_OR_UNKNOWN") {
      throw new Error("DAY150_GATE13_QUALIFICATION_CLEANUP_OUTCOME_UNKNOWN");
    }
    if (before.state === "OWNED_PRESENT") {
      if (kind === "container" && before.running) await adapter.stopExactContainer(exactName);
      await adapter.removeExact(kind, exactName);
    }
    const after = await reconcileFarmOsDay150Gate13OwnedResource(adapter, kind);
    if (after.state !== "ABSENT") {
      throw new Error("DAY150_GATE13_QUALIFICATION_CLEANUP_OUTCOME_UNKNOWN");
    }
  }
  return Object.freeze({ container: "ABSENT", network: "ABSENT", volume: "ABSENT",
    zero_residual: true, unrelated_resources_touched: 0 });
}
