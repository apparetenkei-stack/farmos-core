import Link from "next/link";
import { showCropCycleProvenanceReadModel } from "../../../../scripts/app/api_boundary/crop_cycle_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

type PageProps = {
  params:
    | Promise<{
        cropCycleId: string;
      }>
    | {
        cropCycleId: string;
      };
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function display(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isTrue(value: unknown): boolean {
  return value === true || value === "true";
}

function isFalse(value: unknown): boolean {
  return value === false || value === "false";
}

function pick(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return null;
}

function KeyValueTable({
  title,
  record,
  keys
}: {
  title: string;
  record: UnknownRecord;
  keys: string[];
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            {keys.map((key) => (
              <tr key={key}>
                <th>{key}</th>
                <td>{display(record[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FactsTable({ facts }: { facts: UnknownRecord[] }) {
  return (
    <section className="panel">
      <h2>Facts</h2>
      <p>
        表示対象は <code>verified=true</code> かつ <code>rejected=false</code> のFactのみです。
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>fact_type</th>
              <th>fact_value_text</th>
              <th>verified</th>
              <th>verified_by</th>
              <th>rejected</th>
            </tr>
          </thead>
          <tbody>
            {facts.map((fact, index) => (
              <tr key={display(fact.id ?? index)}>
                <td>{display(fact.id)}</td>
                <td>{display(fact.fact_type)}</td>
                <td>{display(fact.fact_value_text)}</td>
                <td>{display(fact.verified)}</td>
                <td>{display(fact.verified_by)}</td>
                <td>{display(fact.rejected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function CropCycleDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const cropCycleId = resolvedParams.cropCycleId;

  const model = await showCropCycleProvenanceReadModel({
    cropCycleId
  } as any);

  const root = asRecord(model);
  const result = String(root.result ?? "unknown");

  if (result === "not_found") {
    return (
      <div className="grid">
        <section className="panel">
          <span className="readonly-badge">read-only</span>
          <h1>Crop Cycle not_found</h1>
          <p>result: not_found</p>
          <p>crop_cycle_id: {display(cropCycleId)}</p>
          <p>
            <Link href="/crop-cycles">一覧へ戻る</Link>
          </p>
        </section>
      </div>
    );
  }

  if (result !== "ok") {
    return (
      <div className="grid">
        <section className="panel">
          <span className="readonly-badge">read-only</span>
          <h1>Crop Cycle read error</h1>
          <p className="warning">result: {result}</p>
          <p>crop_cycle_id: {display(cropCycleId)}</p>
          <p>
            <Link href="/crop-cycles">一覧へ戻る</Link>
          </p>
          <pre>{JSON.stringify(model, null, 2)}</pre>
        </section>
      </div>
    );
  }

  const detail = asRecord(root.detail ?? root.data ?? root);

  const cropCycle = asRecord(
    detail.crop_cycle ?? detail.cropCycle ?? root.crop_cycle ?? root.cropCycle
  );
  const sourceDocument = asRecord(
    detail.source_document ??
      detail.sourceDocument ??
      root.source_document ??
      root.sourceDocument
  );
  const documentExtraction = asRecord(
    detail.document_extraction ??
      detail.documentExtraction ??
      root.document_extraction ??
      root.documentExtraction
  );
  const projectionCandidate = asRecord(
    detail.projection_candidate ??
      detail.projectionCandidate ??
      root.projection_candidate ??
      root.projectionCandidate
  );
  const applyPlan = asRecord(
    detail.apply_plan ?? detail.applyPlan ?? root.apply_plan ?? root.applyPlan
  );
  const trace = asRecord(detail.trace ?? root.trace);
  const readBoundary = asRecord(
    root.read_boundary ??
      detail.read_boundary ??
      root.readBoundary ??
      detail.readBoundary ??
      root.boundary
  );

  const rawFacts = asArray(
    detail.facts ??
      detail.extracted_facts ??
      detail.verified_facts ??
      root.facts ??
      root.extracted_facts ??
      root.verified_facts
  ).map(asRecord);

  const facts = rawFacts.filter(
    (fact) => isTrue(fact.verified) && isFalse(fact.rejected)
  );

  const traceRecord =
    Object.keys(trace).length > 0
      ? trace
      : {
          business_truth_table: "app.crop_cycles",
          business_truth_id: pick(cropCycle, ["crop_cycle_id", "id"]),
          source_document_id: sourceDocument.id ?? cropCycle.source_document_id,
          document_extraction_id:
            documentExtraction.id ?? cropCycle.document_extraction_id,
          source_extracted_fact_ids: cropCycle.source_extracted_fact_ids,
          source_projection_candidate_id:
            projectionCandidate.id ?? cropCycle.source_projection_candidate_id,
          source_apply_plan_id: applyPlan.id ?? cropCycle.source_apply_plan_id
        };

  return (
    <div className="grid">
      <section className="panel">
        <span className="readonly-badge">read-only</span>
        <h1>Crop Cycle Provenance Detail</h1>
        <p>
          Day21の <code>showCropCycleProvenanceReadModel()</code> を使用した読み取り専用detailです。
          Day22 UIでは <code>includeRawText=true</code> を使用しません。
        </p>
        <p>
          <Link href="/crop-cycles">一覧へ戻る</Link>
        </p>
      </section>

      <KeyValueTable
        title="Crop Cycle"
        record={cropCycle}
        keys={[
          "crop_cycle_id",
          "id",
          "season_year",
          "crop",
          "variety",
          "field_name",
          "sowing_date_text",
          "transplant_date_text",
          "archived",
          "created_by",
          "created_by_role",
          "source_extracted_fact_ids"
        ]}
      />

      <KeyValueTable
        title="Source Document"
        record={sourceDocument}
        keys={["id", "title", "ocr_status"]}
      />

      <KeyValueTable
        title="Document Extraction"
        record={documentExtraction}
        keys={["id", "status", "is_current", "extracted_text_length"]}
      />

      <FactsTable facts={facts} />

      <KeyValueTable
        title="Projection Candidate"
        record={projectionCandidate}
        keys={[
          "id",
          "status",
          "reviewed",
          "rejected",
          "approved_for_app_projection"
        ]}
      />

      <KeyValueTable
        title="Apply Plan"
        record={applyPlan}
        keys={[
          "id",
          "readiness_status",
          "status",
          "reviewed",
          "rejected",
          "approved_for_app_apply",
          "missing_fields"
        ]}
      />

      <KeyValueTable
        title="Trace"
        record={traceRecord}
        keys={[
          "business_truth_table",
          "business_truth_id",
          "source_document_id",
          "document_extraction_id",
          "source_extracted_fact_ids",
          "source_projection_candidate_id",
          "source_apply_plan_id"
        ]}
      />

      <KeyValueTable
        title="Read Boundary"
        record={readBoundary}
        keys={[
          "mode",
          "db_user",
          "transaction_read_only",
          "writes_performed",
          "app_schema_write_allowed",
          "raw_text_included"
        ]}
      />
    </div>
  );
}
