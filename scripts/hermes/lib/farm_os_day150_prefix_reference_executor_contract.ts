import {
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES,
  type FarmOsDay150PrefixReferencePublicExecutorBoundary,
} from "../../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

// Compatibility name for source audits. The authoritative sequence is owned by
// the actual public executor and is exercised through that entrypoint; this file
// intentionally contains no parallel declarative state machine.
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTOR_SEQUENCE =
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES;
export type FarmOsDay150PrefixReferenceExecutorBoundary =
  FarmOsDay150PrefixReferencePublicExecutorBoundary;
