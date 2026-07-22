import { isCanonicalFarmOsIso } from "./farm_os_approved_proposal_contract";

type AnyRecord = Record<string, unknown>;
export type FoundationFinding = { source: string; classification: string; evidence: string };
export type FoundationSnapshotEntry = { relative_path: string; size: number; sha256: string };
const record = (value: unknown): value is AnyRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: AnyRecord, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const findings = (value: unknown): value is FoundationFinding[] => Array.isArray(value) && value.every((item) => record(item) && exact(item,["source","classification","evidence"]) && [item.source,item.classification,item.evidence].every((part)=>typeof part === "string" && part.length > 0));

export const FOUNDATION_BUILD_EVIDENCE_KEYS = ["schema_version","tree_hash","generated_at","build_command","observed_build_commands","exit_code","isolated_build_directory","repository_baseline_status","repository_after_status","repository_write_findings","repository_write_count","expected_build_write_findings","expected_build_write_count","unexpected_filesystem_write_findings","unexpected_filesystem_write_count","protected_file_hash_before","protected_file_hash_after","protected_file_write_findings","protected_file_write_count","network_measurement_method","network_findings","network_call_count","network_measurement_limitations","business_write_findings","business_write_count","external_execution_findings","external_execution_count","db_mutation_findings","db_mutation_count","migration_execution_findings","migration_execution_count","real_adapter_findings","real_adapter_call_count"] as const;

export function parseFarmOsDay135FoundationBuildEvidence(value: unknown) {
  if (!record(value) || !exact(value,FOUNDATION_BUILD_EVIDENCE_KEYS) || value.schema_version !== "farmos.day135.foundation.build-evidence.v2" || typeof value.tree_hash !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value.tree_hash) || !isCanonicalFarmOsIso(value.generated_at) || typeof value.build_command !== "string" || value.build_command.length === 0 || !strings(value.observed_build_commands) || value.exit_code !== 0 || typeof value.isolated_build_directory !== "string" || value.isolated_build_directory.length === 0 || !strings(value.repository_baseline_status) || !strings(value.repository_after_status) || typeof value.network_measurement_method !== "string" || value.network_measurement_method.length === 0 || typeof value.network_measurement_limitations !== "string" || value.network_measurement_limitations.length === 0 || typeof value.protected_file_hash_before !== "string" || !/^[a-f0-9]{40}$/u.test(value.protected_file_hash_before) || value.protected_file_hash_before !== value.protected_file_hash_after) return null;
  const findingKeys=["repository_write_findings","expected_build_write_findings","unexpected_filesystem_write_findings","protected_file_write_findings","network_findings","business_write_findings","external_execution_findings","db_mutation_findings","migration_execution_findings","real_adapter_findings"] as const;
  if (findingKeys.some((key)=>!findings(value[key]))) return null;
  const pairs=[ ["repository_write_findings","repository_write_count"], ["expected_build_write_findings","expected_build_write_count"], ["unexpected_filesystem_write_findings","unexpected_filesystem_write_count"], ["protected_file_write_findings","protected_file_write_count"], ["business_write_findings","business_write_count"], ["external_execution_findings","external_execution_count"], ["db_mutation_findings","db_mutation_count"], ["migration_execution_findings","migration_execution_count"], ["real_adapter_findings","real_adapter_call_count"] ] as const;
  if (pairs.some(([arrayKey,countKey])=>!count(value[countKey]) || (value[arrayKey] as unknown[]).length !== value[countKey])) return null;
  if (!count(value.network_call_count) || (value.network_findings as FoundationFinding[]).filter((item)=>item.classification === "runtime_network_attempt").length !== value.network_call_count) return null;
  return value;
}

export function diffFoundationSnapshots(before: readonly FoundationSnapshotEntry[], after: readonly FoundationSnapshotEntry[]) {
  const baseline=new Map(before.map((item)=>[item.relative_path,item]));
  const changed=after.filter((item)=>{const old=baseline.get(item.relative_path);return !old || old.size!==item.size || old.sha256!==item.sha256;});
  const removed=before.filter((item)=>!after.some((candidate)=>candidate.relative_path===item.relative_path));
  const expected=/^\.next\/(?:BUILD_ID|app-path-routes-manifest\.json|build-manifest\.json|cache\/|diagnostics\/|export-marker\.json|fallback-build-manifest\.json|images-manifest\.json|next-minimal-server\.js\.nft\.json|next-server\.js\.nft\.json|node_modules\/|package\.json|prerender-manifest\.json|required-server-files\.(?:js|json)|routes-manifest\.json|server\/|static\/|trace(?:-build)?|turbopack|types\/)/u;
  return [...changed.map((item)=>({source:"isolated_snapshot",classification:expected.test(item.relative_path)||item.relative_path==="tsconfig.tsbuildinfo"?"expected_build_write":"unexpected_filesystem_write",evidence:item.relative_path})),...removed.map((item)=>({source:"isolated_snapshot",classification:"unexpected_filesystem_write",evidence:`removed:${item.relative_path}`}))];
}
