// src/propositions.ts — the proposition set (workbook §5).
// Each falsifier sentence is written BEFORE the value is computed and is
// never edited afterwards. `kind` is its machine form, applied only in
// compute/verdict.ts — no other module may produce a Verdict.

import type { PropositionSpec } from './types.js';

export const PROPOSITIONS: PropositionSpec[] = [
  {
    id: 'T-01',
    proposition: "NEAR's on-chain usage is growing",
    metric: '30-day mean active_accounts vs trailing-24-month peak, as % of peak',
    falsifier: 'UNSUPPORTED if the 30-day mean is below 50% of the 24-month peak',
    kind: 'lt-50',
    unit: 'pct',
    dependsOn: ['active_accounts'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.activeAccountsVsPeak',
  },
  {
    id: 'T-02',
    proposition: 'Fee burn has turned off its trough',
    metric: 'latest 3-month sum of txn_fee (NEAR) vs the prior 3-month sum, % change',
    falsifier: 'UNSUPPORTED if the latest 3-month sum is less than or equal to the prior one',
    kind: 'le-0',
    unit: 'pct',
    dependsOn: ['txn_fee'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.feeBurnInflection',
  },
  {
    id: 'T-03',
    proposition: 'Issuance is decelerating',
    metric: 'trailing-12-month total_supply growth rate vs lifetime CAGR, both annualised %',
    falsifier: 'UNSUPPORTED if the trailing-12-month rate is greater than or equal to the lifetime CAGR',
    kind: 'ttm-ge-lifetime',
    unit: 'pct',
    dependsOn: ['total_supply'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.issuanceDeceleration',
  },
  {
    id: 'T-04',
    proposition: 'Price tracks on-chain fundamentals',
    metric: 'Pearson r of monthly mean near_price vs monthly mean active_accounts, last 12 full months',
    falsifier: 'UNSUPPORTED if r < 0.3',
    kind: 'lt-0.3',
    unit: 'ratio',
    dependsOn: ['near_price', 'active_accounts'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.priceUsageCorrelation',
  },
  {
    id: 'T-05',
    proposition: 'Cross-chain traction is measurable from public data',
    metric: 'count of usable multichain_txns days (non-null, non-zero)',
    falsifier: 'DATA_UNUSABLE if zero usable days in the series',
    kind: 'unusable-zero-usable-days',
    unit: 'count',
    dependsOn: ['multichain_txns'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.multichainUsableDays',
  },
  {
    id: 'T-06',
    proposition: 'Float-adjusted valuation is computable from this source',
    metric: 'days since circulating_supply last changed',
    falsifier: 'DATA_UNUSABLE if the field is stale by more than 90 days',
    kind: 'unusable-stale-gt-90',
    unit: 'days',
    dependsOn: ['circulating_supply'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.circulatingStaleness',
  },
  {
    id: 'T-07',
    proposition: 'Developer activity is comparable across the full series',
    metric: 'largest day-over-day ratio in active_contracts',
    falsifier: 'DATA_UNUSABLE if any day-over-day ratio exceeds 50x on a base above 100',
    kind: 'unusable-break-gt-50x',
    unit: 'ratio',
    dependsOn: ['active_contracts'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.contractBreakRatio',
  },
  {
    id: 'T-08',
    proposition: 'Contract deployment is recovering',
    metric: 'monthly new_contracts, latest full month vs trailing-12-month mean, as a ratio',
    falsifier: 'UNSUPPORTED if the latest month is less than or equal to the trailing mean',
    kind: 'le-1',
    unit: 'ratio',
    dependsOn: ['new_contracts'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.newContractsVsMean',
  },
  {
    id: 'T-09',
    proposition: 'The validator set is adequately decentralised',
    metric: 'Nakamoto coefficient at the 33% consensus-halt threshold (validator level)',
    falsifier: 'UNSUPPORTED if the coefficient is below 15',
    kind: 'lt-15',
    unit: 'count',
    dependsOn: ['validators'],
    fromCaptures: ['validators'],
    computedBy: 'metrics.validatorNakamoto',
  },
  {
    id: 'T-10',
    proposition: 'Block production is stable',
    metric: 'coefficient of variation (sample stdev / mean, %) of monthly mean blocks/day over the last 12 full months',
    falsifier: 'UNSUPPORTED if the coefficient of variation exceeds 10%',
    kind: 'gt-10',
    unit: 'pct',
    dependsOn: ['blocks'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.blockStability',
  },
  {
    id: 'T-11',
    proposition: 'Operator-level concentration is no worse than validator-level',
    metric: 'Nakamoto coefficient at 33% after grouping staking pools by shared name-prefix tokens',
    falsifier: 'UNSUPPORTED if the grouped coefficient is lower than the ungrouped one',
    kind: 'lt-ungrouped',
    unit: 'count',
    dependsOn: ['validators'],
    fromCaptures: ['validators'],
    computedBy: 'metrics.operatorClusteredNakamoto',
  },
];

export const T11_CAVEAT =
  'Heuristic finding. Pools are grouped by shared name-prefix tokens; one pool ' +
  '(svrn_bitwise) matches two groups and is counted once, in the larger group ' +
  'it first joins. A shared prefix suggests but does not prove common operation — ' +
  'confirming it requires operator disclosure this source does not carry.';

export function specById(id: string): PropositionSpec {
  const spec = PROPOSITIONS.find((p) => p.id === id);
  if (!spec) throw new Error(`unknown proposition id: ${id}`);
  return spec;
}
