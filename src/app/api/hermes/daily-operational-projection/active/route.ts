import {
  createFarmOsActiveProjectionReadProductionDependencies,
  serveFarmOsActiveProjectionRead,
} from "../../../../../lib/hermes/farm_os_active_projection_read_server_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dependencies = createFarmOsActiveProjectionReadProductionDependencies({
  environment: process.env,
});

export async function GET(request: Request): Promise<Response> {
  return serveFarmOsActiveProjectionRead({ request, dependencies });
}
