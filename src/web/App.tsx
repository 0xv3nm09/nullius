import { useEffect, useState } from 'react';
import { Thesis } from './pages/Thesis';
import { Audit } from './pages/Audit';
import { Ledger } from './pages/Ledger';
import { Method } from './pages/Method';
import { ProvenanceProvider } from './components/ProvenanceDrawer';
import { SNAPSHOT, fmtValue, receiptsSigned, shortHash } from './lib';

const PAGES = [
  { id: 'thesis', label: 'Thesis' },
  { id: 'audit', label: 'Audit' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'method', label: 'Method' },
] as const;

type PageId = (typeof PAGES)[number]['id'];

function pageFromHash(): PageId {
  const h = location.hash.replace(/^#\/?/, '');
  return (PAGES.some((p) => p.id === h) ? h : 'thesis') as PageId;
}

export function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);

  useEffect(() => {
    const on = () => setPage(pageFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const s = SNAPSHOT.summary;
  const signed = receiptsSigned();

  return (
    <ProvenanceProvider>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            nullius
            <small>take nobody's word for it — an executable NEAR investment thesis</small>
          </div>
          <nav className="nav" aria-label="Pages">
            {PAGES.map((p) => (
              <a key={p.id} href={`#/${p.id}`} aria-current={page === p.id ? 'page' : undefined}>
                {p.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="strip page" style={{ maxWidth: 'none' }}>
          <span>snapshot generated {s.conclusion ? SNAPSHOT.generatedAt : ''}</span>
          <span>{s.seriesDays.toLocaleString('en-US')} days of chain history</span>
          <span>chain head {shortHash(s.chainHead, 8)}</span>
          <span>receipts {signed ? `${SNAPSHOT.metrics.length}/${SNAPSHOT.metrics.length} signed` : 'unsigned'}</span>
        </div>
      </header>
      <main className="page">
        {page === 'thesis' && <Thesis />}
        {page === 'audit' && <Audit />}
        {page === 'ledger' && <Ledger />}
        {page === 'method' && <Method />}
      </main>
      <footer className="site">
        <p>
          Nullius · built for the NEAR HACKATHON investment-thesis track · data captured from api.nearblocks.io ·
          every figure links to its provenance · MIT licence
        </p>
        <p className="xsmall faint">
          verdicts: {s.supported} supported · {s.unsupported} unsupported · {s.inconclusive} inconclusive ·{' '}
          {s.dataUnusable} data-unusable · last figure computed {fmtValue(null, 'pct') === '—' ? '' : ''}
          {SNAPSHOT.generatedAt}
        </p>
      </footer>
    </ProvenanceProvider>
  );
}
