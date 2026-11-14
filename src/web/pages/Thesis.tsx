import {
  ArrowRight, BadgeCheck, FileSignature, Flame, KeyRound, Link2, ShieldCheck, Terminal,
  WifiOff, XCircle, Cpu, Eye,
} from 'lucide-react';
import { assertCaveatRenderable, SNAPSHOT, fmtValue, metricById, receiptsSigned } from '../lib';
import { Figure } from '../components/Figure';
import { KindBadge } from '../components/KindBadge';
import { VerdictPill } from '../components/VerdictPill';
import { Section } from '../components/Section';
import { EvidencePanel } from '../components/EvidencePanel';

export function Thesis() {
  const s = SNAPSHOT.summary;
  const t11 = metricById('T-11');
  assertCaveatRenderable(t11);
  const prose = SNAPSHOT.prose.find((p) => p.id === 'P-thesis')!;
  const signed = receiptsSigned();

  return (
    <>
      <Hero />

      {/* ---- the verdict summary, as five evidence cards ---- */}
      <div className="statband" style={{ marginTop: 'var(--s-4)' }}>
        <StatCard icon={<BadgeCheck size={15} />} tone="var(--ok-700)" chip="rgb(21 128 61 / 0.12)" label="Supported" value={String(s.supported)} note="survived the falsifier written before the value existed" />
        <StatCard icon={<XCircle size={15} />} tone="var(--bad-700)" chip="rgb(217 58 74 / 0.12)" label="Unsupported" value={String(s.unsupported)} note="reported against ourselves, by design — this is the credibility move" />
        <StatCard icon={<Eye size={15} />} tone="var(--unusable-700)" chip="rgb(123 91 214 / 0.14)" label="Data unusable" value={String(s.dataUnusable)} note="the source could not support any verdict — a finding, not a failure" />
        <StatCard icon={<Link2 size={15} />} tone="var(--text)" chip="rgb(20 20 20 / 0.07)" label="Chain links" value={`${SNAPSHOT.metrics.length} ✓`} note={`SHA-256 prev-hash chain · head ${s.chainHead.slice(0, 10)}…`} />
        <StatCard icon={<FileSignature size={15} />} tone="var(--accent-bright)" chip="var(--accent-soft)" label="Signed receipts" value={signed ? `${SNAPSHOT.metrics.length} ✓` : '0'} note={signed ? 'compact JWS (HS256) per metric record' : 'unsigned on this machine — no secret configured'} />
      </div>

      {/* ---- code-derived conclusion ---- */}
      <div className="card card-gradient" style={{ padding: 'var(--s-6)', marginTop: 'var(--s-4)' }}>
        <p style={{ margin: 0 }}>
          <KindBadge kind="code" /> <span className="xsmall faint">code-derived — every number interpolated from the metric records, never from prose</span>
        </p>
        <p className="prose" style={{ marginBottom: 0, marginTop: 'var(--s-3)' }}>
          {s.conclusion}
        </p>
      </div>

      <DarkFinding />

      {/* ---- the propositions ---- */}
      <Section kicker="The fifteen" title={<>Fifteen falsifiable propositions. <span className="accent-text">Six fail.</span></>}>
        <p className="lede" style={{ marginBottom: 'var(--s-4)' }}>
          Each falsifier was written before its value was computed and never edited afterwards. Verdicts are assigned
          by code, from the falsifier — never typed, never tuned. Click any figure for its provenance.
        </p>
        {SNAPSHOT.metrics.map((m) => (
          <PropCard key={m.id} record={m} />
        ))}
      </Section>

      {/* ---- the bytes: logs, JSON, receipts ---- */}
      <Section kicker="Under the hood · the actual bytes" title={<>The logs, the record, <span className="accent-text">the receipt</span>.</>}>
        <p className="lede" style={{ marginBottom: 'var(--s-4)' }}>
          Everything the console claims, shown as the machine emitted it — the verify transcript, a complete metric
          record, and its signed receipt. No screenshot of a terminal; the values here are derived from the same
          snapshot the charts read.
        </p>
        <EvidencePanel />
      </Section>

      {/* ---- model prose, badged ---- */}
      <div className="proseblock">
        <p style={{ margin: 0 }}>
          <KindBadge kind="prose" /> <span className="xsmall faint">model-written — carries no numbers by construction (TS-13)</span>
        </p>
        <p className="prose" style={{ marginBottom: 0, marginTop: 'var(--s-2)' }}>
          {prose.body}
        </p>
      </div>

      <FinalCta />
    </>
  );
}

/* ── hero ─────────────────────────────────────────────────────────────────── */

