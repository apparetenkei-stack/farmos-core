export const HERMES_OPERATIONAL_OPAQUE_REFERENCE_MAX_CHARS = 120;

const HERMES_OPERATIONAL_OPAQUE_REFERENCE_PATTERN =
  /^[0-9A-Za-z][0-9A-Za-z_:-]{0,119}$/u;

export function isHermesOperationalOpaqueReference(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= HERMES_OPERATIONAL_OPAQUE_REFERENCE_MAX_CHARS &&
    HERMES_OPERATIONAL_OPAQUE_REFERENCE_PATTERN.test(value)
  );
}
