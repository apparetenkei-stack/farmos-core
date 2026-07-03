import Link from "next/link";
import { listProposalInboxReadModel } from "../../../scripts/app/api_boundary/proposal_inbox_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function summarize(value: string, maxLength = 120): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

export default async function ProposalsPage() {
  const model = await listProposalInboxReadModel();

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

  return (
    <main>
      <p>
        <Link href="/">← Home</Link>
      </p>

      <h1>AI Proposal Inbox</h1>
      <p>read-only UI foundation. No approve, reject, apply, archive, edit, or mutation controls.</p>

      <section>
        <h2>Summary</h2>
        <dl>
          <dt>proposal_count</dt>
          <dd>{model.proposals.length}</dd>
          <dt>writes_performed</dt>
          <dd>{String(model.read_boundary.writes_performed)}</dd>
          <dt>transaction_read_only</dt>
          <dd>{String(model.read_boundary.transaction_read_only)}</dd>
          <dt>app_schema_write_allowed</dt>
          <dd>{String(model.read_boundary.app_schema_write_allowed)}</dd>
        </dl>
      </section>

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
        <h2>Read boundary</h2>
        <pre>{JSON.stringify(model.read_boundary, null, 2)}</pre>
      </section>
    </main>
  );
}
