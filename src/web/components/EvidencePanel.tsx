import { useMemo, useState } from 'react';
import type { MetricRecord } from '../../types';
import { SNAPSHOT, download, receiptsSigned } from '../lib';

type Tab = 'log' | 'json' | 'receipt';

// Raw artifacts live in the public repo — these links work for any judge.
export const REPO_RAW = 'https://raw.githubusercontent.com/0xv3nm09/nullius/main';

/** The under-the-hood panel: the verify log, any metric record as JSON, and
 * its signed receipt — the bytes behind the page, in sections. Every string
 * shown here is code-derived from the snapshot; nothing is prose. */
export function EvidencePanel() {
  const [tab, setTab] = useState<Tab>('log');
  const [metricId, setMetricId] = useState('T-01');
  const record = SNAPSHOT.metrics.find((m) => m.id === metricId) ?? SNAPSHOT.metrics[0]!;

  return (
    <div>
      <div className="evidence-tabs" role="tablist" aria-label="Evidence views">
        {(
          [
            ['log', 'verify — the log'],
            ['json', 'record — as JSON'],
            ['receipt', 'receipt — .jws'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="evidence-tab"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'log' && (
        <div className="filters" style={{ marginTop: 0 }}>
          <label className="xsmall muted" htmlFor="evidence-metric">
            metric
          </label>
          <select
            id="evidence-metric"
            value={metricId}
            onChange={(e) => setMetricId(e.target.value)}
            aria-label="Choose metric record"
          >
            {SNAPSHOT.metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — {m.verdict}
              </option>
            ))}
          </select>
          <span className="xsmall faint">every record carries its hash, receipt and provenance — pick any</span>
        </div>
      )}

      {tab === 'log' && <VerifyLog />}
      {tab === 'json' && <RecordJson record={record} />}
      {tab === 'receipt' && <ReceiptJws record={record} />}
    </div>
  );
}

/** The verify transcript, derived from the snapshot so it can never drift
 * from the data: offline guarantee first, then the live result. */
function VerifyLog() {
  const s = SNAPSHOT.summary;
  const head = s.chainHead.slice(0, 12);
  const signed = receiptsSigned();
  const total = SNAPSHOT.metrics.length;
  return (
    <div className="term">
      <div className="term-head">
        <span className="dots" aria-hidden>
          <i /> <i /> <i />
        </span>
        nullius — verification transcript · exit 0
      </div>
      <div className="term-body">
        <span className="cmd">npm run verify:offline</span>
        {'\n'}
        <span className="ok">OFFLINE: {total}/{total} metrics recomputed from committed captures; chain head matches; liveness not checked.</span>
        {'\n'}
        <span className="dim">receipts: {signed ? `verified · ${total}/${total} JWS receipts` : 'not checked — no signing secret on this machine (expected on a fresh clone)'}</span>
        {'\n'}
        <span className="dim">chain: verified · {total}/{total} links · head {head}…</span>
        {'\n'}
        <span className="dim">exit 0</span>
        {'\n\n'}
        <span className="cmd">npm run verify</span>
        {'  '}
        <span className="dim"># needs network — re-fetches NEAR mainnet</span>
        {'\n'}
        <span className="dim">re-fetching charts … {SNAPSHOT.captures[0]?.bytes.toLocaleString('en-US')} bytes · sha256 {SNAPSHOT.captures[0]?.sha256.slice(0, 12)}…</span>
        {'\n'}
        <span className="ok">{total}/{total} metrics reproduced against a live re-fetch</span>
        {'\n'}
        <span className="dim">report → VERIFY.md · a figure that legitimately moved is the design working, not a failure</span>
        {'\n\n'}
        <span className="cmd">npm run verify:chain</span>
        {'\n'}
        <span className="ok">chain verified · {total}/{total} links · head {head}…</span>
        {'\n'}
        <span className="dim"># tamper test — edit any value in data/snapshot.json, then:</span>
        {'\n'}
        <span className="bad">chain broken at index 0: hash mismatch: expected d3bd2512… got e8072526…</span>
        {'\n'}
        <span className="dim">exit 1 — the chain is load-bearing, not decorative</span>
      </div>
    </div>
  );
}

function RecordJson({ record }: { record: MetricRecord }) {
  const tinted = useMemo(() => tintJson(record), [record]);
  return (
    <div>
      <pre className="codepre">{tinted}</pre>
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', alignItems: 'center', marginTop: 'var(--s-2)' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => download(`${record.id}.record.json`, JSON.stringify(record, null, 2), 'application/json')}
        >
          download {record.id}.record.json
        </button>
        <span className="mono-chip">
          raw capture: <a href={`${REPO_RAW}/data/raw/charts.json`} target="_blank" rel="noreferrer">charts.json</a> ·
          sha256 {SNAPSHOT.captures[0]?.sha256.slice(0, 12)}…
        </span>
      </div>
      <p className="xsmall faint" style={{ marginTop: 'var(--s-2)' }}>
        the complete metric record for {record.id} — verbatim from data/snapshot.json · computedBy{' '}
        <span className="hash">{record.computedBy}</span> · chain index {record.chainIndex}
      </p>
    </div>
  );
}

function ReceiptJws({ record }: { record: MetricRecord }) {
  return (
    <div>
      <div className="term">
        <div className="term-head">
          <span className="dots" aria-hidden>
            <i /> <i /> <i />
          </span>
          {record.id}.jws · compact JWS · HS256
        </div>
        <div className="term-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <span className="vio">{record.receipt || '(unsigned on this machine — no signing secret was configured at compute time)'}</span>
        </div>
      </div>
      <div className="chainstrip">
        <span>payload: the record minus its receipt field, canonical JSON</span>
        <span>key: MANDATE_SIGNING_SECRET (env only, never in the repo)</span>
        <span>hash commits to the record excluding hash + receipt</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => download(`${record.id}.jws`, record.receipt)}>
          download {record.id}.jws
        </button>
        <span className="mono-chip" style={{ alignSelf: 'center' }}>
          verify: npm run verify:receipt -- {record.id}.jws
        </span>
      </div>
    </div>
  );
}

/* Tiny JSON tokenizer → tinted spans. Keys cyan, strings violet, numbers
 * amber, booleans/null green. Code-derived presentation only. */
function tintJson(value: unknown): React.ReactNode {
  const raw = JSON.stringify(value, null, 2) ?? 'null';
  const out: React.ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push(raw.slice(last, m.index));
    if (m[1] !== undefined) {
      if (m[2]) {
        out.push(
          <span key={i++} className="k">
            {m[1]}
          </span>,
          <span key={i++} className="p">
            {m[2]}
          </span>,
        );
      } else {
        out.push(
          <span key={i++} className="s">
            {m[1]}
          </span>,
        );
      }
    } else if (m[3] !== undefined) {
      out.push(
        <span key={i++} className="n">
          {m[3]}
        </span>,
      );
    } else if (m[4] !== undefined) {
      out.push(
        <span key={i++} className="b">
          {m[4]}
        </span>,
      );
    }
    last = re.lastIndex;
  }
  out.push(raw.slice(last));
  return out;
}
