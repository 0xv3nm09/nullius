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
    <table className="table" style={{ marginTop: 'var(--s-3)' }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="hash" style={{ width: '40%' }}>
              {k}
            </td>
            <td className="num" data-numeric>
              {typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
