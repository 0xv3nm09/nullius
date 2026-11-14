// src/compute/metrics.ts — pure functions, one per proposition. No I/O, no
// clock, no randomness (FR-03). Every function returns the headline value
// plus the support numbers a reviewer needs to re-derive it by hand.
//
// Where a proposition's source field is unusable the function still computes
// its diagnostic numbers into `support`; compute/index.ts nulls the headline
// `value` centrally so FR-08 holds in exactly one place.

import { yoctoToNear } from '../units.js';
import { daysBetween, daysFromCivil, monthKey, shiftMonth } from './dateutil.js';
import { monthlyMeans, monthlyTotals } from './audit.js';
import { clusterByPrefix } from './cluster.js';
import { T11_CAVEAT } from '../propositions.js';
import type { Pool, ValidatorsData } from './parse.js';
import type { DailyRow } from './row.js';

export interface MetricOut {
  value: number | null;
  support: Record<string, number | string | null>;
}

function num(v: number | null | undefined, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** `true` when the month of `lastDate` has fewer rows than its day count,
 * i.e. it is a partial month and must be excluded from monthly windows. */
function lastMonthIsPartial(rows: DailyRow[]): boolean {
  const last = rows[rows.length - 1] as DailyRow;
  const mk = monthKey(last.date);
  const y = Number(mk.slice(0, 4));
  const m = Number(mk.slice(5, 7));
  const dim = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 30;
  const covered = daysBetween(`${mk}-01`, last.date.slice(0, 10)) + 1;
  return covered < dim;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The last `n` FULL months (chronological) and the `n` before them. */
function fullMonthWindows(rows: DailyRow[], n: number): { latest: string[]; prior: string[] } {
  let months = monthlyTotals(rows, 'txns').map((m) => m.month); // any field gives the month list
  if (lastMonthIsPartial(rows)) months = months.slice(0, -1);
  const latest = months.slice(-n);
  const prior = months.slice(-2 * n, -n);
  return { latest, prior };
}

function monthlyMap(rows: DailyRow[], field: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of monthlyTotals(rows, field)) map.set(m.month, m.total);
  return map;
}

// ---------------------------------------------------------------- T-01

export function activeAccountsVsPeak(rows: DailyRow[]): MetricOut {
  const field = 'active_accounts';
  const get = (r: DailyRow) => num((r as Record<string, number | null>)[field]);
  const last30 = rows.slice(-30);
  const recentMean = last30.reduce((s, r) => s + get(r), 0) / (last30.length || 1);
  let peak = 0;
  let peakDate = '';
  for (const r of rows) {
    const v = get(r);
    if (v > peak) {
      peak = v;
      peakDate = r.date.slice(0, 10);
    }
  }
  const value = peak > 0 ? (recentMean / peak) * 100 : null;
  return {
    value,
    support: {
      recent30Mean: recentMean,
      peak,
      peakDate,
      latest: get(rows[rows.length - 1] as DailyRow),
      windowDays: last30.length,
      pctOfPeak: value,
    },
  };
}

// ---------------------------------------------------------------- T-02

export function feeBurnInflection(rows: DailyRow[]): MetricOut {
  const { latest, prior } = fullMonthWindows(rows, 3);
  const fee = monthlyMap(rows, 'txn_fee'); // yoctoNEAR sums
  const latestSum = yoctoToNear(latest.reduce((s, m) => s + (fee.get(m) ?? 0), 0));
  const priorSum = yoctoToNear(prior.reduce((s, m) => s + (fee.get(m) ?? 0), 0));
  const value = priorSum > 0 ? ((latestSum - priorSum) / priorSum) * 100 : null;
  // the single-month headline the workbook quotes: trough month vs latest
  const monthlyNear = [...fee.entries()].map(([month, y]) => ({ month, near: yoctoToNear(y) }));
  const fullMonthly = monthlyNear.filter((m) => latest.includes(m.month) || prior.includes(m.month));
  const trough = fullMonthly.reduce((a, b) => (b.near < a.near ? b : a), fullMonthly[0] ?? { month: '', near: 0 });
  const latestMonth = fullMonthly[fullMonthly.length - 1] ?? { month: '', near: 0 };
  const octVsJul = trough.near > 0 ? ((latestMonth.near - trough.near) / trough.near) * 100 : null;
  return {
    value,
    support: {
      latestMonths: latest.join(' '),
      priorMonths: prior.join(' '),
      latestSum,
      priorSum,
      pctChange: value,
      troughMonth: trough.month,
      troughSum: trough.near,
      latestMonth: latestMonth.month,
      latestMonthSum: latestMonth.near,
      pctLatestVsTrough: octVsJul,
    },
  };
}

// ---------------------------------------------------------------- T-03

function cagrPct(first: number, last: number, days: number): number {
  if (first <= 0 || days <= 0) return Number.NaN;
  return (Math.pow(last / first, 365.25 / days) - 1) * 100;
}

export function issuanceDeceleration(rows: DailyRow[]): MetricOut {
  const first = rows[0] as DailyRow;
  const last = rows[rows.length - 1] as DailyRow;
  const f = num(first.total_supply);
  const l = num(last.total_supply);
  const spanDays = daysBetween(first.date, last.date);
  const lifetime = cagrPct(f, l, spanDays);

  // supply at the row closest to 365.25 days before the last row
  const target = daysFromCivil(last.date) - 365;
  let base = rows[0] as DailyRow;
  for (const r of rows) {
    if (daysFromCivil(r.date) <= target) base = r;
    else break;
  }
  const b = num(base.total_supply);
  const ttmDays = daysBetween(base.date, last.date);
  const ttm = cagrPct(b, l, ttmDays);
  const value = Number.isFinite(ttm) ? ttm : null;
  return {
    value,
    support: {
      firstDate: first.date.slice(0, 10),
      lastDate: last.date.slice(0, 10),
      firstSupplyNear: yoctoToNear(f),
      lastSupplyNear: yoctoToNear(l),
      lifetimeCagrPct: lifetime,
      ttmBaseDate: base.date.slice(0, 10),
      ttmBaseSupplyNear: yoctoToNear(b),
      ttmDays: ttmDays,
      ttmCagrPct: ttm,
    },
  };
}

// ---------------------------------------------------------------- T-04

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return Number.NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] as number;
    const y = ys[i] as number;
    cov += (x - mx) * (y - my);
    sx += (x - mx) * (x - mx);
    sy += (y - my) * (y - my);
  }
  if (sx === 0 || sy === 0) return Number.NaN;
  return cov / Math.sqrt(sx * sy);
}

