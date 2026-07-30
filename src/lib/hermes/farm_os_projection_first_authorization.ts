import type {
  FarmOsProjectionFirstAuthorizationContext,
  FarmOsProjectionFirstAuthorizationPort,
} from "./farm_os_projection_first_runtime";
import type {
  FarmOsProjectionFirstInstallationBinding,
} from "./farm_os_projection_first_installation_binding";

export type FarmOsProjectionFirstActorEvidence = Readonly<{
  subject_id: string;
  channel: "web" | "slack" | "cli";
  actor_authorized: boolean;
  authorization_evidence_id: string;
  authentication_method: string;
}>;

export type FarmOsProjectionFirstAuthorizationEvent =
  | "FARMOS_PROJECTION_FIRST_ACTOR_AUTHORIZED"
  | "FARMOS_PROJECTION_FIRST_ACTOR_REJECTED";

const BOUNDED_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function emit(
  listener: ((event: FarmOsProjectionFirstAuthorizationEvent) => void) |
    undefined,
  event: FarmOsProjectionFirstAuthorizationEvent,
): void {
  try {
    listener?.(event);
  } catch {
    // Fixed observability cannot change authorization behavior.
  }
}

function validActor(input: FarmOsProjectionFirstActorEvidence): boolean {
  return input.actor_authorized === true &&
    BOUNDED_REFERENCE.test(input.subject_id) &&
    BOUNDED_REFERENCE.test(input.authorization_evidence_id) &&
    BOUNDED_REFERENCE.test(input.authentication_method) &&
    (input.channel === "web" ||
      input.channel === "slack" ||
      input.channel === "cli");
}

export function createFarmOsProjectionFirstAuthorizationContext(input: {
  binding: FarmOsProjectionFirstInstallationBinding;
  actor: FarmOsProjectionFirstActorEvidence;
}): FarmOsProjectionFirstAuthorizationContext | null {
  if (!validActor(input.actor)) return null;
  return Object.freeze({
    installation_id: input.binding.installation_id,
    bound_farm_scope: input.binding.farm_scope,
    subject_id: input.actor.subject_id,
    channel: input.actor.channel,
    actor_authorized: true,
    authorization_evidence_id: input.actor.authorization_evidence_id,
    authentication_method: input.actor.authentication_method,
  });
}

export function createFarmOsProjectionFirstAuthorizationAdapter(input: {
  binding: FarmOsProjectionFirstInstallationBinding;
  onEvent?: (event: FarmOsProjectionFirstAuthorizationEvent) => void;
}): FarmOsProjectionFirstAuthorizationPort {
  return Object.freeze({
    authorize: async ({ requested_farm_scope, context }) => {
      const authorized =
        context.actor_authorized === true &&
        context.installation_id === input.binding.installation_id &&
        context.bound_farm_scope === input.binding.farm_scope &&
        requested_farm_scope === input.binding.farm_scope &&
        BOUNDED_REFERENCE.test(context.subject_id) &&
        BOUNDED_REFERENCE.test(context.authorization_evidence_id) &&
        BOUNDED_REFERENCE.test(context.authentication_method);
      emit(
        input.onEvent,
        authorized
          ? "FARMOS_PROJECTION_FIRST_ACTOR_AUTHORIZED"
          : "FARMOS_PROJECTION_FIRST_ACTOR_REJECTED",
      );
      return authorized
        ? {
          installation_id: input.binding.installation_id,
          farm_scope: input.binding.farm_scope,
          authorization_id: context.authorization_evidence_id,
        }
        : null;
    },
  });
}
