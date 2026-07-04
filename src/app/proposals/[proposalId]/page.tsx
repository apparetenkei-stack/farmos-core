import Link from "next/link";
import { showProposalInboxReadModel } from "../../../../scripts/app/api_boundary/proposal_inbox_read_api_boundary";
import {
  listProposalReviewDecisionEventsReadModel,
  type ProposalReviewDecisionEventReadModel,
} from "../../../../scripts/app/api_boundary/proposal_review_decision_read_api_boundary";

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

function decisionLabel(decisionType: string): string {
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
      return "Review decision log";
  }
}

function ReviewDecisionEventDetail(props: {
  event: ProposalReviewDecisionEventReadModel;
}) {
  const event = props.event;

  return (
    <dl>
      <dt>event_id</dt>
      <dd>
        <code>{event.id}</code>
      </dd>
      <dt>proposal_id</dt>
      <dd>
        <code>{event.proposal_id}</code>
      </dd>
      <dt>decision_type</dt>
      <dd>
        <strong>{decisionLabel(event.decision_type)}</strong>
        <br />
        <code>{event.decision_type}</code>
      </dd>
      <dt>decision_note</dt>
      <dd>{event.decision_note ?? "-"}</dd>
      <dt>decided_by</dt>
      <dd>{event.decided_by}</dd>
      <dt>decided_by_role</dt>
      <dd>{event.decided_by_role}</dd>
      <dt>decision_source</dt>
      <dd>{event.decision_source}</dd>
      <dt>decided_at</dt>
      <dd>{event.decided_at}</dd>
      <dt>created_at</dt>
      <dd>{event.created_at}</dd>
      <dt>event_metadata</dt>
      <dd>
        <JsonBlock value={event.event_metadata} />
      </dd>
    </dl>
  );
}

function LatestReviewDecisionCard(props: {
  event: ProposalReviewDecisionEventReadModel;
}) {
  const event = props.event;

  return (
    <article>
      <h4>
        {decisionLabel(event.decision_type)} / <code>{event.decision_type}</code>
      </h4>
      <p>
        This is the latest audit-only review decision. It does not apply proposal
        changes to app data.
      </p>
      <ReviewDecisionEventDetail event={event} />
    </article>
  );
}

function ReviewDecisionTimeline(props: {
  events: ProposalReviewDecisionEventReadModel[];
}) {
  if (props.events.length === 0) {
    return <p>No review decision events recorded yet.</p>;
  }

  return (
    <ol>
      {props.events.map((event, index) => (
        <li key={event.id}>
          <article>
            <h4>
              #{index + 1} {decisionLabel(event.decision_type)} /{" "}
              <code>{event.decision_type}</code>
            </h4>
            <p>
              decided_at: <code>{event.decided_at}</code>
            </p>
            <ReviewDecisionEventDetail event={event} />
          </article>
        </li>
      ))}
    </ol>
  );
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
  const reviewModel = await listProposalReviewDecisionEventsReadModel({
    proposalId: proposal.id,
  });

  return (
    <main>
      <p>
        <Link href="/proposals">← AI Proposal Inbox</Link>
      </p>
      <h1>AI Proposal detail</h1>
      <p>
        read-only detail view. No approve, reject, apply, archive, edit, or
        mutation controls.
      </p>

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
        <h2>Review Decision Events</h2>
        <p>
          Review decisions are append-only audit events. They do not apply
          proposal changes to app data and do not update ai.proposal_inbox
          review/apply fields.
        </p>

        {reviewModel.result === "ok" ? (
          <>
            <section>
              <h3>Latest review decision</h3>
              {reviewModel.latest ? (
                <LatestReviewDecisionCard event={reviewModel.latest} />
              ) : (
                <p>No review decision events recorded yet.</p>
              )}
            </section>

            <section>
              <h3>Review decision timeline</h3>
              <p>Newest events are shown first.</p>
              <ReviewDecisionTimeline events={reviewModel.events} />
            </section>

            <section>
              <h3>Review decision history</h3>
              <JsonBlock value={reviewModel.events} />
            </section>

            <section>
              <h3>Review decision read boundary</h3>
              <JsonBlock value={reviewModel.boundary} />
            </section>
          </>
        ) : (
          <section>
            <h3>Review decision boundary error</h3>
            <dl>
              <dt>result</dt>
              <dd>{reviewModel.result}</dd>
              <dt>reason</dt>
              <dd>{reviewModel.reason}</dd>
            </dl>
          </section>
        )}
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
        <h2>Proposal inbox read boundary</h2>
        <JsonBlock value={model.read_boundary} />
      </section>
    </main>
  );
}
