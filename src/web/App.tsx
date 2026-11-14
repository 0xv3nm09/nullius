import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { Thesis } from './pages/Thesis';
import { Audit } from './pages/Audit';
import { Ledger } from './pages/Ledger';
import { Method } from './pages/Method';
import { ProvenanceProvider } from './components/ProvenanceDrawer';
import { SNAPSHOT, receiptsSigned, shortHash } from './lib';

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
            <span className="logo" aria-hidden>
              <Ban size={16} color="#fe4e1e" strokeWidth={2.5} />
            </span>
            <span>
              nullius
              <small>take nobody's word for it</small>
            </span>
          </div>
          <nav className="nav" aria-label="Pages">
            {PAGES.map((p) => (
              <a key={p.id} href={`#/${p.id}`} aria-current={page === p.id ? 'page' : undefined}>
                {p.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="strip">
          <span>
            <span className="live-dot" aria-hidden /> live data · NEAR mainnet
          </span>
          <span>snapshot {SNAPSHOT.generatedAt}</span>
          <span>{s.seriesDays.toLocaleString('en-US')} days</span>
          <span>chain head {shortHash(s.chainHead, 8)}</span>
          <span>receipts {signed ? `${SNAPSHOT.metrics.length}/${SNAPSHOT.metrics.length}` : 'unsigned'}</span>
          <span className="aux">re-verify: npm run verify</span>
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
          nullius · built for the NEAR HACKATHON investment-thesis track · data captured from api.nearblocks.io ·
          every figure links to its provenance · MIT licence
        </p>
        <p className="xsmall faint">
          {s.supported} supported · {s.unsupported} unsupported · {s.inconclusive} inconclusive · {s.dataUnusable}{' '}
          data-unusable · computed {SNAPSHOT.generatedAt} · <i>nullius in verba</i> — the Royal Society's motto since
          1660
        </p>
      </footer>
    </ProvenanceProvider>
  );
}
