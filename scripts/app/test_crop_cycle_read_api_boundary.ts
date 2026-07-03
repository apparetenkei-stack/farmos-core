import {
  listCropCycleReadModel,
  showCropCycleProvenanceReadModel,
} from "./api_boundary/crop_cycle_read_api_boundary";

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function hasOwnProperty(target: unknown, propertyName: string): boolean {
  return (
    typeof target === "object" &&
    target !== null &&
    Object.prototype.hasOwnProperty.call(target, propertyName)
  );
}

async function main(): Promise<void> {
  const listResult = await listCropCycleReadModel();

  assertCondition(listResult.result === "ok", "list result must be ok");
  assertCondition(listResult.count === 1, "list count must be 1");
  assertCondition(
    listResult.read_boundary.writes_performed === false,
    "list writes_performed must be false",
  );
  assertCondition(
    listResult.read_boundary.app_schema_write_allowed === false,
    "list app_schema_write_allowed must be false",
  );

  const detailResult = await showCropCycleProvenanceReadModel({
    cropCycleId: 2,
  });

  assertCondition(detailResult.result === "ok", "detail result must be ok");

  if (detailResult.result !== "ok") {
    throw new Error("detail result must be ok");
  }

  assertCondition(
    detailResult.crop_cycle.crop_cycle_id === 2,
    "detail crop_cycle_id must be 2",
  );

  assertCondition(
    JSON.stringify(detailResult.crop_cycle.source_extracted_fact_ids) ===
      JSON.stringify([4, 5, 6, 7, 8, 9]),
    "detail source_extracted_fact_ids must be 4..9",
  );

  assertCondition(
    JSON.stringify(detailResult.facts.map((fact) => fact.id)) ===
      JSON.stringify([4, 5, 6, 7, 8, 9]),
    "detail facts must be 4..9",
  );

  assertCondition(
    detailResult.read_boundary.raw_text_included === false,
    "default raw_text_included must be false",
  );

  assertCondition(
    !hasOwnProperty(detailResult.document_extraction, "extracted_text"),
    "default document_extraction must not include extracted_text",
  );

  assertCondition(
    detailResult.read_boundary.writes_performed === false,
    "detail writes_performed must be false",
  );

  assertCondition(
    detailResult.read_boundary.app_schema_write_allowed === false,
    "detail app_schema_write_allowed must be false",
  );

  const detailWithRawTextResult = await showCropCycleProvenanceReadModel({
    cropCycleId: 2,
    includeRawText: true,
  });

  assertCondition(
    detailWithRawTextResult.result === "ok",
    "detail includeRawText result must be ok",
  );

  if (detailWithRawTextResult.result !== "ok") {
    throw new Error("detail includeRawText result must be ok");
  }

  assertCondition(
    detailWithRawTextResult.read_boundary.raw_text_included === true,
    "includeRawText raw_text_included must be true",
  );

  assertCondition(
    hasOwnProperty(
      detailWithRawTextResult.document_extraction,
      "extracted_text",
    ),
    "includeRawText document_extraction must include extracted_text",
  );

  const notFoundResult = await showCropCycleProvenanceReadModel({
    cropCycleId: 999999,
  });

  assertCondition(
    notFoundResult.result === "not_found",
    "not_found result must be not_found",
  );

  const badRequestResult = await showCropCycleProvenanceReadModel({
    cropCycleId: 0,
  });

  assertCondition(
    badRequestResult.result === "error",
    "bad_request result must be error",
  );

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          list_result: listResult.result,
          list_count: listResult.count,
          detail_result: detailResult.result,
          detail_crop_cycle_id: detailResult.crop_cycle.crop_cycle_id,
          detail_fact_ids: detailResult.facts.map((fact) => fact.id),
          detail_raw_text_included:
            detailResult.read_boundary.raw_text_included,
          default_extracted_text_present: hasOwnProperty(
            detailResult.document_extraction,
            "extracted_text",
          ),
          include_raw_text_result: detailWithRawTextResult.result,
          include_raw_text_present: hasOwnProperty(
            detailWithRawTextResult.document_extraction,
            "extracted_text",
          ),
          not_found_result: notFoundResult.result,
          bad_request_result: badRequestResult.result,
          writes_performed: detailResult.read_boundary.writes_performed,
          app_schema_write_allowed:
            detailResult.read_boundary.app_schema_write_allowed,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exit(1);
});
