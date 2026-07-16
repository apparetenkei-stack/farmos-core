import { serveHermesDailyFarmBriefLatestDisplay } from "../../../../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_display_service";
import { hermesDailyFarmBriefLatestServerDependencies } from "../../../../../lib/hermes/hermes_daily_farm_brief_latest_server_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return serveHermesDailyFarmBriefLatestDisplay({ request, dependencies: hermesDailyFarmBriefLatestServerDependencies });
}
