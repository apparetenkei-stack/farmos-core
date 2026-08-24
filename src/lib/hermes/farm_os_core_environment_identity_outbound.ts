import type {
  FarmOsCoreEnvironmentIdentityRuntime,
} from "./farm_os_core_environment_identity_runtime";

export type FarmOsCoreEnvironmentIdentityOutboundTarget = Readonly<{
  environment_id: string;
  installation_id: string;
  farm_scope: string;
  endpoint_alias: string;
}>;

export type FarmOsCoreEnvironmentIdentityOutboundResult =
  | Readonly<{ result: "ALLOW"; response: Response; fetch_performed: true }>
  | Readonly<{
    result: "DENY";
    response: null;
    fetch_performed: boolean;
    reason: "TARGET_IDENTITY_REJECTED" | "RESPONSE_IDENTITY_REJECTED";
  }>;

export async function fetchFarmOsCoreEnvironmentIdentityBound(input: {
  runtime: FarmOsCoreEnvironmentIdentityRuntime;
  target: FarmOsCoreEnvironmentIdentityOutboundTarget;
  url: URL;
  init: RequestInit;
  fetchImpl: typeof fetch;
}): Promise<FarmOsCoreEnvironmentIdentityOutboundResult> {
  const prepared = input.runtime.prepareOutboundRequest({
    target_environment_id: input.target.environment_id,
    target_installation_id: input.target.installation_id,
    target_farm_scope: input.target.farm_scope,
    target_endpoint_alias: input.target.endpoint_alias,
  });
  if (prepared.decision !== "ALLOW") {
    return Object.freeze({
      result: "DENY",
      response: null,
      fetch_performed: false,
      reason: "TARGET_IDENTITY_REJECTED",
    });
  }
  const headers = new Headers(input.init.headers);
  for (const [name, value] of Object.entries(prepared.response_headers)) {
    headers.set(name, value);
  }
  const response = await input.fetchImpl(input.url, {
    ...input.init,
    headers,
  });
  const verified = input.runtime.verifyOutboundResponse(response.headers);
  return verified.decision === "ALLOW"
    ? Object.freeze({ result: "ALLOW", response, fetch_performed: true })
    : Object.freeze({
      result: "DENY",
      response: null,
      fetch_performed: true,
      reason: "RESPONSE_IDENTITY_REJECTED",
    });
}
