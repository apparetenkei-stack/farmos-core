import assert from "node:assert/strict";

import {
  APPARETENKEI_READONLY_API_BASE_URL_ENV,
  APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV,
  FARMOS_CORE_READONLY_TOKEN_ENV,
  readHermesOperationalReadonlySources,
} from "../../src/lib/hermes/hermes_operational_readonly_client";

const TEST_BASE_URL = "http://127.0.0.1:3999";
const TEST_TOKEN = "day92-unit-test-token";

function makeEnv(overrides?: Record<string, string | undefined>) {
  return {
    [APPARETENKEI_READONLY_API_BASE_URL_ENV]: TEST_BASE_URL,
    [FARMOS_CORE_READONLY_TOKEN_ENV]: TEST_TOKEN,
    [APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV]: "5000",
    ...overrides,
  };
}

function makeSuccessEnvelope(input: {
  source:
    | "apparetenkei_inventory_readonly"
    | "apparetenkei_work_logs_readonly";
  records: unknown[];
  limit?: number;
}) {
  return {
    result: "ok",
    source: input.source,
    generatedAt: "2026-07-10T00:00:00.000Z",
    readOnly: true,
    recordCount: input.records.length,
    records: input.records,
    pagination: {
      limit: input.limit ?? 100,
      hasMore: false,
    },
    safety: {
      writePerformed: false,
      restrictedFieldsExposed: false,
    },
  };
}

const inventoryRecords = [
  {
    id: "material-1",
    name: "Fertilizer A",
    baseType: "fertilizer",
    currentQuantity: 0,
    unit: "kg",
  },
];

const workLogRecords = [
  {
    id: "work-1",
    startedAt: "2026-07-10T01:00:00.000Z",
    fieldId: "field-1",
    workTypeId: "work-type-1",
    workTypeName: "Cultivation",
    durationMinutes: 0,
    targetCrop: "Cabbage",
    cropCycleId: "cycle-1",
    machineId: null,
    implementId: null,
    yieldAmount: 0,
    yieldUnit: "kg",
    appliedMaterials: [
      {
        materialId: "material-1",
        materialName: "Fertilizer A",
        quantity: 0,
        unit: "kg",
      },
    ],
  },
];

function createSuccessFetch(
  captures: Array<{
    url: string;
    method: string | undefined;
    authorization: string | null;
    accept: string | null;
    bodyPresent: boolean;
  }>,
): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    captures.push({
      url,
      method: init?.method,
      authorization: headers.get("authorization"),
      accept: headers.get("accept"),
      bodyPresent: init?.body !== undefined && init?.body !== null,
    });

    const isInventory =
      url.includes("/api/farmos-core/inventory-summary");

    return new Response(
      JSON.stringify(
        makeSuccessEnvelope({
          source: isInventory
            ? "apparetenkei_inventory_readonly"
            : "apparetenkei_work_logs_readonly",
          records: isInventory ? inventoryRecords : workLogRecords,
        }),
      ),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };
}

function assertGlobalSafety(
  result: Awaited<ReturnType<typeof readHermesOperationalReadonlySources>>,
): void {
  assert.equal(result.hermes_context_injection_performed, false);
  assert.equal(result.suggestion_generation_performed, false);
  assert.equal(result.proposal_created, false);
  assert.equal(result.proposal_saved, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.core_db_write_performed, false);
  assert.equal(result.audit_write_performed, false);
  assert.equal(result.database_write_performed, false);
  assert.equal(result.credentials_exposed, false);
  assert.equal(result.arbitrary_endpoint_allowed, false);
  assert.equal(result.arbitrary_method_allowed, false);
}

