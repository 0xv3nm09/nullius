import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Legend } from 'recharts';
import { SNAPSHOT, assertCaveatRenderable, metricById } from '../lib';

/** The concentration panel — T-09/T-11 in one picture. The heuristic caveat
 * is rendered INSIDE this panel (FR-19), not in a footnote. */
export function ConcentrationPanel() {
  const ev = SNAPSHOT.evidence.concentration;
  const t11 = metricById('T-11');
  assertCaveatRenderable(t11); // FR-19: refuse to render a heuristic without its caveat

  // merge the two curves onto one x-axis (group index n)
  const n = Math.max(ev.ungroupedCurve.length, ev.clusteredCurve.length);
  const data = Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    validator: (ev.ungroupedCurve[i] as { cumulativePercent: number } | undefined)?.cumulativePercent ?? null,
    operator: (ev.clusteredCurve[i] as { cumulativePercent: number } | undefined)?.cumulativePercent ?? null,
  }));

  const crossU = ev.ungroupedCurve[ev.ungroupedN - 1];
  const crossC = ev.clusteredCurve[ev.clusteredN - 1];

  return (
    <div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Cumulative stake share over the largest staking pools. The dashed line is the 33% consensus-halt threshold:
        reached by the <strong>{ev.ungroupedN}</strong>-th validator, or by the <strong>{ev.clusteredN}</strong>-th
        operator group once pools are clustered by name prefix.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--series-grid)" vertical={false} />
          <XAxis
            dataKey="n"
            tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
            label={{ value: 'validators / operator groups', fontSize: 10, fill: 'var(--text-faint)', position: 'insideBottomRight', offset: -4 }}
          />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={52} tickFormatter={(v: number) => `${v}%`} domain={[0, 70]} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', fontSize: 12, borderRadius: 6 }} formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={33} stroke="var(--series-annotation)" strokeDasharray="4 4" label={{ value: '33% halt threshold', fontSize: 10, fill: 'var(--series-annotation)', position: 'insideTopLeft' }} />
          <Line type="stepAfter" dataKey="validator" name="validator level (T-09)" stroke="var(--series-1)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="operator" name="operator-clustered (T-11, heuristic)" stroke="var(--series-2)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          {crossU && <ReferenceDot x={crossU.n} y={crossU.cumulativePercent} r={4} fill="var(--series-1)" stroke="var(--surface)" />}
          {crossC && <ReferenceDot x={crossC.n} y={crossC.cumulativePercent} r={4} fill="var(--series-2)" stroke="var(--surface)" />}
        </LineChart>
      </ResponsiveContainer>
      <table className="table" style={{ marginTop: 'var(--s-4)' }}>
        <thead>
          <tr>
            <th>operator cluster (name-prefix heuristic)</th>
            <th>pools</th>
            <th data-numeric>combined stake</th>
          </tr>
        </thead>
        <tbody>
          {SNAPSHOT.evidence.clusters.map((c) => (
            <tr key={c.cluster}>
              <td className="num">{c.cluster}</td>
              <td className="xsmall hash">{c.members.join(' · ')}</td>
              <td data-numeric className="num">
                {c.percent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="caveat" style={{ marginTop: 'var(--s-4)' }}>
        <strong>Heuristic — read before quoting the {ev.clusteredN}:</strong> {t11.caveat}
      </p>
    </div>
  );
}
