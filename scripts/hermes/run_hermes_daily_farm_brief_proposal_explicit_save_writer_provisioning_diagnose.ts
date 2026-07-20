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
  diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningInternalError,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning";
import { PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning_executor";

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

export async function runHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningDiagnose(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult> {
  return diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({
    environment,
    actor: await actor(environment),
    executorFactory: (config) => new PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor(config),
  });
}

async function main(): Promise<void> {
  const result = await runHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningDiagnose(process.env);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningInternalError())}\n`);
    process.exitCode = 1;
  });
}