async function main(): Promise<void> {
  let fetchCount = 0;
  const missingConfiguration =
    await readHermesOperationalReadonlySources({
      env: {},
      fetchImpl: async () => {
        fetchCount += 1;
        throw new Error("fetch must not run");
      },
    });

  assert.equal(missingConfiguration.result, "error");
  assert.equal(fetchCount, 0);
  assert.equal(
    missingConfiguration.inventory.error_code,
    "configuration_unavailable",
  );
  assert.equal(
    missingConfiguration.work_log.error_code,
    "configuration_unavailable",
  );
  assert.equal(missingConfiguration.external_fetch_performed, false);
  assertGlobalSafety(missingConfiguration);

  const invalidBaseUrl =
    await readHermesOperationalReadonlySources({
      env: makeEnv({
        [APPARETENKEI_READONLY_API_BASE_URL_ENV]:
          "http://user:password@127.0.0.1:3999/private?x=1",
      }),
      fetchImpl: async () => {
        throw new Error("fetch must not run");
      },
    });

  assert.equal(invalidBaseUrl.result, "error");
  assert.equal(
    invalidBaseUrl.inventory.error_code,
    "configuration_unavailable",
  );

  const invalidLimit =
    await readHermesOperationalReadonlySources({
      env: makeEnv(),
      limit: 101,
      fetchImpl: async () => {
        throw new Error("fetch must not run");
      },
    });

  assert.equal(invalidLimit.result, "error");
  assert.equal(invalidLimit.inventory.error_code, "invalid_limit");
  assert.equal(invalidLimit.external_fetch_performed, false);

  const captures: Array<{
    url: string;
    method: string | undefined;
    authorization: string | null;
    accept: string | null;
    bodyPresent: boolean;
  }> = [];

  const success = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: createSuccessFetch(captures),
  });

  assert.equal(success.result, "ok");
  assert.equal(success.inventory_source_connected, true);
  assert.equal(success.work_log_source_connected, true);
  assert.equal(success.inventory.record_count, 1);
  assert.equal(success.work_log.record_count, 1);
  assert.equal(success.inventory.records[0]?.currentQuantity, 0);
  assert.equal(success.work_log.records[0]?.durationMinutes, 0);
  assert.equal(success.work_log.records[0]?.yieldAmount, 0);
  assert.equal(
    success.work_log.records[0]?.appliedMaterials?.[0]?.quantity,
    0,
  );
  assert.equal(captures.length, 2);
  assert.equal(
    captures.every((capture) => capture.method === "GET"),
    true,
  );
  assert.equal(
    captures.every(
      (capture) =>
        capture.authorization === `Bearer ${TEST_TOKEN}`,
    ),
    true,
  );
  assert.equal(
    captures.every((capture) => capture.accept === "application/json"),
    true,
  );
  assert.equal(
    captures.every((capture) => capture.bodyPresent === false),
    true,
  );
  assert.equal(
    captures.some(
      (capture) =>
        capture.url ===
        `${TEST_BASE_URL}/api/farmos-core/inventory-summary?limit=100`,
    ),
    true,
  );
  assert.equal(
    captures.some(
      (capture) =>
        capture.url ===
        `${TEST_BASE_URL}/api/farmos-core/recent-work-logs?limit=100`,
    ),
    true,
  );
  assertGlobalSafety(success);

  const serializedSuccess = JSON.stringify(success);
  assert.equal(serializedSuccess.includes(TEST_TOKEN), false);

  const restrictedFetch: typeof fetch = async (input) => {
    const isInventory =
      String(input).includes("/api/farmos-core/inventory-summary");

    const records = isInventory
      ? [
          {
            ...inventoryRecords[0],
            price_per_unit: 100,
          },
        ]
      : workLogRecords;

    return new Response(
      JSON.stringify(
        makeSuccessEnvelope({
          source: isInventory
            ? "apparetenkei_inventory_readonly"
            : "apparetenkei_work_logs_readonly",
          records,
        }),
      ),
      { status: 200 },
    );
  };

  const restricted = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: restrictedFetch,
  });

  assert.equal(restricted.result, "partial");
  assert.equal(restricted.inventory.result, "error");
  assert.equal(restricted.inventory.error_code, "invalid_response");
  assert.equal(restricted.inventory.records.length, 0);
  assert.equal(restricted.inventory.restricted_fields_exposed, false);
  assert.equal(restricted.work_log.result, "ok");
  assertGlobalSafety(restricted);

  const rawDetailsFetch: typeof fetch = async (input) => {
    const isInventory =
      String(input).includes("/api/farmos-core/inventory-summary");

    const records = isInventory
      ? inventoryRecords
      : [
          {
            ...workLogRecords[0],
            details: {
              worker_name: "restricted",
            },
          },
        ];

    return new Response(
      JSON.stringify(
        makeSuccessEnvelope({
          source: isInventory
            ? "apparetenkei_inventory_readonly"
            : "apparetenkei_work_logs_readonly",
          records,
        }),
      ),
      { status: 200 },
    );
  };

  const rawDetails = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: rawDetailsFetch,
  });

  assert.equal(rawDetails.result, "partial");
  assert.equal(rawDetails.work_log.result, "error");
  assert.equal(rawDetails.work_log.error_code, "invalid_response");
  assert.equal(rawDetails.work_log.records.length, 0);

  const badCountFetch: typeof fetch = async (input) => {
    const isInventory =
      String(input).includes("/api/farmos-core/inventory-summary");
    const envelope = makeSuccessEnvelope({
      source: isInventory
        ? "apparetenkei_inventory_readonly"
        : "apparetenkei_work_logs_readonly",
      records: isInventory ? inventoryRecords : workLogRecords,
    });
    envelope.recordCount = 99;

    return new Response(JSON.stringify(envelope), { status: 200 });
  };

  const badCount = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: badCountFetch,
  });

  assert.equal(badCount.result, "error");
  assert.equal(badCount.inventory.error_code, "invalid_response");
  assert.equal(badCount.work_log.error_code, "invalid_response");

  const remoteSecret = "remote-internal-secret";
  const httpError = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          error: remoteSecret,
          stack: "sensitive stack",
        }),
        { status: 500 },
      ),
  });

  assert.equal(httpError.result, "error");
  assert.equal(httpError.inventory.error_code, "remote_http_error");
  assert.equal(httpError.work_log.error_code, "remote_http_error");
  assert.equal(JSON.stringify(httpError).includes(remoteSecret), false);
  assert.equal(JSON.stringify(httpError).includes("sensitive stack"), false);

  const networkError = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: async () => {
      throw new Error("network detail must not escape");
    },
  });

  assert.equal(networkError.result, "error");
  assert.equal(networkError.inventory.error_code, "network_unavailable");
  assert.equal(networkError.work_log.error_code, "network_unavailable");
  assert.equal(
    JSON.stringify(networkError).includes("network detail"),
    false,
  );

  const timeout = await readHermesOperationalReadonlySources({
    env: makeEnv({
      [APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV]: "100",
    }),
    fetchImpl: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      }),
  });

  assert.equal(timeout.result, "error");
  assert.equal(timeout.inventory.error_code, "timeout");
  assert.equal(timeout.work_log.error_code, "timeout");
  assertGlobalSafety(timeout);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_operational_readonly_client",
        configuration_fail_closed: "ok",
        fixed_endpoint_and_get_only: "ok",
        bearer_header: "ok",
        limit_validation: "ok",
        envelope_validation: "ok",
        inventory_schema_validation: "ok",
        work_log_schema_validation: "ok",
        restricted_field_rejection: "ok",
        raw_details_rejection: "ok",
        zero_value_preservation: "ok",
        remote_error_redaction: "ok",
        network_error_redaction: "ok",
        timeout: "ok",
        token_exposure: false,
        hermes_context_injection_performed: false,
        database_write_performed: false,
        unit_test_network_dependency: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
