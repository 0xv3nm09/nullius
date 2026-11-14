// src/compute/index.ts — assembles the snapshot. Pure given its inputs: the
// generatedAt timestamp and the signing secret are INJECTED by the CLI, so
// running the build twice with the same inputs is byte-identical (FR-04).

import type { Capture, FieldAudit, MetricRecord, Snapshot } from '../types.js';
import { PROPOSITIONS, specById } from '../propositions.js';
import { PROSE } from '../prose.js';
import { yoctoToNear, fmt } from '../units.js';
import { parseCharts, parseStats, parseValidators, CHART_FIELDS } from './parse.js';
import { auditAll, auditField } from './audit.js';
import * as M from './metrics.js';
import { decide } from './verdict.js';
import { link, type RecordBase } from './chain.js';
import { signAll } from './receipt.js';
import { clusterByPrefix } from './cluster.js';
import type { DailyRow } from './row.js';

export interface SnapshotInput {
  chartsRaw: string;
  statsRaw: string;
  validatorsRaw: string;
  captures: Capture[];
}

export interface SnapshotOptions {
  generatedAt: string; // the ONLY nondeterministic field
  signingSecret?: string; // absent → receipts shipped unsigned, flagged
}

export async function buildSnapshot(input: SnapshotInput, opts: SnapshotOptions): Promise<Snapshot> {
  const rows = parseCharts(input.chartsRaw);
  const stats = parseStats(input.statsRaw);
  const validators = parseValidators(input.validatorsRaw);

  // ---- audit gate on EVERY charts field, plus the validator capture ----
  const audit: FieldAudit[] = [...auditAll(rows, [...CHART_FIELDS])];
  audit.push({
    field: 'validators',
    usable: true,
    detail: `validatorFullData: ${validators.pools.length} rows paginated of ${validators.seats} seats; percent and cumulativePercent present on every row`,
    evidence: {
      seats: validators.seats,
      rowsParsed: validators.pools.length,
      totalStakeNear: yoctoToNear(validators.totalStakeYocto),
      lastEpochApyPct: validators.lastEpochApyPct,
      note: 'paginated source — thresholds above the top-25 cumulative share are out of reach',
    },
  });

  // ---- metrics ----
  const outs: Record<string, M.MetricOut> = {
    'T-01': M.activeAccountsVsPeak(rows),
    'T-02': M.feeBurnInflection(rows),
    'T-03': M.issuanceDeceleration(rows),
    'T-04': M.priceUsageCorrelation(rows),
    'T-05': M.multichainUsableDays(rows),
    'T-06': M.circulatingStaleness(rows),
    'T-07': M.contractBreakRatio(rows),
    'T-08': M.newContractsVsMean(rows),
    'T-09': M.validatorNakamoto(validators),
    'T-10': M.blockStability(rows),
    'T-11': M.operatorClusteredNakamoto(validators),
  };

  // FR-08 in exactly one place: a proposition whose source field failed the
  // audit gate gets value: null, never a numeric verdict.
  const bases: RecordBase[] = PROPOSITIONS.map((spec) => {
    const out = outs[spec.id] as M.MetricOut;
    const unusableDep = spec.dependsOn.some((f) => {
      const a = audit.find((x) => x.field === f);
      return a ? !a.usable : false; // missing entry → decide() throws, per FR-06
    });
    const value = unusableDep ? null : out.value;
    return {
      id: spec.id,
      proposition: spec.proposition,
      metric: spec.metric,
      falsifier: spec.falsifier,
      value,
      unit: spec.unit,
      verdict: decide(spec, value, audit, out.support),
      dependsOn: spec.dependsOn,
      fromCaptures: spec.fromCaptures,
      computedBy: spec.computedBy,
      support: out.support,
      ...(spec.id === 'T-11' ? { heuristic: true as const, caveat: M.clusteredWithCaveat(validators).caveat } : {}),
    };
  });

  let metrics: MetricRecord[] = link(bases);
  let receiptsSigned = false;
  if (opts.signingSecret) {
    metrics = await signAll(metrics, opts.signingSecret);
    receiptsSigned = true;
  }

  const summary = {
    supported: metrics.filter((m) => m.verdict === 'SUPPORTED').length,
    unsupported: metrics.filter((m) => m.verdict === 'UNSUPPORTED').length,
    inconclusive: metrics.filter((m) => m.verdict === 'INCONCLUSIVE').length,
    dataUnusable: metrics.filter((m) => m.verdict === 'DATA_UNUSABLE').length,
    chainHead: (metrics[metrics.length - 1] as MetricRecord | undefined)?.hash ?? '',
    seriesDays: rows.length,
    conclusion: conclusion(metrics),
  };

  const snapshot: Snapshot = {
    schemaVersion: 1,
    generatedAt: opts.generatedAt,
    captures: input.captures,
    stats,
    audit,
    metrics,
    prose: PROSE,
    summary,
    evidence: evidenceSeries(rows, validators),
    anchor: null,
  };
  void receiptsSigned; // surfaced by the CLI banner, not the snapshot shape
  return snapshot;
}

/** Code-derived thesis conclusion. Every number is interpolated from the
 * metric records — this string is `code`-derived, never model prose. */
