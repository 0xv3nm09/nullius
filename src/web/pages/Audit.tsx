import { SNAPSHOT } from '../lib';
import { KindBadge } from '../components/KindBadge';
import { Section } from '../components/Section';
import { TrendChart } from '../components/TrendChart';
import { ConcentrationPanel } from '../components/ConcentrationPanel';

export function Audit() {
  const prose = SNAPSHOT.prose.find((p) => p.id === 'P-audit')!;
  const unusable = SNAPSHOT.audit.filter((a) => !a.usable);
  const usable = SNAPSHOT.audit.filter((a) => a.usable);
  const ev = SNAPSHOT.evidence;

  return (
    <>
      <Section kicker="The audit · the differentiator" title={<>Every field, checked <span className="accent-text">before use</span>.</>}>
        <div className="proseblock">
          <p style={{ margin: 0 }}>
            <KindBadge kind="prose" /> <span className="xsmall faint">model-written</span>
          </p>
          <p className="prose" style={{ marginBottom: 0, marginTop: 'var(--s-2)' }}>
            {prose.body}
          </p>
        </div>
      </Section>

      <Section kicker="Findings · fields that cannot support any verdict" title="Four findings — one of them unprompted.">
        {unusable.map((a) => (
          <div className="card finding" key={a.field}>
            <div>
              <p className="finding-num">{headline(a)}</p>
              <p className="finding-field">{a.field}</p>
              <p className="xsmall faint" style={{ marginTop: 4 }}>
                {a.reason}
              </p>
            </div>
            <div>
              <p className="small" style={{ marginTop: 0 }}>
                {a.detail}
              </p>
              <EvidenceTable evidence={a.evidence} />
            </div>
          </div>
        ))}
      </Section>

      <Section kicker="The charts behind the findings" title="What the break looks like.">
        <TrendChart
          title="multichain_txns — flat at zero across every day of chain history: the cross-chain series the endpoint advertises does not exist"
          data={ev.multichain.map((p) => ({ date: p.date, value: p.value }))}
          series={[{ key: 'value', color: 'var(--series-2)', label: 'multichain_txns / day' }]}
        />
        <TrendChart
          title="total_supply vs circulating_supply (NEAR) — the two lines should move together; circulating has been frozen since 2025-08-27 while total kept climbing"
          data={ev.supply.map((p) => ({ date: p.date, total: p.total, circulating: p.circulating }))}
          series={[
            { key: 'total', color: 'var(--series-1)', label: 'total_supply' },
            { key: 'circulating', color: 'var(--series-2)', label: 'circulating_supply' },
          ]}
          annotation={{ x: '2025-08-27', label: 'last change' }}
        />
        <TrendChart
          title="active_contracts (log scale) — a definitional break on 2024-06-01: 738 → 776,038 in one day, never reconciled; values either side are not the same quantity"
          data={ev.contracts.filter((p) => p.value > 0).map((p) => ({ date: p.date, value: p.value }))}
          series={[{ key: 'value', color: 'var(--series-1)', label: 'active_contracts' }]}
          annotation={{ x: '2024-06-01', label: '1,052× break' }}
          yLog
        />
      </Section>

      <Section kicker="Concentration · T-09 and T-11" title="Where the 33% line is crossed.">
        <ConcentrationPanel />
      </Section>

      <Section kicker="Digit-distribution conformance · Benford" title={<>Do these numbers look <span className="accent-text">generated</span>?</>}>
        <p className="lede" style={{ marginBottom: 'var(--s-4)' }}>
          A forensic-accounting test class, new to this gate: leading-digit frequencies against Benford's Law, for
          every field, first and second digit. The precondition gate is the part most implementations skip — the law
          needs a series spanning orders of magnitude, so <code>total_supply</code> (monotonic, first digit 1 on all{' '}
          {SNAPSHOT.summary.seriesDays.toLocaleString('en-US')} days) is reported NOT_APPLICABLE, not nonconformant.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>field</th>
                <th data-numeric>log10 range</th>
                <th data-numeric>n</th>
                <th>verdict</th>
                <th data-numeric>MAD 1st</th>
                <th data-numeric>χ² 1st (df 8)</th>
                <th data-numeric>MAD 2nd</th>
              </tr>
            </thead>
            <tbody>
              {SNAPSHOT.benford.map((b) => (
                <tr key={b.field}>
                  <td className="num">{b.field}</td>
                  <td data-numeric className="num">{b.log10Range.toFixed(2)}</td>
                  <td data-numeric className="num">{b.n.toLocaleString('en-US')}</td>
                  <td>
                    <span className={b.verdict === 'NONCONFORMANT' ? 'small' : 'small'} style={{ color: b.verdict === 'NONCONFORMANT' ? 'var(--bad-700)' : b.verdict === 'NOT_APPLICABLE' ? 'var(--text-faint)' : 'var(--ok-700)' }}>
                      {b.verdict}{b.reason ? ` · ${b.reason}` : ''}
                    </span>
                  </td>
                  <td data-numeric className="num">{b.first.mad.toFixed(4)}</td>
                  <td data-numeric className="num">{b.first.chi2.toFixed(0)}</td>
                  <td data-numeric className="num">{b.second.mad.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 'var(--s-4)', maxWidth: '78ch' }}>
          How to read this, without overclaiming: six of nineteen fields are correctly NOT_APPLICABLE — bounded,
          monotonic or too short for the law's multiplicative assumption (<code>near_price</code> spans 1.58 orders;
          the gate refuses to force a call). With n ≈ 2,300 the chi-square rejects almost anything, so MAD is the
          headline (Nigrini's bands: &lt;0.012 acceptable, 0.012–0.015 marginal, &gt;0.015 nonconformity). The split
          is then genuinely informative: the four volume/deployment series conform, while the fee and account-count
          fields deviate on the first digit — the signature of daily <em>aggregates</em> whose regime shifts and
          spike days break the scale-invariance the law assumes, not obviously of fabrication. The second digits —
          which the literature says discriminate harder (arXiv 2301.01809), and which can demote a field's verdict —
          stay inside the acceptable band on the high-n aggregate fields; the exceptions are the event-driven,
          low-base fields the gate has already flagged. This is evidence about
          fields, not a proposition about NEAR; it is a fifth audit column, deliberately kept out of the verdict set.
        </p>
      </Section>

      <Section kicker="Independent cross-check · PELT changepoints" title="An algorithm that was told no thresholds.">
        <p className="lede" style={{ marginBottom: 'var(--s-4)' }}>
          The gate's 50× threshold is hand-picked, so its findings were cross-checked with PELT (Killick, Fearnhead
          &amp; Eckley 2012) — exact change-point detection with a BIC penalty on the log-transformed series. Agreement
          and disagreement are both published; re-tuning the gate until the two agree is forbidden by the
          falsifier-before-value discipline.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>field</th>
                <th>gate finding</th>
                <th>PELT changepoints (BIC)</th>
                <th>agree</th>
              </tr>
            </thead>
            <tbody>
              {SNAPSHOT.crosscheck.map((c) => (
                <tr key={c.field}>
                  <td className="num">{c.field}</td>
                  <td className="xsmall">{c.gateFinding}</td>
                  <td className="xsmall hash">
                    {c.changepoints.join(' · ')}
                    {c.changepointCount > c.changepoints.length ? ` · +${c.changepointCount - c.changepoints.length} more` : ''}
                  </td>
                  <td style={{ color: c.agree === true ? 'var(--ok-700)' : c.agree === false ? 'var(--bad-700)' : 'var(--text-faint)' }}>
                    {c.agree === true ? '✓ exact' : c.agree === false ? '✕ named' : c.inScope ? '—' : `— out of scope (${c.changepointCount} regimes)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 'var(--s-4)', maxWidth: '78ch' }}>
          PELT finds the gate's <code>active_contracts</code> break date <strong>exactly</strong> — 2024-06-01 —
          without being told any threshold, which is the strongest corroboration the heuristic could have. The
          nearest-date test is applied only where PELT finds six or fewer regimes; event-driven fields (mass-deletion
          spikes, deployment waves) produce dozens, and scoring "which of 23 breaks is nearest" would be theatre —
          those are marked out of scope with the regime count shown. A thesis that audits its own audit is the whole
          pitch.
        </p>
      </Section>

      <Section kicker="Checked anyway · not assumed" title="The fields that passed.">
        <div className="auditgrid">
          {usable.map((a) => (
            <div className="auditcell" key={a.field}>
              <span className="fieldname">{a.field}</span>
              <br />
              <span className="faint">{a.detail}</span>
            </div>
          ))}
        </div>
        <p className="xsmall faint" style={{ marginTop: 'var(--s-4)' }}>
          The gate ran on all {SNAPSHOT.audit.length} fields the endpoint exposes and this thesis could touch. The
          deleted_accounts finding is an additional discovery of this audit — no proposition depends on it, and it is
          reported for the same reason the others are: because it is there.
        </p>
      </Section>
    </>
  );
}

function headline(a: { field: string; reason?: string; evidence: Record<string, unknown> }): string {
  if (a.field === 'multichain_txns') return `0 / ${a.evidence['days']}`;
  if (a.field === 'circulating_supply') return `${a.evidence['staleDays']}d`;
  if (a.field === 'active_contracts' || a.field === 'deleted_accounts') {
    return `${Math.round(Number(a.evidence['ratio']))}×`;
  }
  return a.reason ?? 'unusable';
}

function EvidenceTable({ evidence }: { evidence: Record<string, unknown> }) {
  const rows = Object.entries(evidence);
  return (
    <div className="kvlist">
      {rows.map(([k, v]) => (
        <div key={k}>
          <span className="k">{k}</span>
          <span className="v">
            {typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
