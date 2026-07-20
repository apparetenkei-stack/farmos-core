import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS,
  createHermesDailyFarmBriefPilotIdentityBoundary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_pilot_authentication";
import { createHermesDailyFarmBriefProposalCandidate } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";
import {
  runHermesDailyFarmBriefProposalExplicitSaveProduction,
  type HermesDailyFarmBriefProposalExplicitSaveProductionResult,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_production_adapter";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { parseHermesDailyFarmBriefAuthenticatedActorContext } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";

type RunnerInput = {
  schema_version: "hermes.daily_farm_brief.proposal_explicit_save_production_runner_input.v1";
  candidate_input: unknown;
  expected_source_version: number;
  requested_at: string;
};

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseInput(value: unknown): RunnerInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!exact(candidate, ["schema_version", "candidate_input", "expected_source_version", "requested_at"])) return null;
  if (candidate.schema_version !== "hermes.daily_farm_brief.proposal_explicit_save_production_runner_input.v1" || !Number.isSafeInteger(candidate.expected_source_version) || Number(candidate.expected_source_version) < 1 || typeof candidate.requested_at !== "string") return null;
  return candidate as RunnerInput;
}

function denied(state: "invalid_candidate" | "unauthorized" | "internal_error"): HermesDailyFarmBriefProposalExplicitSaveProductionResult {
  return {
    schema_version: "hermes.daily_farm_brief.proposal_explicit_save_production_result.v1",
    result: state === "internal_error" ? "error" : "denied",
    state,
    evidence: {
      candidate_valid: false,
      administrator_authorized: false,
      explicit_save_gate_valid: false,
      proposal_count: 0,
      mutation_count: 0,
      database_connection_performed: false,
      database_mutation_performed: false,
      transaction_committed: false,
      rollback_performed: false,
      proposal_apply_performed: false,
      review_post_performed: false,
      business_row_mutation_count: 0,
      retry_count: 0,
      credential_exposed: false,
      raw_identifier_exposed: false,
    },
  };
}

export function hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested(argv: readonly string[]): boolean {
  return argv.length === 3 && argv[2] === "--apply";
}

export async function runHermesDailyFarmBriefProposalExplicitSaveProductionRunner(input: {
  environment: Readonly<Record<string, string | undefined>>;
  argv: readonly string[];
  rawInput: unknown;
}): Promise<HermesDailyFarmBriefProposalExplicitSaveProductionResult> {
  const parsed = parseInput(input.rawInput);
  if (parsed === null) return denied("invalid_candidate");
  const identity = createHermesDailyFarmBriefPilotIdentityBoundary(input.environment);
  if (identity.state !== "ready") return denied("unauthorized");
  const token = input.environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.token];
  const authentication = await authenticateHermesDailyFarmBriefServerRequest(identity.authenticationProvider, new Request("http://127.0.0.1/internal", { headers: { authorization: `Bearer ${token ?? ""}` } }));
  if (authentication.status !== "authenticated") return denied("unauthorized");
  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(await resolveHermesDailyFarmBriefActorContext(identity.actorDirectory, authentication));
  if (actor === null || actor.role !== "administrator" || !actor.authorization_verified || actor.allowed_scope_keys.length !== 0) return denied("unauthorized");
  const candidate = createHermesDailyFarmBriefProposalCandidate({ value: parsed.candidate_input, expectedSourceVersion: parsed.expected_source_version, clock: () => parsed.requested_at });
  if (candidate === null) return denied("invalid_candidate");
  return runHermesDailyFarmBriefProposalExplicitSaveProduction({ environment: input.environment, actor, candidate, requestedAt: parsed.requested_at, applyRequested: hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested(input.argv) });
}

async function main(): Promise<void> {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(0, "utf8")); }
  catch { raw = null; }
  const result = await runHermesDailyFarmBriefProposalExplicitSaveProductionRunner({ environment: process.env, argv: process.argv, rawInput: raw });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(denied("internal_error"))}\n`);
    process.exitCode = 1;
  });
}