function Hero() {
  const s = SNAPSHOT.summary;
  const t01 = metricById('T-01');
  const t02 = metricById('T-02');
  const t05 = metricById('T-05');
  const signed = receiptsSigned();

  return (
    <section className="hero">
      <div className="hero-ribbon">
        <span>
          <span className="live-dot" aria-hidden /> live data · NEAR mainnet · api.nearblocks.io
        </span>
        <span className="badge">
          <Flame size={12} /> NEAR HACKATHON · thesis track
        </span>
      </div>

      <div className="hero-grid">
        {/* left: the pitch */}
        <div>
          <p className="kicker">An executable investment thesis</p>
          <h1 className="hero-title">
            Take nobody's
            <br />
            <span className="accent-text">word for it.</span>
          </h1>
          <p className="hero-pitch">
            Every other entry will argue NEAR is undervalued and attach charts. This one starts by{' '}
            <b>auditing the data those charts are drawn from</b> — and finds four headline fields that fail — then
            states <b>fifteen falsifiable propositions</b>, computes each one from the raw bytes, and publishes the
            verdicts <b>including the six that fail</b>.
          </p>
          <div className="hero-tags">
            <span className="hero-tag tone-ok">
              <ShieldCheck size={13} /> {s.supported} supported · {s.unsupported} unsupported
            </span>
            <span className="hero-tag tone-accent">
              <KeyRound size={13} /> 0 model-written numbers
            </span>
            <span className="hero-tag tone-unusable">
              <Eye size={13} /> {s.dataUnusable} fields are findings
            </span>
          </div>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#/audit">
              Open the audit <ArrowRight size={16} />
            </a>
            <a className="btn btn-ghost" href="#/ledger">
              Inspect the ledger
            </a>
          </div>
        </div>

        {/* right: the live verdict machine */}
        <div className="hero-panel">
          <div className="hero-panel-head">
            <span>every figure → hash chain → verdict</span>
            <span className="live">COMMITTED</span>
          </div>
          <div className="verdict-strip">
            <VerdictRow record={t01} note="usage vs peak — the thesis reports against itself" />
            <VerdictRow record={t02} note="fee burn off the trough — the surviving bull case" />
            <VerdictRow record={t05} note="the source field is a finding, not a number" />
          </div>
          <div className="hero-stats">
            <div>
              <p className="v" style={{ color: 'var(--ok-700)' }}>
                {s.supported}
              </p>
              <p className="k">supported</p>
            </div>
            <div>
              <p className="v" style={{ color: 'var(--bad-700)' }}>
                {s.unsupported}
              </p>
              <p className="k">unsupported</p>
            </div>
            <div>
              <p className="v" style={{ color: 'var(--unusable-700)' }}>
                {s.dataUnusable}
              </p>
              <p className="k">data unusable</p>
            </div>
          </div>
          <div className="hero-chiprow">
            <span className="mono-chip">{s.seriesDays.toLocaleString('en-US')} days</span>
            <span className="mono-chip">3 captures · sha256</span>
            <span className="mono-chip">JWS · HS256</span>
            <span className="mono-chip">chain {s.chainHead.slice(0, 8)}…</span>
          </div>
          <p className="hero-foot">
            <span style={{ color: 'var(--ok-700)', fontWeight: 500 }}>● committed</span> ·{' '}
            {SNAPSHOT.generatedAt} · receipts {signed ? `${SNAPSHOT.metrics.length}/${SNAPSHOT.metrics.length}` : 'unsigned'}
          </p>
        </div>
      </div>

      {/* capability row — what the engine actually guarantees */}
      <div className="caprow">
        <div className="caprow-grid">
          <span>
            <span className="capicon"><Link2 size={15} /></span> SHA-256 hash chain
          </span>
          <span>
            <span className="capicon"><FileSignature size={15} /></span> Signed JWS receipts
          </span>
          <span>
            <span className="capicon"><ShieldCheck size={15} /></span> Audit gate · 20 fields
          </span>
          <span>
            <span className="capicon"><Cpu size={15} /></span> Deterministic compute
          </span>
          <span>
            <span className="capicon"><WifiOff size={15} /></span> Offline verify
          </span>
          <span>
            <span className="capicon"><Terminal size={15} /></span> One-command re-run
          </span>
        </div>
      </div>
    </section>
  );
}

function VerdictRow({ record, note }: { record: ReturnType<typeof metricById>; note: string }) {
  return (
    <div className={`verdict-row tone-${record.verdict}`}>
      <span className="min-width-0">
        <span className="cmd">
          {record.id} · “{record.proposition}”
        </span>
        <span className="note">{note}</span>
      </span>
      <VerdictPill verdict={record.verdict} />
    </div>
  );
}

