import { createContext, useContext } from 'react';
import type { MetricRecord } from '../../types';
import { fmtValue } from '../lib';

export interface FigureRequest {
  record: MetricRecord;
  note?: string; // which support figure was clicked, if not the headline
}

export const FigureContext = createContext<(r: FigureRequest) => void>(() => {
  throw new Error('Figure used outside ProvenanceProvider');
});

export function useFigure(): (r: FigureRequest) => void {
  return useContext(FigureContext);
}

export interface FigureProps {
  record: MetricRecord;
  /** Override the displayed number (e.g. a support figure). Must trace to
   * this record; an untraceable figure must not render at all. */
  value?: number | null;
  unit?: string;
  note?: string;
}

/** A figure is interactive, traceable text — underlined on hover, opens the
 * provenance drawer. If a number cannot be traced to a metric record, it
 * must not render: passing no record throws in development. */
export function Figure({ record, value, unit, note }: FigureProps) {
  if (!record) throw new Error('Figure rendered without a metric record — untraceable numbers must not render');
  const v = value === undefined ? record.value : value;
  const u = unit ?? record.unit;
  const open = useFigure();
  return (
    <button
      type="button"
      className="figure num"
      aria-expanded="false"
      title={`provenance: ${record.id} · chain index ${record.chainIndex}`}
      onClick={() => open({ record, note })}
    >
      {fmtValue(v, u)}
    </button>
  );
}
