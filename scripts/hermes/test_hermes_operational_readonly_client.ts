import assert from "node:assert/strict";

import {
  APPARETENKEI_READONLY_API_BASE_URL_ENV,
  APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV,
  FARMOS_CORE_READONLY_TOKEN_ENV,
  readHermesOperationalReadonlySources,
} from "../../src/lib/hermes/hermes_operational_readonly_client";
import { isHermesOperationalOpaqueReference } from "../../src/lib/hermes/hermes_operational_reference_contract";

const TEST_BASE_URL = "http://127.0.0.1:3999";
const TEST_TOKEN = "day92-unit-test-token";
type JsonRecord = Record<string, unknown>;

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
    records: structuredClone(input.records),
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

function makeDay122Envelope(input: {
  source: "apparetenkei_fields_readonly" | "apparetenkei_crop_cycles_readonly";
  schemaVersion: "farmos.core.fields.read.v1" | "farmos.core.crop_cycles.read.v1";
  records: unknown[];
  limit?: number;
}) {
  return {
    result: "ok",
    schema_version: input.schemaVersion,
    source: input.source,
    generated_at: "2026-07-10T00:00:00.000Z",
    readOnly: true,
    record_count: input.records.length,
    records: structuredClone(input.records),
    pagination: { limit: input.limit ?? 100, hasMore: false },
    safety: { writePerformed: false, restrictedFieldsExposed: false },
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

const fieldRecords = Array.from({ length: 71 }, (_, index) => ({
  reference: `field-reference-${index + 1}`,
  display_name: `Field ${index + 1}`,
  active_state: "unknown" as const,
  source_updated_at: null,
}));

const cropCycleRecords = Array.from({ length: 40 }, (_, index) => ({
  reference: `crop-cycle-reference-${index + 1}`,
  field_references: [`field-reference-${(index % fieldRecords.length) + 1}`],
  crop_display_name: index % 2 === 0 ? "Cabbage" : null,
  cycle_state: "unknown" as const,
  operational_start_date: index % 2 === 0 ? "2026-07-01" : null,
  source_updated_at: null,
}));

function envelopeForUrl(url: string): Record<string, unknown> {
  if (url.includes("/inventory-summary")) return makeSuccessEnvelope({ source: "apparetenkei_inventory_readonly", records: inventoryRecords });
  if (url.includes("/recent-work-logs")) return makeSuccessEnvelope({ source: "apparetenkei_work_logs_readonly", records: workLogRecords });
  if (url.includes("/fields")) return makeDay122Envelope({ source: "apparetenkei_fields_readonly", schemaVersion: "farmos.core.fields.read.v1", records: fieldRecords });
  return makeDay122Envelope({ source: "apparetenkei_crop_cycles_readonly", schemaVersion: "farmos.core.crop_cycles.read.v1", records: cropCycleRecords });
}

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

    return new Response(
      JSON.stringify(envelopeForUrl(url)),
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
  const reference120 = `a${"b".repeat(119)}`;
  assert.equal(isHermesOperationalOpaqueReference(reference120), true);
  assert.equal(isHermesOperationalOpaqueReference(`${reference120}c`), false);
  assert.equal(isHermesOperationalOpaqueReference("field reference"), false);
  assert.equal(isHermesOperationalOpaqueReference("field\nreference"), false);
  assert.equal(isHermesOperationalOpaqueReference("field/reference"), false);
  assert.equal(isHermesOperationalOpaqueReference("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isHermesOperationalOpaqueReference("field:stable_id-1"), true);

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
  assert.equal(success.field_source_connected, true);
  assert.equal(success.crop_cycle_source_connected, true);
  assert.equal(success.inventory.record_count, 1);
  assert.equal(success.work_log.record_count, 1);
  assert.equal(success.field?.record_count, 71);
  assert.equal(success.crop_cycle?.record_count, 40);
  assert.equal(success.inventory.records[0]?.currentQuantity, 0);
  assert.equal(success.work_log.records[0]?.durationMinutes, 0);
  assert.equal(success.work_log.records[0]?.yieldAmount, 0);
  assert.equal(
    success.work_log.records[0]?.appliedMaterials?.[0]?.quantity,
    0,
  );
  assert.equal(captures.length, 4);
  assert.equal(
    captures.every((capture) => capture.method === "GET"),
    true,
  );
  assert.equal(captures.some((capture) => capture.url === `${TEST_BASE_URL}/api/farmos-core/fields?limit=100`), true);
  assert.equal(captures.some((capture) => capture.url === `${TEST_BASE_URL}/api/farmos-core/crop-cycles?limit=100`), true);
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
    const url = String(input);
    const envelope = envelopeForUrl(url);
    if (url.includes("/inventory-summary")) {
      envelope.records = [{ ...inventoryRecords[0], price_per_unit: 100 }];
    }
    return new Response(JSON.stringify(envelope), { status: 200 });
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
    const url = String(input);
    const envelope = envelopeForUrl(url);
    if (url.includes("/recent-work-logs")) {
      envelope.records = [{ ...workLogRecords[0], details: { worker_name: "restricted" } }];
    }
    return new Response(JSON.stringify(envelope), { status: 200 });
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
    const envelope = envelopeForUrl(String(input));
    if (Object.hasOwn(envelope, "recordCount")) envelope.recordCount = 99;
    else envelope.record_count = 99;

    return new Response(JSON.stringify(envelope), { status: 200 });
  };

  const badCount = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: badCountFetch,
  });

  assert.equal(badCount.result, "error");
  assert.equal(badCount.inventory.error_code, "invalid_response");
  assert.equal(badCount.work_log.error_code, "invalid_response");
  assert.equal(badCount.field?.error_code, "invalid_response");
  assert.equal(badCount.crop_cycle?.error_code, "invalid_response");

  const overrideFetch = (target: "fields" | "crop-cycles", mutate: (envelope: Record<string, unknown>) => void): typeof fetch => async (input) => {
    const url = String(input);
    const envelope = envelopeForUrl(url);
    if (url.includes(`/api/farmos-core/${target}`)) mutate(envelope);
    return new Response(JSON.stringify(envelope), { status: 200 });
  };

  const emptyDay122 = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: async (input) => {
      const url = String(input);
      const envelope = envelopeForUrl(url);
      if (url.includes("/fields") || url.includes("/crop-cycles")) {
        envelope.records = [];
        envelope.record_count = 0;
      }
      return new Response(JSON.stringify(envelope), { status: 200 });
    },
  });
  assert.equal(emptyDay122.field?.result, "ok");
  assert.equal(emptyDay122.field?.record_count, 0);
  assert.equal(emptyDay122.crop_cycle?.result, "ok");
  assert.equal(emptyDay122.crop_cycle?.record_count, 0);

  const fieldUnknownKey = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("fields", (envelope) => { (envelope.records as JsonRecord[])[0].unknown = true; }) });
  assert.equal(fieldUnknownKey.field?.error_code, "invalid_response");
  const fieldMissingKey = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("fields", (envelope) => { delete (envelope.records as JsonRecord[])[0].display_name; }) });
  assert.equal(fieldMissingKey.field?.error_code, "invalid_response");
  const fieldMalformedEnvelope = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("fields", (envelope) => { envelope.extra = true; }) });
  assert.equal(fieldMalformedEnvelope.field?.error_code, "invalid_response");

  const fieldContractMutations: Array<(envelope: JsonRecord) => void> = [
    (envelope) => { envelope.schema_version = "farmos.core.fields.read.v0"; },
    (envelope) => { envelope.source = "wrong_fields_source"; },
    (envelope) => { envelope.readOnly = false; },
    (envelope) => { (envelope.safety as JsonRecord).writePerformed = true; },
    (envelope) => { (envelope.safety as JsonRecord).restrictedFieldsExposed = true; },
    (envelope) => { ((envelope.records as JsonRecord[])[0]).reference = `${reference120}c`; },
    (envelope) => { ((envelope.records as JsonRecord[])[0]).reference = "field\nreference"; },
    (envelope) => { ((envelope.records as JsonRecord[])[1]).reference = (envelope.records as JsonRecord[])[0].reference; },
  ];
  for (const mutate of fieldContractMutations) {
    const rejected = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("fields", mutate) });
    assert.equal(rejected.field.error_code, "invalid_response");
    assert.equal(rejected.field.record_count, 0);
  }

  const referenceBoundaryAccepted = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: async (input) => {
      const url = String(input);
      const envelope = envelopeForUrl(url);
      if (url.includes("/fields")) (envelope.records as JsonRecord[])[0].reference = reference120;
      if (url.includes("/crop-cycles")) (envelope.records as JsonRecord[])[0].field_references = [reference120];
      return new Response(JSON.stringify(envelope), { status: 200 });
    },
  });
  assert.equal(referenceBoundaryAccepted.field.result, "ok");
  assert.equal(referenceBoundaryAccepted.crop_cycle.result, "ok");

  const duplicateFieldReference = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("crop-cycles", (envelope) => { (envelope.records as JsonRecord[])[0].field_references = ["field-reference-1", "field-reference-1"]; }) });
  assert.equal(duplicateFieldReference.crop_cycle?.error_code, "invalid_response");
  const invalidOperationalDate = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("crop-cycles", (envelope) => { (envelope.records as JsonRecord[])[0].operational_start_date = "2026-02-31"; }) });
  assert.equal(invalidOperationalDate.crop_cycle?.error_code, "invalid_response");
  const cropMissingKey = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("crop-cycles", (envelope) => { delete (envelope.records as JsonRecord[])[0].cycle_state; }) });
  assert.equal(cropMissingKey.crop_cycle?.error_code, "invalid_response");
  const cropContractMutations: Array<(envelope: JsonRecord) => void> = [
    (envelope) => { envelope.schema_version = "farmos.core.crop_cycles.read.v0"; },
    (envelope) => { envelope.source = "wrong_crop_cycle_source"; },
    (envelope) => { envelope.readOnly = false; },
    (envelope) => { (envelope.records as JsonRecord[])[1].reference = (envelope.records as JsonRecord[])[0].reference; },
    (envelope) => { (envelope.records as JsonRecord[])[0].reference = `${reference120}c`; },
    (envelope) => { (envelope.records as JsonRecord[])[0].field_references = ["field/reference"]; },
    (envelope) => { (envelope.records as JsonRecord[])[0].field_references = Array.from({ length: 101 }, (_, index) => `field-${index}`); },
  ];
  for (const mutate of cropContractMutations) {
    const rejected = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("crop-cycles", mutate) });
    assert.equal(rejected.crop_cycle.error_code, "invalid_response");
    assert.equal(rejected.crop_cycle.record_count, 0);
  }
  const orphanRelation = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: overrideFetch("crop-cycles", (envelope) => { (envelope.records as JsonRecord[])[0].field_references = ["field-reference-absent"]; }) });
  assert.equal(orphanRelation.crop_cycle?.error_code, "invalid_response");
  assert.equal(orphanRelation.crop_cycle?.record_count, 0);

  const unauthorized = await readHermesOperationalReadonlySources({ env: makeEnv(), fetchImpl: async () => new Response(null, { status: 401 }) });
  assert.equal(unauthorized.field?.error_code, "remote_http_error");
  assert.equal(unauthorized.crop_cycle?.error_code, "remote_http_error");

  const redirected = await readHermesOperationalReadonlySources({
    env: makeEnv(),
    fetchImpl: (async (input) => {
      const url = String(input);
      if (url.includes("/fields") || url.includes("/crop-cycles")) return { ok: true, redirected: true, status: 200, text: async () => JSON.stringify(envelopeForUrl(url)) } as Response;
      return new Response(JSON.stringify(envelopeForUrl(url)), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(redirected.field?.error_code, "remote_http_error");
  assert.equal(redirected.crop_cycle?.error_code, "remote_http_error");

  assert.equal(captures.filter((capture) => capture.url.includes("/fields?")).length, 1);
  assert.equal(captures.filter((capture) => capture.url.includes("/crop-cycles?")).length, 1);

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