function StatCard({ icon, tone, chip, label, value, note }: { icon: React.ReactNode; tone: string; chip: string; label: string; value: string; note: string }) {
  return (
    <div className="card card-gradient statcard">
      <div className="head">
        <span className="iconchip" style={{ background: chip, color: tone }}>
          {icon}
        </span>
        {label}
      </div>
      <p className="num" style={{ color: tone }}>
        {value}
      </p>
      <p className="note">{note}</p>
    </div>
  );
}

/* ── the dark finding band — the why ──────────────────────────────────────── */

function DarkFinding() {
  const t06 = metricById('T-06');
  const t07 = metricById('T-07');
  const t05 = metricById('T-05');
  return (
    <section className="darkband" style={{ marginTop: 'var(--s-16)' }}>
      <p className="kicker">The finding · why this thesis starts with an audit</p>
      <h2>
        Four of this source's headline fields <span style={{ color: '#ff8a66' }}>do not survive an audit.</span>
      </h2>
      <p style={{ color: 'rgb(242 238 229 / 0.7)', maxWidth: '62ch', marginTop: 'var(--s-3)' }}>
        These are the numbers a rushed thesis quotes first — cross-chain traction, float-adjusted valuation,
        developer activity. The gate that found them ran on all 20 fields the endpoint exposes, not just the
        suspected ones; it surfaced the fourth finding nobody asked it for, and that finding now carries a
        proposition of its own (T-12). A fifth is always possible — the gate reruns on every capture.
      </p>
      <div className="darkgrid">
        <div className="darkcard">
          <p className="big">{fmtValue(t05.support['usableDays'] as number, 'count')}</p>
          <p className="field">multichain_txns · EMPTY_SERIES</p>
          <p>
            usable days out of {SNAPSHOT.summary.seriesDays.toLocaleString('en-US')} of chain history. The cross-chain
            series the endpoint advertises does not exist.
          </p>
        </div>
        <div className="darkcard">
          <p className="big">{fmtValue(t06.support['staleDays'] as number, 'days')}</p>
          <p className="field">circulating_supply · FROZEN</p>
          <p>
            days stale — frozen since {String(t06.support['lastChangeDate'])} while total supply kept climbing. Any
            float-adjusted valuation from this field is wrong.
          </p>
        </div>
        <div className="darkcard">
          <p className="big">{Math.round(Number(t07.support['ratio']))}×</p>
          <p className="field">active_contracts · DEFINITIONAL_BREAK</p>
          <p>
            in one day on {String(t07.support['breakDate'])} — never reconciled. Values either side are not the same
            quantity.
          </p>
        </div>
        <div className="darkcard">
          <p className="big">{Math.round(Number(metricById('T-12').support['ratio']))}×</p>
          <p className="field">deleted_accounts · DEFINITIONAL_BREAK</p>
          <p>
            in one day on {String(metricById('T-12').support['breakDate'])} — the finding the gate surfaced on its
            own, now carrying proposition T-12.
          </p>
        </div>
      </div>
      <div className="darkfoot">
        <div>
          <p className="k">Why it matters</p>
          <p className="v">Every bull case built on these three numbers inherits their defects — silently.</p>
        </div>
        <div>
          <p className="k">What survives</p>
          <p className="v">Supply discipline, a fee-burn inflection, a deployment recovery — narrower, real, cited.</p>
        </div>
        <div>
          <p className="k">The differentiator</p>
          <p className="v">
            A bullish entry cannot copy this without ceasing to be one. <a href="#/audit" style={{ color: '#ff8a66' }}>Open the audit →</a>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── proposition cards ────────────────────────────────────────────────────── */

function PropCard({ record: m }: { record: ReturnType<typeof metricById> }) {
  return (
    <article className={`propcard tone-${m.verdict}`}>
      <div>
        <span className="id">{m.id}</span> <span className="claim">{m.proposition}</span>
      </div>
      <div className="figurecell">
        {m.value !== null || m.verdict !== 'DATA_UNUSABLE' ? (
          <span className="bigfigure">
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
      </div>
    </article>
  );
}

/* ── final CTA ────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="finalcta">
      <h2>
        Most theses ask you to believe them.
        <span className="block text-aurora">This one ships with a verify command.</span>
      </h2>
      <div className="hero-ctas" style={{ justifyContent: 'center' }}>
        <a className="btn btn-primary" href="#/method">
          Reproduce it yourself <ArrowRight size={15} />
        </a>
        <a className="btn btn-ghost" href="#/ledger">
          Open the ledger
        </a>
      </div>
      <p className="hero-foot">
        npm install &amp;&amp; npm run verify:offline — no keys, no network, no sign-up · usage is down {fmtValue(metricById('T-01').support['pctOfPeak'] as number, 'pct')} of peak, and the thesis says so itself
      </p>
    </section>
  );
}
