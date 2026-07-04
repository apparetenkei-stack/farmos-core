import { getProposalReviewCommandPreviewReadModel } from "../../../../scripts/app/api_boundary/proposal_review_command_preview_read_api_boundary";

function formatBoolean(value: boolean): string {
  return value ? "true" : "false";
}

export async function ReviewCommandPreviewSection({
  proposalId,
}: {
  proposalId: string;
}) {
  const previewModel = await getProposalReviewCommandPreviewReadModel({
    proposalId,
  });

  return (
    <section
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "12px",
        padding: "1rem",
        marginTop: "1.5rem",
      }}
    >
      <h2>Review command preview</h2>
      <p>
        Preview only. No command is executed from this page. Future command
        candidates are rendered as read-only information.
      </p>

      {previewModel.result !== "ok" ? (
        <p>
          Preview unavailable: <code>{previewModel.result}</code>
        </p>
      ) : (
        <>
          <dl>
            <div>
              <dt>boundary</dt>
              <dd>
                <code>{previewModel.boundary.mode}</code>
              </dd>
            </div>
            <div>
              <dt>commands_executed</dt>
              <dd>
                <code>{formatBoolean(previewModel.boundary.commands_executed)}</code>
              </dd>
            </div>
            <div>
              <dt>preview_only</dt>
              <dd>
                <code>{formatBoolean(previewModel.boundary.preview_only)}</code>
              </dd>
            </div>
            <div>
              <dt>writes_performed</dt>
              <dd>
                <code>{formatBoolean(previewModel.boundary.writes_performed)}</code>
              </dd>
            </div>
            <div>
              <dt>transaction_read_only</dt>
              <dd>
                <code>
                  {formatBoolean(previewModel.boundary.transaction_read_only)}
                </code>
              </dd>
            </div>
          </dl>

          <ol>
            {previewModel.previews.map((preview) => (
              <li key={preview.decision_type} style={{ marginBottom: "1rem" }}>
                <article
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "0.75rem",
                  }}
                >
                  <h3>
                    {preview.decision_label} /{" "}
                    <code>{preview.decision_type}</code>
                  </h3>

                  <dl>
                    <div>
                      <dt>current_proposal_status</dt>
                      <dd>
                        <code>{preview.current_proposal_status}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>would_append_audit_event</dt>
                      <dd>
                        <code>
                          {formatBoolean(preview.would_append_audit_event)}
                        </code>{" "}
                        <span>future command only</span>
                      </dd>
                    </div>
                    <div>
                      <dt>would_update_proposal_status</dt>
                      <dd>
                        <code>
                          {formatBoolean(preview.would_update_proposal_status)}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt>would_update_app_projection</dt>
                      <dd>
                        <code>
                          {formatBoolean(preview.would_update_app_projection)}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt>would_require_human_note</dt>
                      <dd>
                        <code>
                          {formatBoolean(preview.would_require_human_note)}
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt>default_decision_source</dt>
                      <dd>
                        <code>{preview.default_decision_source}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>disabled_reason</dt>
                      <dd>
                        {preview.disabled_reason === null ? (
                          <code>none</code>
                        ) : (
                          <code>{preview.disabled_reason}</code>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>safety_note</dt>
                      <dd>{preview.safety_note}</dd>
                    </div>
                  </dl>

                  <details>
                    <summary>preview_event_metadata</summary>
                    <pre>{JSON.stringify(preview.preview_event_metadata, null, 2)}</pre>
                  </details>
                </article>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
