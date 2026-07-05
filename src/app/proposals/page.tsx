import Link from "next/link";
import { listProposalInboxReadModel } from "../../../scripts/app/api_boundary/proposal_inbox_read_api_boundary";
import {
  listProposalReviewLatestSummariesReadModel,
  type ProposalReviewLatestSummaryReadModel,
} from "../../../scripts/app/api_boundary/proposal_review_latest_summary_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function summarize(value: string | null | undefined, maxLength = 120): string {
  if (!value) return "-";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  if (value instanceof Date) return value.toISOString();
  return value;
}

function decisionLabel(decisionType: string | null | undefined): string {
  switch (decisionType) {
    case "approve_review":
      return "承認ログ";
    case "reject_review":
      return "却下ログ";
    case "request_revision":
      return "修正依頼ログ";
    case "defer_review":
      return "保留ログ";
    default:
      return "No review decision yet";
  }
}

function metadataPurpose(summary: ProposalReviewLatestSummaryReadModel): string {
  const purpose = summary.event_metadata?.["purpose"];
  return typeof purpose === "string" ? purpose : "-";
}

function LatestReviewDecisionSummary(props: {
  summary: ProposalReviewLatestSummaryReadModel | undefined;
}) {
  const summary = props.summary;

  if (!summary || !summary.latest_event_id) {
    return <span>No review decision yet</span>;
  }

  return (
    <div>
      <strong>{decisionLabel(summary.decision_type)}</strong>
      <br />
      <code>{summary.decision_type}</code>
      <dl>
        <dt>latest_event_id</dt>
        <dd>
          <code>{summary.latest_event_id}</code>
        </dd>
        <dt>decided_at</dt>
        <dd>{formatDate(summary.decided_at)}</dd>
        <dt>decided_by</dt>
        <dd>{summary.decided_by ?? "-"}</dd>
        <dt>decision_source</dt>
        <dd>{summary.decision_source ?? "-"}</dd>
        <dt>decision_note</dt>
        <dd>{summarize(summary.decision_note, 96)}</dd>
        <dt>event_metadata.purpose</dt>
        <dd>{metadataPurpose(summary)}</dd>
      </dl>
    </div>
  );
}

export default async function ProposalsPage() {
  const [model, latestSummaryModel] = await Promise.all([
    listProposalInboxReadModel(),
    listProposalReviewLatestSummariesReadModel(),
  ]);

  if (model.result === "error") {
    return (
      <main>
        <p>
          <Link href="/">← Home</Link>
        </p>
        <h1>AI Proposal Inbox</h1>
        <p>read-only</p>
        <section>
          <h2>Boundary error</h2>
          <pre>{model.error}</pre>
        </section>
      </main>
    );
  }

  const latestSummariesByProposalId =
    latestSummaryModel.result === "ok"
      ? new Map(
          latestSummaryModel.proposals.map((summary) => [
            summary.proposal_id,
            summary,
          ]),
        )
      : new Map<string, ProposalReviewLatestSummaryReadModel>();

  return (
    <main>
      <p>
        <Link href="/">← Home</Link>
      </p>

      <h1>AI Proposal Inbox</h1>
      <p>
        read-only UI foundation. No approve, reject, apply, archive, edit, or
        mutation controls.
      </p>
      <p>
        <Link href="/proposals/apply-history">
          View committed apply history
        </Link>
      </p>

      <section>
        <h2>Summary</h2>
        <dl>
          <dt>proposal_count</dt>
          <dd>{model.proposals.length}</dd>
          <dt>latest_review_summary_result</dt>
          <dd>{latestSummaryModel.result}</dd>
          <dt>writes_performed</dt>
          <dd>{String(model.read_boundary.writes_performed)}</dd>
          <dt>transaction_read_only</dt>
          <dd>{String(model.read_boundary.transaction_read_only)}</dd>
          <dt>app_schema_write_allowed</dt>
          <dd>{String(model.read_boundary.app_schema_write_allowed)}</dd>
        </dl>
      </section>

      {latestSummaryModel.result === "error" ? (
        <section>
          <h2>Latest review decision summary boundary error</h2>
          <pre>{latestSummaryModel.message}</pre>
        </section>
      ) : null}

      {model.proposals.length === 0 ? (
        <section>
          <h2>Empty state</h2>
          <p>No proposals are currently available in ai.proposal_inbox.</p>
        </section>
      ) : (
        <section>
          <h2>Proposals</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Agent</th>
                <th>Latest review decision</th>
                <th>Created</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {model.proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td>
                    <code>{proposal.id}</code>
                  </td>
                  <td>{proposal.proposal_type}</td>
                  <td>
                    <strong>{proposal.title}</strong>
                    <br />
                    <span>{summarize(proposal.body)}</span>
                  </td>
                  <td>{proposal.status}</td>
                  <td>{proposal.risk_level}</td>
                  <td>{proposal.confidence ?? "-"}</td>
                  <td>{proposal.agent_name ?? "-"}</td>
                  <td>
                    <LatestReviewDecisionSummary
                      summary={latestSummariesByProposalId.get(proposal.id)}
                    />
                  </td>
                  <td>{proposal.created_at}</td>
                  <td>
                    <Link href={`/proposals/${proposal.id}`}>view</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2>Proposal inbox read boundary</h2>
        <pre>{JSON.stringify(model.read_boundary, null, 2)}</pre>
      </section>

      {latestSummaryModel.result === "ok" ? (
        <section>
          <h2>Latest review summary read boundary</h2>
          <pre>{JSON.stringify(latestSummaryModel.boundary, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
