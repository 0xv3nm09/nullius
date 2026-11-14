// src/compute/parse.ts — raw bytes → typed rows. Pure. Throws loudly on
// schema drift: a silent 0 is how a thesis publishes a false figure
// (workbook §15). No I/O, no clock.

import type { DailyRow } from './row.js';

export const CHART_FIELDS = [
  'near_price',
  'market_cap',
  'total_supply',
  'circulating_supply',
  'blocks',
  'gas_fee',
  'gas_used',
  'txns',
  'txn_volume',
  'txn_volume_usd',
  'txn_fee',
  'txn_fee_usd',
  'new_accounts',
  'active_accounts',
  'deleted_accounts',
  'new_contracts',
  'active_contracts',
  'unique_contracts',
  'multichain_txns',
] as const;

export type ChartField = (typeof CHART_FIELDS)[number];

function num(v: unknown, field: string, date: string): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`parseCharts: schema drift — ${field} on ${date} is not numeric: ${String(v)}`);
  }
  return n;
}

/** Parse the /v1/charts capture. Throws with the offending field and date. */
export function parseCharts(raw: string): DailyRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`parseCharts: capture is not JSON: ${(e as Error).message}`);
  }
  const charts = (parsed as { charts?: unknown }).charts;
  if (!Array.isArray(charts) || charts.length === 0) {
    throw new Error('parseCharts: schema drift — no non-empty `charts` array');
  }
  const rows: DailyRow[] = [];
  for (let i = 0; i < charts.length; i++) {
    const c = charts[i] as Record<string, unknown>;
    const date = c['date'];
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      throw new Error(`parseCharts: schema drift — row ${i} has no ISO date`);
    }
    const row: Record<string, number | string | null> = { date };
    for (const f of CHART_FIELDS) {
      if (!(f in c)) {
        throw new Error(`parseCharts: schema drift — field \`${f}\` missing on row ${i} (${date}). Never silently coerce a missing field to 0.`);
      }
      row[f] = num(c[f], f, date);
    }
    rows.push(row as DailyRow);
  }
  // rows must be strictly ascending in date; the metrics assume it
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1] as DailyRow;
    const b = rows[i] as DailyRow;
    if (a.date >= b.date) throw new Error(`parseCharts: rows not ascending at index ${i}: ${a.date} >= ${b.date}`);
  }
  return rows;
}

/** Parse the /v1/stats capture into a flat map of scalars. */
export function parseStats(raw: string): Record<string, number | string> {
  const parsed = JSON.parse(raw) as { stats?: Record<string, unknown>[] };
  const s = parsed.stats?.[0];
  if (!s || typeof s !== 'object') {
    throw new Error('parseStats: schema drift — stats[0] missing');
  }
  const keep = [
    'total_supply',
    'circulating_supply',
    'avg_block_time',
    'gas_price',
    'nodes_online',
    'near_price',
    'near_btc_price',
    'market_cap',
    'volume',
    'high_24h',
    'high_all',
    'low_24h',
    'low_all',
    'change_24',
    'total_txns',
    'tps',
  ];
  const out: Record<string, number | string> = {};
  for (const k of keep) {
    const v = s[k];
    if (v === undefined) {
      throw new Error(`parseStats: schema drift — \`${k}\` missing from stats[0]`);
    }
    out[k] = typeof v === 'number' ? v : String(v);
  }
  return out;
}

export interface Pool {
  accountId: string;
  percent: number; // API-computed share of total stake
  cumulativePercent: number; // API-computed running total across the full set
  stakeYocto: string;
}

export interface ValidatorsData {
  seats: number;
  totalStakeYocto: string;
  lastEpochApyPct: number;
  pools: Pool[];
}

/** Parse the /v1/validators capture. The source paginates validatorFullData
 * at 25 rows of 371 seats, but each row carries percent and
 * cumulativeStake.cumulativePercent computed by the API across the whole
 * set — sufficient for any threshold under 65.12% (workbook §4). */
export function parseValidators(raw: string): ValidatorsData {
  const d = JSON.parse(raw) as Record<string, unknown>;
  const full = d['validatorFullData'];
  if (!Array.isArray(full) || full.length === 0) {
    throw new Error('parseValidators: schema drift — validatorFullData missing/empty');
  }
  // `total` counts every validator account (742); `currentValidators` is the
  // active seat count (371) — the figure that matches block production.
  const seatsRaw = d['currentValidators'];
  const seats = Number(seatsRaw);
  if (!Number.isFinite(seats) || seats <= 0) {
    throw new Error('parseValidators: schema drift — `currentValidators` (seats) missing');
  }
  const totalStakeYocto = d['totalStake'];
  if (typeof totalStakeYocto !== 'string') {
    throw new Error('parseValidators: schema drift — totalStake missing');
  }
  const apy = Number(d['lastEpochApy']);
  if (!Number.isFinite(apy)) {
    throw new Error('parseValidators: schema drift — lastEpochApy missing');
  }
  const pools: Pool[] = [];
  for (let i = 0; i < full.length; i++) {
    const r = full[i] as Record<string, any>;
    const accountId = r['accountId'];
    const percent = Number(r['percent']);
    const cumRaw = (r['cumulativeStake'] as Record<string, unknown> | undefined)?.['cumulativePercent'];
    const cumulativePercent = Number(cumRaw);
    const stakeYocto = (r['currentEpoch'] as Record<string, unknown> | undefined)?.['stake'];
    if (typeof accountId !== 'string' || !Number.isFinite(percent) || !Number.isFinite(cumulativePercent)) {
      throw new Error(`parseValidators: schema drift — row ${i} lacks accountId/percent/cumulativePercent`);
    }
    pools.push({
      accountId,
      percent,
      cumulativePercent,
      stakeYocto: typeof stakeYocto === 'string' ? stakeYocto : '0',
    });
  }
  return { seats, totalStakeYocto, lastEpochApyPct: apy, pools };
}
