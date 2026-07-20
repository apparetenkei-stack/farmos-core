import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS,
  createHermesDailyFarmBriefPilotIdentityBoundary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_pilot_authentication";
import { parseHermesDailyFarmBriefAuthenticatedActorContext } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningInternalError,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning";
import { PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning_executor";

export function hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApplyRequested(
  argv: readonly string[],
): boolean {
  return argv.length === 3 && argv[2] === "--apply";
}

async function actor(environment: Readonly<Record<string, string | undefined>>): Promise<unknown> {
  const identity = createHermesDailyFarmBriefPilotIdentityBoundary(environment);
  if (identity.state !== "ready") return null;
  const token = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.token];
  const authentication = await authenticateHermesDailyFarmBriefServerRequest(
    identity.authenticationProvider,
    new Request("http://127.0.0.1/internal", { headers: { authorization: `Bearer ${token ?? ""}` } }),
  );
  if (authentication.status !== "authenticated") return null;
  return parseHermesDailyFarmBriefAuthenticatedActorContext(
    await resolveHermesDailyFarmBriefActorContext(identity.actorDirectory, authentication),
  );
}

export async function runHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApply(input: {
  environment: Readonly<Record<string, string | undefined>>;
  argv: readonly string[];
}): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult> {
  return applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({
    environment: input.environment,
    actor: await actor(input.environment),
    applyRequested: hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApplyRequested(input.argv),
    executorFactory: (config) => new PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor(config),
  });
}

async function main(): Promise<void> {
  const result = await runHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApply({ environment: process.env, argv: process.argv });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningInternalError())}\n`);
    process.exitCode = 1;
  });
}
