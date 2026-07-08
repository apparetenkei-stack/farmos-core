import Link from "next/link";
import { HermesApiBlockedStatePreview } from "../../components/hermes/hermes_api_blocked_state_preview";
import { readHermesChatReadonlyUi } from "../../../scripts/app/api_boundary/hermes_chat_readonly_ui_boundary";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

export default async function HermesPage() {
  const result = await readHermesChatReadonlyUi({ latestLimit: 10 });

  if (result.result !== "ok") {
    return (
      <main>
        <h1>Hermes相談入口</h1>
        <p>Hermes read-only UI boundaryを取得できませんでした。</p>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </main>
    );
  }

  const { view, boundary } = result;

  return (
    <main>
      <header>
        <h1>Hermes相談入口</h1>
        <p>
          現在は読み取り専用です。AI提案の生成・承認・適用はこの画面からは行いません。
        </p>
      </header>

      <HermesApiBlockedStatePreview />

      <section>
        <h2>Hermes status</h2>
        <dl>
          {Object.entries(view.hermes_status).map(([key, value]) => (
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
        <h2>Protected fixture</h2>
        <p>
          既存proposalのHermes context確認:{" "}
          <Link href={`/hermes/${view.protected_proposal_id}`}>
            {view.protected_proposal_id}
          </Link>
        </p>
      </section>

      <section>
        <h2>Latest Hermes proposal notes</h2>
        {view.hermes_proposal_notes.length === 0 ? (
          <p>Hermes proposal noteはまだありません。</p>
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
                    <div>
                      <dt>created_at</dt>
                      <dd>
                        <code>{note.created_at ?? "unknown"}</code>
                      </dd>
                    </div>
                  </dl>
                  {note.body ? <p>{note.body}</p> : null}
                  <details>
                    <summary>payload_json</summary>
                    <pre>{JSON.stringify(note.payload_json, null, 2)}</pre>
                  </details>
                  <details>
                    <summary>source_refs_json</summary>
                    <pre>{JSON.stringify(note.source_refs_json, null, 2)}</pre>
                  </details>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>Safety policy</h2>
        <p>
          表示内容は人間確認の補助です。受発注・出荷配分・取引先・金額・労務機微情報は扱いません。
          実チャット入力、記憶、LLM応答はDay41以降の境界設計で追加します。
        </p>
        <pre>{JSON.stringify(view.safety_policy, null, 2)}</pre>
      </section>
    </main>
  );
}
