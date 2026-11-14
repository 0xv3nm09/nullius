// src/compute/audit.ts — the audit gate (workbook §7.3). Pure. Runs on every
// field a proposition depends on — and we run it on every charts field, so a
// fourth failure would surface as a finding with no code change. The gate
// order is fixed: EMPTY_SERIES, then FROZEN, then DEFINITIONAL_BREAK.
//
// There is no clock here: "days since last change" is measured against the
// last row of the series, which is data, not the wall clock.

import type { FieldAudit } from '../types.js';
import { daysBetween, monthKey } from './dateutil.js';
import type { DailyRow } from './row.js';

const FROZEN_DAYS = 90;
const BREAK_RATIO = 50;
// A definitional break is a PERMANENT shift of a field's whole scale, so a
// qualifying jump must pass three tests together:
//   1. RATIO     — the day-over-day jump exceeds 50x;
//   2. BASE      — the pre-jump value was already typical of the field
//                  (>= BASE_FRACTION of the median of its non-zero values),
//                  which is scale-invariant; an absolute `base > 100` is
//                  vacuous for yocto-scaled fields;
//   3. PERSIST   — the elevated level holds (median of the following
//                  PERSIST_DAYS days >= PERSIST_FACTOR x the pre-jump base,
//                  with at least PERSIST_MIN_DAYS days available). Organic
//                  spikes revert; redefinitions never come back down.
// Worked examples on this series: txn_fee moved ~84x on 2020-08-21 but from
// a microscopic base (fails 2); new_contracts jumped 73x on 2023-01-30 and
// was back the next day (fails 3); active_contracts jumped 1,052x on
// 2024-06-01 and never returned (passes all three). Disclosed on Method.
const BREAK_BASE_FRACTION = 0.5;
const PERSIST_FACTOR = 10;
const PERSIST_DAYS = 7;
const PERSIST_MIN_DAYS = 3;

