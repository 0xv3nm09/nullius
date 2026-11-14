import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

export interface TrendProps {
  title: string;
  data: Record<string, unknown>[];
  series: { key: string; color: string; label: string }[];
  annotation?: { x: string; label: string };
  yLog?: boolean;
}

/** Evidence chart wrapper — charts are evidence, not decoration, so they use
 * the muted series tokens and a single annotation colour. */
export function TrendChart({ title, data, series, annotation, yLog }: TrendProps) {
  return (
    <figure className="chartbox">
      <figcaption className="charttitle">{title}</figcaption>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--series-grid)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickFormatter={(d: string) => d.slice(2, 7)} minTickGap={48} />
          <YAxis
            scale={yLog ? 'log' : 'auto'}
            domain={yLog ? [1, 'dataMax'] : undefined}
            tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
            width={72}
            tickFormatter={(v: number) => compact(v)}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', fontSize: 12, borderRadius: 6 }}
            labelStyle={{ color: 'var(--text-muted)' }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {annotation && <ReferenceLine x={annotation.x} stroke="var(--series-annotation)" label={{ value: annotation.label, fontSize: 10, fill: 'var(--series-annotation)', position: 'insideTopRight' }} />}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${Math.round(v * 100) / 100}`;
}