export function priceUsageCorrelation(rows: DailyRow[]): MetricOut {
  const { latest } = fullMonthWindows(rows, 12);
  const price = new Map(monthlyMeans(rows, 'near_price').map((m) => [m.month, m.mean]));
  const usage = new Map(monthlyMeans(rows, 'active_accounts').map((m) => [m.month, m.mean]));
  const xs = latest.map((m) => price.get(m) ?? 0);
  const ys = latest.map((m) => usage.get(m) ?? 0);
  const r = pearson(xs, ys);
  const value = Number.isFinite(r) ? r : null;
  return {
    value,
    support: {
      months: latest.length,
      firstMonth: latest[0] ?? '',
      lastMonth: latest[latest.length - 1] ?? '',
      priceMeanFirst: xs[0] ?? null,
      priceMeanLast: xs[xs.length - 1] ?? null,
      usageMeanFirst: ys[0] ?? null,
      usageMeanLast: ys[ys.length - 1] ?? null,
      pearsonR: value,
    },
  };
}

// ---------------------------------------------------------------- T-05..07
// Diagnostics for propositions whose source fields fail the audit gate.

export function multichainUsableDays(rows: DailyRow[]): MetricOut {
  const usable = rows.filter((r) => {
    const v = r.multichain_txns;
    return v !== null && v !== 0;
  });
  return {
    value: usable.length, // nulled centrally because the field is unusable
    support: { usableDays: usable.length, totalDays: rows.length },
  };
}

export function circulatingStaleness(rows: DailyRow[]): MetricOut {
  let lastChangeIdx = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1]!.circulating_supply !== rows[i]!.circulating_supply) lastChangeIdx = i;
  }
  const lastChangeDate = (rows[lastChangeIdx] as DailyRow).date.slice(0, 10);
  const lastDate = (rows[rows.length - 1] as DailyRow).date.slice(0, 10);
  const stale = daysBetween(lastChangeDate, lastDate);
  return {
    value: stale, // nulled centrally because the field is unusable
    support: {
      lastChangeDate,
      staleDays: stale,
      frozenValueNear: yoctoToNear(num((rows[lastChangeIdx] as DailyRow).circulating_supply)),
      totalSupplyLatestNear: yoctoToNear(num((rows[rows.length - 1] as DailyRow).total_supply)),
    },
  };
}

export function contractBreakRatio(rows: DailyRow[]): MetricOut {
  let worst = { ratio: 0, date: '', from: 0, to: 0 };
  for (let i = 1; i < rows.length; i++) {
    const prev = (rows[i - 1] as DailyRow).active_contracts;
    const cur = (rows[i] as DailyRow).active_contracts;
    if (prev === null || cur === null || prev <= 100) continue;
    const ratio = cur / prev;
    if (ratio > worst.ratio) worst = { ratio, date: (rows[i] as DailyRow).date.slice(0, 10), from: prev, to: cur };
  }
  return {
    value: worst.ratio > 0 ? worst.ratio : null, // nulled centrally
    support: {
      breakDate: worst.date || null,
      valueBefore: worst.from || null,
      valueAfter: worst.to || null,
      ratio: worst.ratio > 0 ? worst.ratio : null,
    },
  };
}

// ---------------------------------------------------------------- T-08

