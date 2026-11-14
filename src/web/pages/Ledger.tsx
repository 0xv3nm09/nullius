import { SNAPSHOT } from '../lib';
import { Section } from '../components/Section';
import { MetricTable } from '../components/MetricTable';
import { EvidencePanel } from '../components/EvidencePanel';

export function Ledger() {
  const links = SNAPSHOT.metrics.length;
  return (
    <>
      <Section kicker="The ledger · the inspection surface" title={<>Every figure, its chain link, <span className="accent-text">its receipt</span>.</>}>
        <div className="chainstrip">
          <span>chain verified</span>
          <span>
            {links}/{links} links
          </span>
          <span>head {SNAPSHOT.summary.chainHead.slice(0, 12)}…</span>
          <span>
            receipts {SNAPSHOT.metrics.filter((m) => m.receipt).length}/{links} signed
          </span>
          <span className="faint">re-verify: npm run verify:chain · single receipt: npm run verify:receipt -- &lt;file.jws&gt;</span>
        </div>
        <MetricTable />
        <p className="xsmall faint" style={{ marginTop: 'var(--s-6)' }}>
          Each row's <code>.jws</code> receipt is a compact JWS (HS256) over that metric record. Chain hashes commit to
          the record content excluding the hash and receipt fields; genesis prevHash is 64 zeros; every link is
          SHA-256 over canonical JSON (keys sorted, no whitespace).
        </p>
      </Section>

      <Section kicker="Under the hood · the actual bytes" title="The log, the record, the receipt.">
        <EvidencePanel />
      </Section>
    </>
  );
}
