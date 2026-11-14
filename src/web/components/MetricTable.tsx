import { useMemo, useState } from 'react';
import type { MetricRecord, Verdict } from '../../types';
import { SNAPSHOT, download, fmtValue, shortHash } from '../lib';
import { VerdictPill } from './VerdictPill';

const VERDICTS: (Verdict | 'all')[] = ['all', 'SUPPORTED', 'UNSUPPORTED', 'INCONCLUSIVE', 'DATA_UNUSABLE'];

export function MetricTable() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Verdict | 'all'>('all');

  const rows = useMemo(() => {
    return SNAPSHOT.metrics.filter((m) => {
      if (filter !== 'all' && m.verdict !== filter) return false;
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        m.id.toLowerCase().includes(needle) ||
        m.proposition.toLowerCase().includes(needle) ||
        m.metric.toLowerCase().includes(needle)
      );
    });
  }, [q, filter]);

  const exportCsv = () => {
    const head = ['id', 'value', 'unit', 'verdict', 'chainIndex', 'hash', 'computedBy'];
    const lines = rows.map((m) =>
      [m.id, m.value ?? '', m.unit, m.verdict, m.chainIndex, m.hash, m.computedBy]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(','),
    );
    download('nullius-ledger.csv', [head.join(','), ...lines].join('\n'), 'text/csv');
  };

  return (
    <>
      <div className="filters">
        <input
          type="search"
          placeholder="search id, claim, metric…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search metrics"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Verdict | 'all')} aria-label="Filter by verdict">
          {VERDICTS.map((v) => (
            <option key={v} value={v}>
              {v === 'all' ? 'all verdicts' : v}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={exportCsv}>
          export CSV{rows.length < SNAPSHOT.metrics.length ? ` (${rows.length})` : ''}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>id</th>
              <th>metric</th>
              <th data-numeric>value</th>
              <th>verdict</th>
              <th data-numeric>chain</th>
              <th>hash</th>
              <th>receipt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <Row key={m.id} m={m} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  no metrics match — clear the search or filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({ m }: { m: MetricRecord }) {
  return (
    <tr>
      <td className="num">{m.id}</td>
      <td>
        {m.proposition}
        <br />
        <span className="xsmall faint">{m.metric}</span>
      </td>
      <td data-numeric className="num">
        {fmtValue(m.value, m.unit)}
        {m.value !== null && <span className="faint xsmall"> {m.unit}</span>}
      </td>
      <td>
        <VerdictPill verdict={m.verdict} />
      </td>
      <td data-numeric className="num">
        {m.chainIndex}
      </td>
      <td>
        <span className="hash" title={m.hash}>
          {shortHash(m.hash, 8)}
        </span>
      </td>
      <td>
        {m.receipt ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const blob = new Blob([m.receipt], { type: 'application/jws' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${m.id}.jws`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            .jws
          </button>
        ) : (
          <span className="faint xsmall">unsigned</span>
        )}
      </td>
    </tr>
  );
}