function conclusion(metrics: MetricRecord[]): string {
  const by = (id: string) => metrics.find((m) => m.id === id) as MetricRecord;
  const s = summaryCounts(metrics);
  const t01 = by('T-01');
  const t02 = by('T-02');
  const t03 = by('T-03');
  const t08 = by('T-08');
  const t09 = by('T-09');
  const t11 = by('T-11');
  const pct = (v: number | null, d = 2) => (v === null ? 'n/a' : fmt(v, d));
  return (
    `Of ${metrics.length} propositions: ${s.supported} SUPPORTED, ${s.unsupported} UNSUPPORTED, ${s.dataUnusable} DATA_UNUSABLE. ` +
    `The bull case cannot rest on usage, on float-adjusted valuation, or on decentralisation. ` +
    `It rests on supply discipline (T-03: ${pct(t03.value)}% TTM issuance vs ${pct(Number(t03.support['lifetimeCagrPct']))}% lifetime), ` +
    `a fee-burn inflection (T-02: ${pct(t02.value)}% on three-month sums; ${pct(Number(t02.support['pctLatestVsTrough']))}% since the trough month), ` +
    `and a deployment recovery (T-08: ${pct(t08.value)}x the trailing-year mean) ` +
    `— against usage at ${pct(t01.value)}% of its peak (T-01), ` +
    `price not tracking usage (T-04: r = ${pct(by('T-04').value, 3)}), ` +
    `a Nakamoto coefficient of ${t09.value} at the consensus threshold (T-09), ` +
    `and operator clustering that may cut that to ${t11.value} (T-11, heuristic).`
  );
}

function summaryCounts(metrics: MetricRecord[]) {
  return {
    supported: metrics.filter((m) => m.verdict === 'SUPPORTED').length,
    unsupported: metrics.filter((m) => m.verdict === 'UNSUPPORTED').length,
    inconclusive: metrics.filter((m) => m.verdict === 'INCONCLUSIVE').length,
    dataUnusable: metrics.filter((m) => m.verdict === 'DATA_UNUSABLE').length,
  };
}

/** Downsampled, deterministic evidence series backing the Audit charts.
 * Weekly sampling (every 7th row) with the final row always included, plus
 * the exact definitional-break day for the contracts series. */
function evidenceSeries(rows: DailyRow[], validators: ReturnType<typeof parseValidators>): Snapshot['evidence'] {
  const idx: number[] = [];
  for (let i = 0; i < rows.length; i += 7) idx.push(i);
  const lastIdx = rows.length - 1;
  if (!idx.includes(lastIdx)) idx.push(lastIdx);

  const supply = idx.map((i) => {
    const r = rows[i] as DailyRow;
    return { date: r.date.slice(0, 10), total: yoctoToNear(r.total_supply ?? 0), circulating: yoctoToNear(r.circulating_supply ?? 0) };
  });

  const breakField = auditField(rows, 'active_contracts');
  const breakDate = typeof breakField.evidence['breakDate'] === 'string' ? (breakField.evidence['breakDate'] as string) : null;
  const contractsIdx = new Set(idx);
  if (breakDate) {
    const bi = rows.findIndex((r) => r.date.slice(0, 10) === breakDate);
    if (bi >= 0) contractsIdx.add(bi);
  }
  const contracts = [...contractsIdx]
    .sort((a, b) => a - b)
    .map((i) => {
      const r = rows[i] as DailyRow;
      return { date: r.date.slice(0, 10), value: r.active_contracts ?? 0 };
    });

  const multichain = idx.map((i) => {
    const r = rows[i] as DailyRow;
    return { date: r.date.slice(0, 10), value: r.multichain_txns ?? 0 };
  });

  const cumulativeStake = validators.pools.map((p) => ({ accountId: p.accountId, cumulativePercent: p.cumulativePercent }));
  const clusters = clusterByPrefix(validators.pools)
    .filter((c) => c.members.length > 1) // a cluster of one pool is not a finding
    .slice(0, 12)
    .map((c) => ({
      cluster: c.cluster,
      members: c.members.map((m) => m.accountId),
      percent: Math.round(c.percent * 100) / 100,
    }));

  // Concentration curves. Ungrouped: the API's own cumulative percent per
  // validator seat. Clustered: the same union walk T-11 uses, recorded step
  // by step so the chart shows where operator groups cross the 33% line.
  const ungroupedCurve = validators.pools.map((p, i) => ({ n: i + 1, cumulativePercent: p.cumulativePercent }));
  const ordered = clusterByPrefix(validators.pools);
  const seen = new Set<string>();
  let cum = 0;
  const clusteredCurve: { n: number; cumulativePercent: number }[] = [];
  for (const c of ordered) {
    let fresh = 0;
    for (const m of c.members) if (!seen.has(m.accountId)) fresh += m.percent;
    if (fresh <= 0) continue;
    cum += fresh;
    for (const m of c.members) seen.add(m.accountId);
    clusteredCurve.push({ n: clusteredCurve.length + 1, cumulativePercent: Math.round(cum * 100) / 100 });
  }
  const ungroupedN = M.nakamotoAt(validators.pools, 33).value;
  const clusteredN = clusteredCurve.findIndex((p) => p.cumulativePercent >= 33) + 1;

  return {
    supply,
    contracts,
    multichain,
    cumulativeStake,
    clusters,
    concentration: {
      ungroupedCurve,
      clusteredCurve,
      ungroupedN,
      clusteredN: clusteredN > 0 ? clusteredN : clusteredCurve.length,
    },
  };
}

export { specById };
