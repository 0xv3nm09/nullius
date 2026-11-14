import { useEffect, useState, type ReactNode } from 'react';
import type { FigureRequest } from './Figure';
import { FigureContext } from './Figure';
import { VerdictPill } from './VerdictPill';
import { SNAPSHOT, download, fmtValue, shortDate, shortHash } from '../lib';

export function ProvenanceProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<FigureRequest | null>(null);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReq(null);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [req]);

  return (
    <FigureContext.Provider value={setReq}>
      {children}
      {req && <ProvenanceDrawer req={req} onClose={() => setReq(null)} />}
    </FigureContext.Provider>
  );
}

function ProvenanceDrawer({ req, onClose }: { req: FigureRequest; onClose: () => void }) {
  const r = req.record;
  const captures = SNAPSHOT.captures.filter((c) => r.fromCaptures.includes(c.id));
  const audits = SNAPSHOT.audit.filter((a) => r.dependsOn.includes(a.field));

  return (
    <div className="drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Provenance for ${r.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <h3 className="sub" style={{ margin: 0 }}>
            {r.id} <span className="faint">· provenance</span>
          </h3>
          <button type="button" className="btn" onClick={onClose}>
            close
          </button>
        </div>
        <p className="small muted">{r.proposition}</p>
        <p>
          <VerdictPill verdict={r.verdict} />{' '}
          <span className="num" style={{ fontSize: 'var(--fs-lg)' }}>
            {fmtValue(r.value, r.unit)} <span className="muted small">{r.unit}</span>
          </span>
        </p>
        {req.note && <p className="xsmall faint">figure: {req.note}</p>}

        <dl>
          <dt>computed by</dt>
          <dd className="hash">{r.computedBy}</dd>
          <dt>falsifier (stated before the value)</dt>
          <dd className="small">{r.falsifier}</dd>
          <dt>hash chain</dt>
          <dd>
            index <span className="hash">{r.chainIndex}</span> · hash <span className="hash">{shortHash(r.hash, 16)}</span> ·
            prev <span className="hash">{shortHash(r.prevHash, 8)}</span>
          </dd>
          <dt>receipt (HS256 JWS)</dt>
          <dd>
            {r.receipt ? (
              <>
                <span className="hash">{r.receipt.slice(0, 24)}…</span>{' '}
                <button type="button" className="btn" onClick={() => download(`${r.id}.jws`, r.receipt)}>
                  download .jws
                </button>{' '}
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const { receipt: _omit, ...rest } = r;
                    void _omit;
                    download(`${r.id}.record.json`, JSON.stringify(rest, null, 2), 'application/json');
                  }}
                >
                  download .json
                </button>
              </>
            ) : (
              <span className="muted">unsigned — no signing secret was configured at compute time</span>
            )}
          </dd>
          <dt>verify it yourself</dt>
          <dd>
            <code className="hash">npm run verify:receipt -- {r.id}.jws</code>
          </dd>
        </dl>

        {captures.map((c) => (
          <dl key={c.id}>
            <dt>raw capture · {c.id}</dt>
            <dd>
              <span className="hash">{c.url}</span>
              <br />
              fetched {c.fetchedAt} · {c.bytes.toLocaleString('en-US')} bytes
              <br />
              sha256 <span className="hash">{shortHash(c.sha256, 24)}</span>
            </dd>
          </dl>
        ))}

        {audits.map((a) => (
          <dl key={a.field}>
            <dt>audit gate · {a.field}</dt>
            <dd className="small">
              {a.usable ? 'usable' : `unusable — ${a.reason}`} · {a.detail}
            </dd>
          </dl>
        ))}

        <dl>
          <dt>support figures (all code-derived)</dt>
          {Object.entries(r.support).map(([k, v]) => (
            <dd key={k} className="hash">
              {k}: {typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(v)}
            </dd>
          ))}
        </dl>
        <p className="xsmall faint">
          captures fetched {shortDate(SNAPSHOT.captures[0]?.fetchedAt ?? '')} · snapshot generated {SNAPSHOT.generatedAt}
        </p>
      </aside>
    </div>
  );
}
