import assert from "node:assert/strict";
import { Pool } from "pg";

import {
  loadFarmOsProjectionFirstInstallationBinding,
} from "../../src/lib/hermes/farm_os_projection_first_installation_binding";
import {
  FarmOsProjectionFirstPostgresReadAdapter,
} from "../../src/lib/hermes/farm_os_projection_first_postgres_read_adapter";
import {
  loadFarmOsProjectionFirstLocalPostgresConfig,
} from "../../src/lib/hermes/farm_os_projection_first_production_service";
import {
  adaptFarmOsProjectionFirstSlackBusinessDate,
} from "../../src/lib/hermes/farm_os_projection_first_slack_adapter";

async function main(): Promise<void> {
  const binding = loadFarmOsProjectionFirstInstallationBinding(process.env);
  const pool = new Pool(
    loadFarmOsProjectionFirstLocalPostgresConfig(process.env),
  );
  const events: string[] = [];
  const repository = new FarmOsProjectionFirstPostgresReadAdapter({
    installation_binding: binding,
    postgres_pool: pool,
    owns_pool: true,
    onEvent: (event) => events.push(event),
  });
  try {
    const businessDate = adaptFarmOsProjectionFirstSlackBusinessDate({
      query: "現在の作業件数",
      now: new Date(),
    }).business_date;
    const bundle = await repository.readProjectionBundle({
      authorized_scope: {
        installation_id: binding.installation_id,
        farm_scope: binding.farm_scope,
        authorization_id: "local_readonly_integration",
      },
      business_date: businessDate,
    });
    assert.equal(bundle.business_date, businessDate);
    assert.equal(bundle.full_history_scan_performed, false);
    assert.ok(bundle.lineage.length <= 50);
    assert.ok(bundle.snapshots.length <= 50);
    assert.deepEqual(events, [
      "FARMOS_PROJECTION_FIRST_SCOPED_READ_STARTED",
      "FARMOS_PROJECTION_FIRST_SCOPED_READ_COMPLETED",
    ]);
    console.log(JSON.stringify({
      status: "PASS",
      transaction: "repeatable_read_read_only",
      exact_business_date_only: true,
      full_history_scan: false,
      mutation: false,
      projection_count: bundle.projections.length,
    }));
  } finally {
    await repository.close();
  }
}

main().catch(() => {
  console.error("PROJECTION_FIRST_LOCAL_READONLY_INTEGRATION_FAILED");
  process.exitCode = 1;
});
