// src/web/lib.ts — the web layer imports types and the committed snapshot
// and NOTHING else from the engine (no capture, no compute). The view is a
// pure function of snapshot.json.

import type { MetricRecord, Snapshot, Verdict } from '../types.js';
import snapshotJson from '../../data/snapshot.json';

export const SNAPSHOT = snapshotJson as unknown as Snapshot;

export const GLYPHS: Record<Verdict, string> = {
  SUPPORTED: '✓',
  UNSUPPORTED: '✕',
  INCONCLUSIVE: '~',
  DATA_UNUSABLE: '⊘',
};

export function fmtValue(v: number | null, unit: string): string {
  if (v === null) return '—';
  switch (unit) {
    case 'pct':
      return `${v.toFixed(2)}%`;
    case 'ratio':
      return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    case 'count':
      return v.toLocaleString('en-US');
    case 'days':
      return v.toLocaleString('en-US');
    case 'NEAR':
      return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'accounts':
      return v.toLocaleString('en-US');
    default:
      return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
}

export function fmtNear(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function shortHash(h: string, n = 10): string {
  return h ? `${h.slice(0, n)}…` : '—';
}

export function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Receipts are shipped signed when a signing secret existed at compute
 * time; a fresh clone re-computing without a secret ships them empty. */
export function receiptsSigned(): boolean {
  return SNAPSHOT.metrics.every((m) => m.receipt.length > 0);
}

/** FR-19: a heuristic metric must never render without its caveat. */
export function assertCaveatRenderable(record: MetricRecord): void {
  if (record.heuristic && !(record.caveat && record.caveat.trim().length > 0)) {
    throw new Error(`FR-19 violation: ${record.id} is a heuristic metric but has no caveat to render`);
  }
}

/** Download helper used by receipt export (FR-16) and CSV export. */
export function download(filename: string, content: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function metricById(id: string): MetricRecord {
  const m = SNAPSHOT.metrics.find((x) => x.id === id);
  if (!m) throw new Error(`web: metric ${id} missing from snapshot`);
  return m;
}
