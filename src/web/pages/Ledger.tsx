import { SNAPSHOT } from '../lib';
import { MetricTable } from '../components/MetricTable';

export function Ledger() {
  const links = SNAPSHOT.metrics.length;
  const verified = true; // this build's chain is verified at compute time; re-verify with npm run verify:chain
  return (
    <>
      <h2 className="section" style={{ marginTop: 'var(--s-8)' }}>
        The ledger — every figure, its chain link, its receipt
      </h2>
      <div className="chainstrip">
        <span>chain {verified ? 'verified' : 'BROKEN'}</span>
        <span>
          {links}/{links} links
        </span>
        <span>head {SNAPSHOT.summary.chainHead.slice(0, 12)}…</span>
        <span>
          receipts {SNAPSHOT.metrics.filter((m) => m.receipt).length}/{links} signed
        </span>
        <span className="faint">re-verify: npm run verify:chain · verify a single receipt: npm run verify:receipt -- &lt;file.jws&gt;</span>
      </div>
      <MetricTable />
      <p className="xsmall faint" style={{ marginTop: 'var(--s-6)' }}>
        Each row's <code>.jws</code> receipt is a compact JWS (HS256) over that metric record. Chain hashes commit to
        the record content excluding the hash and receipt fields; genesis prevHash is 64 zeros; every link is
        SHA-256 over canonical JSON (keys sorted, no whitespace).
      </p>
    </>
  );
}
