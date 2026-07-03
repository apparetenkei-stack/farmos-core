import Link from "next/link";
import { showProposalInboxReadModel } from "../../../../scripts/app/api_boundary/proposal_inbox_read_api_boundary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProposalDetailPageProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

function JsonBlock(props: { value: unknown }) {
  return <pre>{JSON.stringify(props.value, null, 2)}</pre>;
}

export default async function ProposalDetailPage(props: ProposalDetailPageProps) {
  const { proposalId } = await props.params;
  const model = await showProposalInboxReadModel({ proposalId });

  if (model.result === "bad_request") {
    return (
      <main>
        <p>
          <Link href="/proposals">← AI Proposal Inbox</Link>
        </p>
        <h1>AI Proposal detail</h1>
        <p>read-only</p>
        <section>
          <h2>Bad request</h2>
          <dl>
            <dt>result</dt>
            <dd>{model.result}</dd>
            <dt>proposal_id</dt>
            <dd>
              <code>{model.proposal_id}</code>
            </dd>
            <dt>error</dt>
            <dd>{model.error}</dd>
          </dl>
        </section>
      </main>
    );
  }

  if (model.result === "not_found") {
    return (
      <main>
        <p>
          <Link href="/proposals">← AI Proposal Inbox</Link>
        </p>
        <h1>AI Proposal detail</h1>
        <p>read-only</p>
        <section>
          <h2>Not found</h2>
          <dl>
            <dt>result</dt>
            <dd>{model.result}</dd>
            <dt>proposal_id</dt>
            <dd>
              <code>{model.proposal_id}</code>
            </dd>
          </dl>
        </section>
        <section>
          <h2>Read boundary</h2>
          <JsonBlock value={model.read_boundary} />
        </section>
      </main>
    );
  }

  if (model.result === "error") {
    return (
      <main>
        <p>
          <Link href="/proposals">← AI Proposal Inbox</Link>
        </p>
        <h1>AI Proposal detail</h1>
        <p>read-only</p>
        <section>
          <h2>Boundary error</h2>
          <pre>{model.error}</pre>
        </section>
      </main>
    );
  }

  const proposal = model.proposal;

  return (
    <main>
      <p>
        <Link href="/proposals">← AI Proposal Inbox</Link>
      </p>

      <h1>AI Proposal detail</h1>
      <p>read-only detail view. No approve, reject, apply, archive, edit, or mutation controls.</p>

      <section>
        <h2>{proposal.title}</h2>
        <dl>
          <dt>ID</dt>
          <dd>
            <code>{proposal.id}</code>
          </dd>
          <dt>proposal_type</dt>
          <dd>{proposal.proposal_type}</dd>
          <dt>status</dt>
          <dd>{proposal.status}</dd>
          <dt>risk_level</dt>
          <dd>{proposal.risk_level}</dd>
          <dt>confidence</dt>
          <dd>{proposal.confidence ?? "-"}</dd>
          <dt>model_name</dt>
          <dd>{proposal.model_name ?? "-"}</dd>
          <dt>agent_name</dt>
          <dd>{proposal.agent_name ?? "-"}</dd>
          <dt>created_at</dt>
          <dd>{proposal.created_at}</dd>
          <dt>updated_at</dt>
          <dd>{proposal.updated_at}</dd>
          <dt>reviewed_by</dt>
          <dd>{proposal.reviewed_by ?? "-"}</dd>
          <dt>reviewed_at</dt>
          <dd>{proposal.reviewed_at ?? "-"}</dd>
          <dt>applied_by</dt>
          <dd>{proposal.applied_by ?? "-"}</dd>
          <dt>applied_at</dt>
          <dd>{proposal.applied_at ?? "-"}</dd>
        </dl>
      </section>

      <section>
        <h2>Body</h2>
        <p>{proposal.body}</p>
      </section>

      <section>
        <h2>Reason</h2>
        <p>{proposal.reason ?? "-"}</p>
      </section>

      <section>
        <h2>Review note</h2>
        <p>{proposal.review_note ?? "-"}</p>
      </section>

      <section>
        <h2>payload_json</h2>
        <JsonBlock value={proposal.payload_json} />
      </section>

      <section>
        <h2>source_refs_json</h2>
        <JsonBlock value={proposal.source_refs_json} />
      </section>

      <section>
        <h2>Read boundary</h2>
        <JsonBlock value={model.read_boundary} />
      </section>
    </main>
  );
}
