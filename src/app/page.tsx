import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>FarmOS Core</h1>
      <p>Local read-only UI foundation for Human in the Loop farm operations.</p>

      <section>
        <h2>Read-only views</h2>
        <ul>
          <li>
            <Link href="/crop-cycles">Crop Cycles</Link>
          </li>
          <li>
            <Link href="/proposals">AI Proposal Inbox</Link>
          </li>
        </ul>
      </section>

      <section>
        <h2>Safety boundary</h2>
        <p>
          This UI does not provide approve, reject, apply, archive, edit, or mutation controls.
        </p>
      </section>
    </main>
  );
}
