import { assertCaveatRenderable, SNAPSHOT } from '../lib';
import { Figure } from '../components/Figure';
import { KindBadge } from '../components/KindBadge';
import { VerdictPill } from '../components/VerdictPill';

export function Thesis() {
  const s = SNAPSHOT.summary;
  const t11 = SNAPSHOT.metrics.find((m) => m.id === 'T-11')!;
  assertCaveatRenderable(t11);
  const prose = SNAPSHOT.prose.find((p) => p.id === 'P-thesis')!;

  return (
    <>
      <h2 className="section" style={{ marginTop: 'var(--s-8)' }}>
        The verdict summary
      </h2>
      <div className="tiles">
        <a className="stat" href="#/ledger" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-value" style={{ color: 'var(--v-supported-fg)' }}>
            {s.supported}
          </div>
          <div className="stat-label">SUPPORTED — the case that survived its own falsifier</div>
        </a>
        <a className="stat" href="#/ledger" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-value" style={{ color: 'var(--v-unsupported-fg)' }}>
            {s.unsupported}
          </div>
          <div className="stat-label">UNSUPPORTED — reported against ourselves, by design</div>
        </a>
        <a className="stat" href="#/audit" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-value" style={{ color: 'var(--v-unusable-fg)' }}>
            {s.dataUnusable}
          </div>
          <div className="stat-label">DATA_UNUSABLE — the source could not support any verdict</div>
        </a>
      </div>

      <div className="card">
        <p style={{ margin: 0 }}>
          <KindBadge kind="code" /> <span className="xsmall faint">code-derived — every number below is interpolated from the metric records</span>
        </p>
        <p className="prose" style={{ marginBottom: 0 }}>
          {s.conclusion}
        </p>
      </div>

      <div className="card sunk">
        <p style={{ margin: 0 }}>
          <KindBadge kind="prose" /> <span className="xsmall faint">model-written — carries no numbers by construction</span>
        </p>
        <p className="prose" style={{ marginBottom: 0 }}>
          {prose.body}
        </p>
      </div>

      <h2 className="section">The propositions</h2>
      <p className="muted small">Each falsifier was written before its value was computed, and never edited afterwards. Verdicts are assigned by code, from the falsifier.</p>
      {SNAPSHOT.metrics.map((m) => (
        <PropCard key={m.id} record={m} />
      ))}

      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Three of this source's headline fields do not survive audit</strong> — cross-chain traction, float-adjusted valuation, and developer activity.{' '}
          <a href="#/audit">See the audit →</a>
        </p>
      </div>
    </>
  );
}

function PropCard({ record: m }: { record: ReturnType<typeof getMetric> }) {
  return (
    <article className="propcard">
      <div>
        <span className="id">{m.id}</span> <span className="claim">{m.proposition}</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
        {m.value !== null || m.verdict !== 'DATA_UNUSABLE' ? (
          <span style={{ fontSize: 'var(--fs-lg)' }}>
            <Figure record={m} />
          </span>
        ) : (
          <span className="faint small">no value</span>
        )}
        <VerdictPill verdict={m.verdict} />
      </div>
      {m.heuristic && (
        <div className="caveat">
          <strong>Heuristic:</strong> {m.caveat}
        </div>
      )}
      <div className="falsifier">
        <span className="faint">falsifier:</span> {m.falsifier} · <span className="faint">measured:</span> {m.metric}
        {m.value !== null && (
          <>
            {' '}
            · <span className="faint">value:</span> <Figure record={m} /> {m.unit}
          </>
        )}
      </div>
    </article>
  );
}

function getMetric(id: string) {
  const m = SNAPSHOT.metrics.find((x) => x.id === id);
  if (!m) throw new Error(`missing metric ${id}`);
  return m;
}