export function newContractsVsMean(rows: DailyRow[]): MetricOut {
  const totals = monthlyMap(rows, 'new_contracts');
  let months = [...totals.keys()];
  if (lastMonthIsPartial(rows)) months = months.slice(0, -1);
  const latestMonth = months[months.length - 1] ?? '';
  const trailing = months.slice(-13, -1); // 12 full months before the latest
  const mean = trailing.length ? (trailing.reduce((s, m) => s + (totals.get(m) ?? 0), 0)) / trailing.length : Number.NaN;
  const latest = totals.get(latestMonth) ?? 0;
  const value = Number.isFinite(mean) && mean > 0 ? latest / mean : null;
  return {
    value,
    support: {
      latestMonth,
      latest,
      trailingMonths: trailing.length,
      trailingMean: mean,
      firstTrailingMonth: trailing[0] ?? null,
      ratio: value,
    },
  };
}

// ---------------------------------------------------------------- T-09

export interface NakamotoOut {
  value: number;
  support: Record<string, number | string | null>;
}

export function nakamotoAt(pools: Pool[], thresholdPct: number): { value: number; crossedAt: string; cumulativePct: number } {
  let cum = 0;
  let count = 0;
  for (const p of pools) {
    cum = p.cumulativePercent; // API-computed across the FULL validator set
    count++;
    if (cum >= thresholdPct) return { value: count, crossedAt: p.accountId, cumulativePct: cum };
  }
  // threshold never crossed inside the paginated rows
  return { value: count, crossedAt: '', cumulativePct: cum };
}

export function validatorNakamoto(v: ValidatorsData): MetricOut {
  const threshold = 33;
  const nak = nakamotoAt(v.pools, threshold);
  const totalStakeNear = yoctoToNear(v.totalStakeYocto);
  const cumAt = (i: number) => (v.pools[i - 1] as Pool | undefined)?.cumulativePercent ?? null;
  return {
    value: nak.value,
    support: {
      thresholdPct: threshold,
      crossedAt: nak.crossedAt,
      cumulativePctAtCross: nak.cumulativePct,
      seats: v.seats,
      rowsParsed: v.pools.length,
      totalStakeNear,
      lastEpochApyPct: v.lastEpochApyPct,
      top5SharePct: cumAt(5),
      top10SharePct: cumAt(10),
      top25SharePct: cumAt(25),
    },
  };
}

// ---------------------------------------------------------------- T-11

export function operatorClusteredNakamoto(v: ValidatorsData): MetricOut {
  const threshold = 33;
  const ungrouped = nakamotoAt(v.pools, threshold).value;
  const clusters = clusterByPrefix(v.pools);

  // Walk clusters largest-first; each pool is counted once (union semantics).
  const counted = new Set<string>();
  let cum = 0;
  let groups = 0;
  let crossover = '';
  for (const c of clusters) {
    let fresh = 0;
    for (const m of c.members) if (!counted.has(m.accountId)) fresh += m.percent;
    if (fresh <= 0) continue; // fully absorbed — adds no independent stake
    cum += fresh;
    groups++;
    for (const m of c.members) counted.add(m.accountId);
    if (cum >= threshold) {
      crossover = c.cluster;
      break;
    }
  }
  return {
    value: groups,
    support: {
      ungroupedNakamoto: ungrouped,
      clusteredNakamoto: groups,
      clustersFound: clusters.length,
      crossoverCluster: crossover,
      cumulativePctAtCross: cum,
      thresholdPct: threshold,
      topClusters: clusters
        .slice(0, 8)
        .map((c) => `${c.cluster}:${c.percent.toFixed(2)}%(${c.members.length})`)
        .join(' '),
    },
  };
}

export function clusteredWithCaveat(v: ValidatorsData): { out: MetricOut; heuristic: true; caveat: string } {
  const out = operatorClusteredNakamoto(v);
  return { out, heuristic: true, caveat: T11_CAVEAT };
}

// ---------------------------------------------------------------- T-10

export function blockStability(rows: DailyRow[]): MetricOut {
  const { latest } = fullMonthWindows(rows, 12);
  const means = new Map(monthlyMeans(rows, 'blocks').map((m) => [m.month, m.mean]));
  const xs = latest.map((m) => means.get(m) ?? 0);
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / (n || 1);
  const variance = n > 1 ? xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1) : 0; // sample stdev
  const stdev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdev / mean) * 100 : Number.NaN;
  const value = Number.isFinite(cv) ? cv : null;
  return {
    value,
    support: {
      months: n,
      firstMonth: latest[0] ?? null,
      lastMonth: latest[n - 1] ?? null,
      meanBlocksPerDay: mean,
      stdevBlocksPerDay: stdev,
      cvPct: value,
      populationStdevPct: mean > 0 ? (Math.sqrt(variance * (n - 1) / n) / mean) * 100 : null,
    },
  };
}

export { shiftMonth };
