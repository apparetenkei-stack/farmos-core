export const FARM_OS_PROJECTION_FIRST_INSTALLATION_BINDING_ERROR =
  "PROJECTION_FIRST_INSTALLATION_BINDING_UNAVAILABLE" as const;
export const FARM_OS_PROJECTION_FIRST_INSTALLATION_ENV = Object.freeze({
  installation_id: "FARMOS_INSTALLATION_ID",
  farm_scope: "FARMOS_AUTHORIZED_FARM_SCOPE",
  timezone: "FARMOS_BUSINESS_TIMEZONE",
});
export const FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE =
  "Asia/Tokyo" as const;

export type FarmOsProjectionFirstInstallationBinding = Readonly<{
  installation_id: string;
  farm_scope: string;
  timezone: typeof FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE;
}>;

type Environment = Record<string, string | undefined>;
type JsonRecord = Record<string, unknown>;

const BINDING_KEYS = ["installation_id", "farm_scope", "timezone"] as const;
const BOUNDED_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class FarmOsProjectionFirstInstallationBindingError extends Error {
  readonly code = FARM_OS_PROJECTION_FIRST_INSTALLATION_BINDING_ERROR;

  constructor() {
    super(FARM_OS_PROJECTION_FIRST_INSTALLATION_BINDING_ERROR);
    this.name = "FarmOsProjectionFirstInstallationBindingError";
  }
}

export function parseFarmOsProjectionFirstInstallationBinding(
  value: unknown,
): FarmOsProjectionFirstInstallationBinding | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== BINDING_KEYS.length ||
    !BINDING_KEYS.every((key) => Object.hasOwn(value, key)) ||
    typeof value.installation_id !== "string" ||
    !BOUNDED_IDENTIFIER.test(value.installation_id) ||
    typeof value.farm_scope !== "string" ||
    !BOUNDED_IDENTIFIER.test(value.farm_scope) ||
    value.timezone !== FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE
  ) {
    return null;
  }
  return Object.freeze({
    installation_id: value.installation_id,
    farm_scope: value.farm_scope,
    timezone: FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE,
  });
}

export function loadFarmOsProjectionFirstInstallationBinding(
  environment: Environment,
): FarmOsProjectionFirstInstallationBinding {
  const parsed = parseFarmOsProjectionFirstInstallationBinding({
    installation_id:
      environment[FARM_OS_PROJECTION_FIRST_INSTALLATION_ENV.installation_id],
    farm_scope:
      environment[FARM_OS_PROJECTION_FIRST_INSTALLATION_ENV.farm_scope],
    timezone:
      environment[FARM_OS_PROJECTION_FIRST_INSTALLATION_ENV.timezone],
  });
  if (parsed === null) {
    throw new FarmOsProjectionFirstInstallationBindingError();
  }
  return parsed;
}
