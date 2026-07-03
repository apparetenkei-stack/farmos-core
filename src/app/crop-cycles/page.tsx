import Link from "next/link";
import { listCropCycleReadModel } from "../../../scripts/app/api_boundary/crop_cycle_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pick(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return null;
}

function display(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ReadBoundaryTable({ boundary }: { boundary: UnknownRecord }) {
  const rows = [
    ["mode", boundary.mode],
    ["db_user", boundary.db_user],
    ["transaction_read_only", boundary.transaction_read_only],
    ["writes_performed", boundary.writes_performed],
    ["app_schema_write_allowed", boundary.app_schema_write_allowed]
  ];

  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={String(label)}>
              <th>{String(label)}</th>
              <td>{display(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CropCyclesPage() {
  const model = await listCropCycleReadModel();
  const root = asRecord(model);
  const result = String(root.result ?? "unknown");

  const rows = asArray(
    root.crop_cycles ?? root.cropCycles ?? root.rows ?? root.items ?? root.data
  ).map(asRecord);

  const readBoundary = asRecord(
    root.read_boundary ?? root.readBoundary ?? root.boundary
  );

  return (
    <div className="grid">
      <section className="panel">
        <span className="readonly-badge">read-only</span>
        <h1>Crop Cycles</h1>
        <p>
          Day21の <code>listCropCycleReadModel()</code> を使用した読み取り専用一覧です。
          編集・archive・approve・reject操作はありません。
        </p>
        <p>
          <Link href="/">ホームへ戻る</Link>
        </p>
      </section>

      {result !== "ok" ? (
        <section className="panel">
          <h2>Read result</h2>
          <p className="warning">result: {result}</p>
          <pre>{JSON.stringify(model, null, 2)}</pre>
        </section>
      ) : (
        <section className="panel">
          <h2>Crop Cycle List</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>crop_cycle_id</th>
                  <th>season_year</th>
                  <th>crop</th>
                  <th>variety</th>
                  <th>field_name</th>
                  <th>sowing_date_text</th>
                  <th>transplant_date_text</th>
                  <th>source_document_title</th>
                  <th>apply_plan_status</th>
                  <th>approved_for_app_apply</th>
                  <th>archived</th>
                  <th>detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const cropCycleId = pick(row, ["crop_cycle_id", "id"]);
                  return (
                    <tr key={display(cropCycleId ?? index)}>
                      <td>{display(cropCycleId)}</td>
                      <td>{display(pick(row, ["season_year"]))}</td>
                      <td>{display(pick(row, ["crop"]))}</td>
                      <td>{display(pick(row, ["variety"]))}</td>
                      <td>{display(pick(row, ["field_name"]))}</td>
                      <td>{display(pick(row, ["sowing_date_text"]))}</td>
                      <td>{display(pick(row, ["transplant_date_text"]))}</td>
                      <td>{display(pick(row, ["source_document_title"]))}</td>
                      <td>{display(pick(row, ["apply_plan_status"]))}</td>
                      <td>{display(pick(row, ["approved_for_app_apply"]))}</td>
                      <td>{display(pick(row, ["archived"]))}</td>
                      <td>
                        {cropCycleId ? (
                          <Link href={`/crop-cycles/${String(cropCycleId)}`}>
                            detail
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Read Boundary</h2>
        <ReadBoundaryTable boundary={readBoundary} />
      </section>
    </div>
  );
}