export function auditField(rows: DailyRow[], field: string): FieldAudit {
  const series = rows.map((r) => ({ date: r.date, v: (r as Record<string, number | null>)[field] ?? null }));
  const lastDate = rows.length ? (rows[rows.length - 1] as DailyRow).date : '';

  // Gate 1 — EMPTY_SERIES: no non-null, non-zero value anywhere.
  const nonZero = series.filter((p) => p.v !== null && p.v !== 0);
  if (nonZero.length === 0) {
    return {
      field,
      usable: false,
      reason: 'EMPTY_SERIES',
      detail: `no non-null, non-zero value on any of the ${series.length} days`,
      evidence: { days: series.length, usableDays: 0 },
    };
  }

  // Gate 2 — FROZEN: unchanged for more than FROZEN_DAYS days of series.
  let lastChangeIdx = 0;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1] as { date: string; v: number | null };
    const b = series[i] as { date: string; v: number | null };
    if (a.v !== b.v) lastChangeIdx = i;
  }
  const lastChangeDate = (series[lastChangeIdx] as { date: string }).date.slice(0, 10);
  const staleDays = daysBetween(lastChangeDate, lastDate);
  if (staleDays > FROZEN_DAYS) {
    const frozenAt = (series[lastChangeIdx] as { v: number | null }).v;
    return {
      field,
      usable: false,
      reason: 'FROZEN',
      detail: `frozen since ${lastChangeDate}`,
      evidence: {
        lastChangeDate,
        staleDays,
        frozenValue: frozenAt,
        latestValue: (series[series.length - 1] as { v: number | null }).v,
        days: series.length,
      },
    };
  }

  // Gate 3 — DEFINITIONAL_BREAK: >50x jump, from a base already typical of
  // the field, that PERSISTS (see the constant block above for the rationale
  // and the worked examples).
  const nonzero = series.map((p) => p.v).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
  const median = nonzero.length ? (nonzero[Math.floor((nonzero.length - 1) / 2)] as number) : 0;
  const baseFloor = median * BREAK_BASE_FRACTION;
  let worst = { ratio: 0, date: '', from: 0, to: 0 };
  for (let i = 1; i < series.length; i++) {
    const prev = (series[i - 1] as { v: number | null }).v;
    const cur = (series[i] as { v: number | null }).v;
    if (prev === null || cur === null || prev <= 0 || prev < baseFloor) continue;
    const ratio = cur / prev;
    if (ratio <= worst.ratio || ratio <= BREAK_RATIO) continue;
    // persistence: median of the next PERSIST_DAYS values (min available)
    const future = series.slice(i + 1, i + 1 + PERSIST_DAYS).map((p) => p.v).filter((v): v is number => v !== null);
    if (future.length < PERSIST_MIN_DAYS) continue;
    const sorted = [...future].sort((a, b) => a - b);
    const med = sorted[Math.floor((sorted.length - 1) / 2)] as number;
    if (med < prev * PERSIST_FACTOR) continue;
    worst = { ratio, date: (series[i] as { date: string }).date.slice(0, 10), from: prev, to: cur };
  }
  if (worst.ratio > BREAK_RATIO) {
    return {
      field,
      usable: false,
      reason: 'DEFINITIONAL_BREAK',
      detail: `definitional break on ${worst.date}: ${worst.from} → ${worst.to} (${Math.round(worst.ratio)}x, persistent, from a base typical of the field)`,
      evidence: {
        breakDate: worst.date,
        valueBefore: worst.from,
        valueAfter: worst.to,
        ratio: worst.ratio,
        medianNonZero: median,
        days: series.length,
      },
    };
  }

  // Usable — record the evidence that proved it, not just the label. The
  // informational max ratio is the plain day-over-day maximum (any base),
  // distinct from the gate's filtered candidate above.
  let infoMax = 0;
  for (let i = 1; i < series.length; i++) {
    const prev = (series[i - 1] as { v: number | null }).v;
    const cur = (series[i] as { v: number | null }).v;
    if (prev === null || cur === null || prev <= 0) continue;
    infoMax = Math.max(infoMax, cur / prev);
  }
  return {
    field,
    usable: true,
    detail: `usable: non-empty, last change ${lastChangeDate}, max day-over-day ratio ${infoMax.toFixed(2)}x`,
    evidence: {
      days: series.length,
      nonZeroDays: nonZero.length,
      lastChangeDate,
      staleDays,
      maxDayOverDayRatio: infoMax,
      first: (series[0] as { v: number | null }).v,
      last: (series[series.length - 1] as { v: number | null }).v,
    },
  };
}

export function auditAll(rows: DailyRow[], fields: string[]): FieldAudit[] {
  return fields.map((f) => auditField(rows, f));
}

/** Monthly totals of a field, keyed 'YYYY-MM', in insertion (chronological)
 * order. Nulls contribute 0 but are counted as missing. */
export function monthlyTotals(rows: DailyRow[], field: string): { month: string; total: number; days: number; missing: number }[] {
  const acc = new Map<string, { total: number; days: number; missing: number }>();
  for (const r of rows) {
    const k = monthKey(r.date);
    let e = acc.get(k);
    if (!e) {
      e = { total: 0, days: 0, missing: 0 };
      acc.set(k, e);
    }
    const v = (r as Record<string, number | null>)[field];
    if (v === null || v === undefined) {
      e.missing++;
    } else {
      e.total += v;
      e.days++;
    }
  }
  return [...acc.entries()].map(([month, e]) => ({ month, ...e }));
}

/** Monthly means of a field, keyed 'YYYY-MM', chronological. */
export function monthlyMeans(rows: DailyRow[], field: string): { month: string; mean: number; days: number }[] {
  return monthlyTotals(rows, field).map((m) => ({ month: m.month, mean: m.days ? m.total / m.days : 0, days: m.days }));
}
