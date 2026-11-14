// src/types.ts — the data contract (workbook §9).
// snapshot.json is the single source of truth for the UI; the view is a pure
// function of it. Every type here is written before any consumer exists.

export type Verdict = 'SUPPORTED' | 'UNSUPPORTED' | 'INCONCLUSIVE' | 'DATA_UNUSABLE';
export type UnusableReason = 'EMPTY_SERIES' | 'FROZEN' | 'DEFINITIONAL_BREAK';

export interface Capture {
  id: string; // 'charts' | 'stats' | 'validators'
  url: string;
  fetchedAt: string; // UTC ISO-8601
  bytes: number;
  sha256: string; // of the raw body
}

export interface FieldAudit {
  field: string; // 'multichain_txns' — or 'validators' for the validator capture
  usable: boolean;
  reason?: UnusableReason;
  detail: string; // 'frozen since 2025-08-27'
  evidence: Record<string, unknown>; // the numbers that prove it
}

export interface MetricRecord {
  id: string; // 'T-01'
  proposition: string;
  metric: string; // human description of what was measured
  falsifier: string; // stated before computing; never edited afterwards
  value: number | null; // null iff DATA_UNUSABLE
  unit: string; // 'NEAR' | 'accounts' | 'pct' | 'ratio' | 'count' | 'days'
  verdict: Verdict; // assigned only inside compute/verdict.ts
  dependsOn: string[]; // field names, each must appear in audit[]
  fromCaptures: string[]; // capture ids
  computedBy: string; // 'metrics.activeAccountsVsPeak'
  support: Record<string, number | string | null>; // the intermediate numbers
  heuristic?: true; // set on T-11; forces the caveat to render (FR-19)
  caveat?: string; // required and non-empty whenever heuristic is set
  chainIndex: number;
  prevHash: string;
  hash: string;
  receipt: string; // compact JWS (HS256) over the record; '' when unsigned
}

export interface Prose {
  id: string; // 'P-audit' …
  kind: 'prose'; // always — prose is never 'code'
  body: string; // must contain no digits except proposition ids (TS-13)
  model: string | null; // null when hand-written
}

export interface EvidencePoint {
  date: string;
  value: number;
}

export interface SupplyPoint {
  date: string;
  total: number; // NEAR
  circulating: number; // NEAR
}

export interface CumulativePoint {
  accountId: string;
  cumulativePercent: number;
}

export interface Snapshot {
  schemaVersion: 1;
  generatedAt: string; // UTC ISO-8601 — the ONLY nondeterministic field
  captures: Capture[];
  // live aggregates from /v1/stats at capture time — context for the reader
  // (price, market cap, nodes online); no proposition computes from these
  stats: Record<string, number | string>;
  audit: FieldAudit[];
  metrics: MetricRecord[];
  prose: Prose[];
  summary: {
    supported: number;
    unsupported: number;
    inconclusive: number;
    dataUnusable: number;
    chainHead: string;
    seriesDays: number; // rows in the daily series
    conclusion: string; // code-derived, digits included; never model text
  };
  // Downsampled series backing the Audit-page charts. Deterministic
  // reduction of the raw captures; the raw bytes remain in data/raw/.
  evidence: {
    supply: SupplyPoint[]; // weekly total vs circulating supply
    contracts: EvidencePoint[]; // weekly active_contracts + the break day
    multichain: EvidencePoint[]; // weekly multichain_txns
    cumulativeStake: CumulativePoint[]; // top-25 pools, API-computed cumulative %
    clusters: { cluster: string; members: string[]; percent: number }[];
    // concentration curves, computed here so the web layer stays a pure
    // renderer: validator-level and operator-clustered cumulative stake
    concentration: {
      ungroupedCurve: { n: number; cumulativePercent: number }[];
      clusteredCurve: { n: number; cumulativePercent: number }[];
      ungroupedN: number; // validators to cross the 33% line
      clusteredN: number; // operator groups to cross it (heuristic)
    };
  };
  anchor?: { network: 'testnet'; txHash: string; memo: string } | null; // FR-18 stretch
}

export interface PropositionSpec {
  id: string; // 'T-01'
  proposition: string;
  metric: string;
  falsifier: string; // the human sentence, written before the value
  kind: FalsifierKind; // the machine form, applied only in verdict.ts
  unit: string;
  dependsOn: string[]; // charts field names, or 'validators'
  fromCaptures: string[];
  computedBy: string;
}

// One variant per falsifier. verdict.ts is the only place these are applied.
export type FalsifierKind =
  | 'lt-50' // T-01  UNSUPPORTED if value < 50          (value = % of peak)
  | 'le-0' // T-02  UNSUPPORTED if value <= 0          (value = % change)
  | 'ttm-ge-lifetime' // T-03  UNSUPPORTED if value >= support.lifetimeCagrPct
  | 'lt-0.3' // T-04  UNSUPPORTED if value < 0.3         (value = Pearson r)
  | 'unusable-zero-usable-days' // T-05 (unusable field short-circuits first)
  | 'unusable-stale-gt-90' // T-06 (unusable field short-circuits first)
  | 'unusable-break-gt-50x' // T-07 (unusable field short-circuits first)
  | 'le-1' // T-08  UNSUPPORTED if value <= 1          (value = latest/mean)
  | 'lt-15' // T-09  UNSUPPORTED if value < 15          (value = Nakamoto @33%)
  | 'gt-10' // T-10  UNSUPPORTED if value > 10          (value = cv %)
  | 'lt-ungrouped'; // T-11  UNSUPPORTED if value < support.ungroupedNakamoto
