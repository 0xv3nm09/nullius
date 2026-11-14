import { Download, FileJson, FileSignature, FileText, Link2 } from 'lucide-react';
import { SNAPSHOT, download, receiptsSigned, shortHash } from '../lib';
import { REPO_RAW } from './EvidencePanel';

/** Technical formats — every artifact of a run, downloadable or linked.
 * Per-record receipts are on the Ledger rows and in the provenance drawer;
 * this panel covers the repo-level files a reviewer wants. */
export function Downloads() {
  const total = SNAPSHOT.metrics.length;
  const captures = SNAPSHOT.captures;
  const repo = 'https://github.com/0xv3nm09/nullius';

  return (
    <div>
      <div className="chainstrip">
        <span>all artifacts are committed in the public repo — links resolve for any judge, no keys</span>
        <span>
          <a href={`${repo}`} target="_blank" rel="noreferrer">
            github.com/0xv3nm09/nullius
          </a>
        </span>
      </div>

      <div className="kvlist">
        <div>
          <span className="k">snapshot.json</span>
          <span className="v">
            the data contract — {total} metric records, {SNAPSHOT.audit.length} audit entries, chain head{' '}
            {shortHash(SNAPSHOT.summary.chainHead, 10)} ·{' '}
            <a href={`${REPO_RAW}/data/snapshot.json`} target="_blank" rel="noreferrer">
              open
            </a>{' '}
            ·{' '}
            <button
              type="button"
              className="linklike"
              onClick={() => download('snapshot.json', JSON.stringify(SNAPSHOT, null, 2), 'application/json')}
            >
              <Download size={11} /> download
            </button>
          </span>
        </div>
        {captures.map((c) => (
          <div key={c.id}>
            <span className="k">
              raw capture · {c.id}.json
            </span>
            <span className="v">
              {c.bytes.toLocaleString('en-US')} bytes · sha256 {shortHash(c.sha256, 16)} · fetched {c.fetchedAt} ·{' '}
              <a href={`${REPO_RAW}/data/raw/${c.id}.json`} target="_blank" rel="noreferrer">
                open byte-for-byte
              </a>
            </span>
          </div>
        ))}
        <div>
          <span className="k">VERIFY.md</span>
          <span className="v">
            the last verify report — expected vs got per metric ·{' '}
            <a href={`${REPO_RAW}/VERIFY.md`} target="_blank" rel="noreferrer">
              open
            </a>{' '}
            · regenerate with <code>npm run verify</code>
          </span>
        </div>
        <div>
          <span className="k">PROPOSITIONS.md · AUDIT.md</span>
          <span className="v">
            the falsifiers and the audit write-up ·{' '}
            <a href={`${REPO_RAW}/PROPOSITIONS.md`} target="_blank" rel="noreferrer">
              PROPOSITIONS
            </a>{' '}
            ·{' '}
            <a href={`${REPO_RAW}/AUDIT.md`} target="_blank" rel="noreferrer">
              AUDIT
            </a>
          </span>
        </div>
        <div>
          <span className="k">receipts (.jws × {total})</span>
          <span className="v">
            {receiptsSigned() ? 'signed (HS256)' : 'unsigned on this machine'} — one per metric record · on the{' '}
            <a href="#/ledger">Ledger rows</a> and in every provenance drawer · verify:{' '}
            <code>npm run verify:receipt -- &lt;file.jws&gt;</code>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', marginTop: 'var(--s-4)' }}>
        <a className="btn btn-ghost" href={`${REPO_RAW}/data/snapshot.json`} target="_blank" rel="noreferrer">
          <FileJson size={14} /> snapshot.json
        </a>
        <a className="btn btn-ghost" href={`${REPO_RAW}/data/raw/charts.json`} target="_blank" rel="noreferrer">
          <Link2 size={14} /> charts.json (1.5 MB)
        </a>
        <a className="btn btn-ghost" href={`${REPO_RAW}/VERIFY.md`} target="_blank" rel="noreferrer">
          <FileText size={14} /> VERIFY.md
        </a>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const jwss = SNAPSHOT.metrics.filter((m) => m.receipt).map((m) => `=== ${m.id}.jws ===\n${m.receipt}`);
            download('nullius-receipts.jws-bundle.txt', jwss.join('\n\n'));
          }}
        >
          <FileSignature size={14} /> all {total} receipts (bundle)
        </button>
      </div>
    </div>
  );
}
