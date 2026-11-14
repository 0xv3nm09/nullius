import { SNAPSHOT } from '../lib';
import { KindBadge } from '../components/KindBadge';
import { TrendChart } from '../components/TrendChart';
import { ConcentrationPanel } from '../components/ConcentrationPanel';

export function Audit() {
  const prose = SNAPSHOT.prose.find((p) => p.id === 'P-audit')!;
  const unusable = SNAPSHOT.audit.filter((a) => !a.usable);
  const usable = SNAPSHOT.audit.filter((a) => a.usable);
  const ev = SNAPSHOT.evidence;

  return (
    <>
      <h2 className="section" style={{ marginTop: 'var(--s-8)' }}>
        The audit — every field, checked before use
      </h2>
      <div className="card sunk">
        <p style={{ margin: 0 }}>
          <KindBadge kind="prose" /> <span className="xsmall faint">model-written</span>
        </p>
        <p className="prose" style={{ marginBottom: 0 }}>
          {prose.body}
        </p>
      </div>

      <h3 className="sub">Findings — fields that cannot support any verdict</h3>
      {unusable.map((a) => (
        <div className="card" key={a.field}>
          <p style={{ margin: 0 }}>
            <code className="hash" style={{ fontSize: 'var(--fs-base)' }}>
              {a.field}
            </code>{' '}
            <span className="pill" data-verdict="DATA_UNUSABLE" style={{ marginLeft: 'var(--s-2)' }}>
              <span aria-hidden="true">⊘</span> {a.reason}
            </span>
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {a.detail}
          </p>
          <EvidenceTable evidence={a.evidence} />
        </div>
      ))}

      <h3 className="sub">The charts behind the findings</h3>
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

      <ConcentrationPanel />

      <h3 className="sub">Fields that passed — checked anyway, not assumed</h3>
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
    </>
  );
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
