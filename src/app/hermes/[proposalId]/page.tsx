import Link from "next/link";
import { readHermesChatReadonlyUi } from "../../../../scripts/app/api_boundary/hermes_chat_readonly_ui_boundary";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

export default async function HermesProposalContextPage({ params }: PageProps) {
  const { proposalId } = await params;

  const result = await readHermesChatReadonlyUi({
    proposalId,
    latestLimit: 10,
  });

  if (result.result !== "ok") {
    return (
      <main>
        <p>
          <Link href="/hermes">Hermes相談入口へ戻る</Link>
        </p>
        <h1>Hermes context viewer</h1>
        <p>Hermes proposal contextを取得できませんでした。</p>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </main>
    );
  }

  const { view, boundary } = result;

  return (
    <main>
      <p>
        <Link href="/hermes">Hermes相談入口へ戻る</Link>
      </p>

      <header>
        <h1>Hermes context viewer</h1>
        <p>
          この画面はproposalに対してHermesが参照可能なread-only contextを表示します。
          送信・保存・提案作成・適用は行いません。
        </p>
      </header>

      <section>
        <h2>Proposal context summary</h2>
        <dl>
          <div>
            <dt>proposal_id</dt>
            <dd>
              <code>{proposalId}</code>
            </dd>
          </div>
          <div>
            <dt>proposal_context_result</dt>
            <dd>
              <code>{view.proposal_context_result ?? "unknown"}</code>
            </dd>
          </div>
          <div>
            <dt>proposal_context_scope</dt>
            <dd>
              <code>{view.proposal_context_scope ?? "unknown"}</code>
            </dd>
          </div>
          <div>
            <dt>proposal_status</dt>
            <dd>
              <code>{view.proposal_status ?? "unknown"}</code>
            </dd>
          </div>
          <div>
            <dt>readiness_result</dt>
            <dd>
              <code>{view.readiness_result ?? "unknown"}</code>
            </dd>
          </div>
          <div>
            <dt>preview_result</dt>
            <dd>
              <code>{view.preview_result ?? "unknown"}</code>
            </dd>
          </div>
          <div>
            <dt>apply_history_summary_count</dt>
            <dd>
              <code>{formatValue(view.apply_history_summary_count)}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>Read-only boundary</h2>
        <dl>
          {Object.entries(boundary).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>
                <code>{formatValue(value)}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Related Hermes proposal notes</h2>
        {view.hermes_proposal_notes.length === 0 ? (
          <p>このproposalに紐づくHermes proposal noteは見つかりませんでした。</p>
        ) : (
          <ol>
            {view.hermes_proposal_notes.map((note) => (
              <li key={note.id}>
                <article>
                  <h3>{note.title ?? note.id}</h3>
                  <dl>
                    <div>
                      <dt>id</dt>
                      <dd>
                        <code>{note.id}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>type</dt>
                      <dd>
                        <code>{note.proposal_type}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>status</dt>
                      <dd>
                        <code>{note.status ?? "unknown"}</code>
                      </dd>
                    </div>
                  </dl>
                  {note.body ? <p>{note.body}</p> : null}
                  <details>
                    <summary>payload_json</summary>
                    <pre>{JSON.stringify(note.payload_json, null, 2)}</pre>
                  </details>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>Safety policy</h2>
        <pre>{JSON.stringify(view.safety_policy, null, 2)}</pre>
      </section>

      <section>
        <h2>Redaction policy</h2>
        <pre>{JSON.stringify(view.redaction_policy, null, 2)}</pre>
      </section>

      <section>
        <h2>Raw Hermes context</h2>
        <details>
          <summary>context JSON</summary>
          <pre>{JSON.stringify(view.proposal_context, null, 2)}</pre>
        </details>
      </section>
    </main>
  );
}
