import Link from "next/link";
import {
  readProposalReviewApplyHistory,
  type ProposalReviewApplyHistoryRow,
} from "../../../../scripts/app/api_boundary/proposal_review_apply_history_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatBoolean(value: boolean): string {
  return value ? "true" : "false";
}

function formatNullableNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function applyOperationLabel(
  operation: ProposalReviewApplyHistoryRow["applyOperation"],
): string {
  switch (operation) {
    case "insert_candidate":
      return "Inserted app projection";
    case "no_op_candidate":
      return "No-op apply marker update";
    default:
      return "Unknown apply operation";
  }
}

function ApplyOperationBadge(props: {
  operation: ProposalReviewApplyHistoryRow["applyOperation"];
}) {
  return (
    <span>
      <strong>{applyOperationLabel(props.operation)}</strong>
      <br />
      <code>{props.operation}</code>
    </span>
  );
}

function ApplyHistoryTable(props: {
  history: ProposalReviewApplyHistoryRow[];
}) {
  if (props.history.length === 0) {
    return <p>No committed apply history.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>created_at</th>
          <th>proposal</th>
          <th>status</th>
          <th>apply_operation</th>
          <th>result</th>
          <th>inserted_crop_cycle_id</th>
          <th>applied_by</th>
          <th>applied_by_role</th>
          <th>apply_source</th>
          <th>flags</th>
        </tr>
      </thead>
      <tbody>
        {props.history.map((event) => (
          <tr key={event.id}>
            <td>{event.createdAt}</td>
            <td>
              <Link href={`/proposals/${event.proposalId}`}>
                <code>{event.proposalId}</code>
              </Link>
              <br />
              <strong>{event.proposalTitle ?? "-"}</strong>
            </td>
            <td>{event.proposalStatus ?? "-"}</td>
            <td>
              <ApplyOperationBadge operation={event.applyOperation} />
            </td>
            <td>{event.result}</td>
            <td>{formatNullableNumber(event.insertedCropCycleId)}</td>
            <td>{event.appliedBy}</td>
            <td>{event.appliedByRole}</td>
            <td>{event.applySource}</td>
            <td>
              <dl>
                <dt>committed</dt>
                <dd><code>{formatBoolean(event.committed)}</code></dd>
                <dt>dry_run</dt>
                <dd><code>{formatBoolean(event.dryRun)}</code></dd>
                <dt>app_projection_apply_performed</dt>
                <dd><code>{formatBoolean(event.appProjectionApplyPerformed)}</code></dd>
                <dt>ai_proposal_apply_marker_updated</dt>
                <dd><code>{formatBoolean(event.aiProposalApplyMarkerUpdated)}</code></dd>
              </dl>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ProposalReviewApplyHistoryPage() {
  const model = await readProposalReviewApplyHistory({ limit: 100 });

  return (
    <main>
      <p>
        <Link href="/proposals">← AI Proposal Inbox</Link>
      </p>

      <h1>Proposal Review Apply History</h1>
      <p>
        read-only observability UI. This page lists committed apply events only.
        Dry-run previews are intentionally not stored in this history.
      </p>

      <section>
        <h2>Safety boundary</h2>
        {model.result === "ok" ? (
          <dl>
            <dt>history_count</dt>
            <dd>{model.history.length}</dd>
            <dt>transaction_read_only</dt>
            <dd><code>{formatBoolean(model.boundary.transaction_read_only)}</code></dd>
            <dt>writes_performed</dt>
            <dd><code>{formatBoolean(model.boundary.writes_performed)}</code></dd>
            <dt>commands_executed</dt>
            <dd><code>{formatBoolean(model.boundary.commands_executed)}</code></dd>
          </dl>
        ) : (
          <dl>
            <dt>result</dt>
            <dd>{model.result}</dd>
            <dt>error</dt>
            <dd>{model.error}</dd>
            <dt>transaction_read_only</dt>
            <dd><code>{formatBoolean(model.boundary.transaction_read_only)}</code></dd>
          </dl>
        )}
      </section>

      <section>
        <h2>Committed apply history</h2>
        {model.result === "ok" ? (
          <ApplyHistoryTable history={model.history} />
        ) : (
          <p>Apply history unavailable.</p>
        )}
      </section>

      {model.result === "ok" ? (
        <section>
          <h2>Raw read boundary</h2>
          <pre>{JSON.stringify(model.boundary, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
