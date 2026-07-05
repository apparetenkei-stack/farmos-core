import Link from "next/link";
import { ReviewCommandPreviewSection } from "./ReviewCommandPreviewSection";
import { showProposalInboxReadModel } from "../../../../scripts/app/api_boundary/proposal_inbox_read_api_boundary";
import {
  listProposalReviewDecisionEventsReadModel,
  type ProposalReviewDecisionEventReadModel,
} from "../../../../scripts/app/api_boundary/proposal_review_decision_read_api_boundary";
import {
  readProposalReviewApplyHistory,
  type ProposalReviewApplyHistoryRow,
} from "../../../../scripts/app/api_boundary/proposal_review_apply_history_read_api_boundary";

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


function formatBoolean(value: boolean): string {
  return value ? "true" : "false";
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

function ApplyHistoryEventDetail(props: {
  event: ProposalReviewApplyHistoryRow;
}) {
  const event = props.event;

  return (
    <dl>
      <dt>event_id</dt>
      <dd><code>{event.id}</code></dd>
      <dt>proposal_id</dt>
      <dd><code>{event.proposalId}</code></dd>
      <dt>proposal_status</dt>
      <dd>{event.proposalStatus ?? "-"}</dd>
      <dt>proposal_title</dt>
      <dd>{event.proposalTitle ?? "-"}</dd>
      <dt>apply_operation</dt>
      <dd>
        <strong>{applyOperationLabel(event.applyOperation)}</strong>
        <br />
        <code>{event.applyOperation}</code>
      </dd>
      <dt>result</dt>
      <dd>{event.result}</dd>
      <dt>committed</dt>
      <dd><code>{formatBoolean(event.committed)}</code></dd>
      <dt>dry_run</dt>
      <dd><code>{formatBoolean(event.dryRun)}</code></dd>
      <dt>app_projection_apply_performed</dt>
      <dd><code>{formatBoolean(event.appProjectionApplyPerformed)}</code></dd>
      <dt>ai_proposal_apply_marker_updated</dt>
      <dd><code>{formatBoolean(event.aiProposalApplyMarkerUpdated)}</code></dd>
      <dt>inserted_crop_cycle_id</dt>
      <dd>
        {event.insertedCropCycleId === null ? (
          "-"
        ) : (
          <Link href={`/crop-cycles/${event.insertedCropCycleId}`}>
            <code>{event.insertedCropCycleId}</code>
          </Link>
        )}
      </dd>
      <dt>applied_by</dt>
      <dd>{event.appliedBy}</dd>
      <dt>applied_by_role</dt>
      <dd>{event.appliedByRole}</dd>
      <dt>apply_source</dt>
      <dd>{event.applySource}</dd>
      <dt>created_at</dt>
      <dd>{event.createdAt}</dd>
      <dt>event_metadata</dt>
      <dd><JsonBlock value={event.eventMetadata} /></dd>
    </dl>
  );
}

function ApplyHistoryTimeline(props: {
  history: ProposalReviewApplyHistoryRow[];
}) {
  if (props.history.length === 0) {
    return <p>No committed apply history.</p>;
  }

  return (
    <ol>
      {props.history.map((event, index) => (
        <li key={event.id}>
          <article>
            <h4>
              #{index + 1} {applyOperationLabel(event.applyOperation)} /{" "}
              <code>{event.applyOperation}</code>
            </h4>
            <p>
              created_at: <code>{event.createdAt}</code>
            </p>
            <ApplyHistoryEventDetail event={event} />
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
  const applyHistoryModel = await readProposalReviewApplyHistory({
    proposalId: proposal.id,
    limit: 50,
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
        <h2>Apply History Events</h2>
        <p>
          Apply history is read-only observability for committed apply events.
          Dry-run previews are not persisted here. No apply controls are exposed
          from this page.
        </p>

        {applyHistoryModel.result === "ok" ? (
          <>
            <section>
              <h3>Committed apply timeline</h3>
              <p>Newest events are shown first.</p>
              <ApplyHistoryTimeline history={applyHistoryModel.history} />
            </section>

            <section>
              <h3>Apply history read boundary</h3>
              <JsonBlock value={applyHistoryModel.boundary} />
            </section>
          </>
        ) : (
          <section>
            <h3>Apply history boundary error</h3>
            <dl>
              <dt>result</dt>
              <dd>{applyHistoryModel.result}</dd>
              <dt>error</dt>
              <dd>{applyHistoryModel.error}</dd>
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
      <ReviewCommandPreviewSection proposalId={proposalId} />
    </main>
  );
}
