import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid">
      <section className="panel">
        <span className="readonly-badge">read-only</span>
        <h1>FarmOS Core</h1>
        <p>
          Crop Cycle Read-only UI Foundation.
          Day21の読み取り専用API boundaryを使うための最小UIです。
        </p>
        <p>
          このUIはCrop Cycleの一覧とprovenance detailを表示します。
          編集、archive、approve、reject、POST/PUT/PATCH/DELETE APIは作りません。
        </p>
        <p>
          <Link href="/crop-cycles">Crop Cycle一覧を見る</Link>
        </p>
      </section>

      <section className="panel">
        <h2>Boundary</h2>
        <ul>
          <li>DB読み取りはServer ComponentからDay21 boundary moduleを呼び出します。</li>
          <li>UI側に直接SQLは書きません。</li>
          <li>document_extractions.extracted_text 本文はデフォルト非表示です。</li>
          <li>raw text表示ボタンはDay22では作りません。</li>
        </ul>
      </section>
    </div>
  );
}
