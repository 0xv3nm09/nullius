# PROPOSITIONS.md — the fifteen specs

Each falsifier was written **before** the value was computed and has never been edited. The verdict is assigned by code (`src/compute/verdict.ts` — the only place in the codebase a `Verdict` is produced) by applying the falsifier to the value. If your re-run disagrees with a verdict below, trust the pipeline and fix this table.

Values below are from the committed snapshot (`data/snapshot.json`, generated 2026-11-14T17:00:46.109Z, captures fetched ~16:44 UTC from `api.nearblocks.io`). Chain head: `d3ae227a…` (regenerated after the T-12…T-15 expansion).

| id | Proposition | Metric | Falsifier | Value | Verdict |
| --- | --- | --- | --- | --- | --- |
| **T-01** | NEAR's on-chain usage is growing | 30-day mean `active_accounts` vs trailing-24-month peak, as % of peak | UNSUPPORTED if the 30-day mean is below 50% of the peak | **2.87%** | **UNSUPPORTED** |
| **T-02** | Fee burn has turned off its trough | latest 3-month sum of `txn_fee` (NEAR) vs prior 3-month sum, % change | UNSUPPORTED if latest ≤ prior | **+23.28%** | **SUPPORTED** |
| **T-03** | Issuance is decelerating | trailing-12-month `total_supply` growth (annualised) vs lifetime CAGR | UNSUPPORTED if TTM ≥ lifetime | **2.48%** vs **4.39%** | **SUPPORTED** |
| **T-04** | Price tracks on-chain fundamentals | Pearson r of monthly mean `near_price` vs monthly mean `active_accounts`, last 12 full months | UNSUPPORTED if r < 0.3 | **−0.514** | **UNSUPPORTED** |
| **T-05** | Cross-chain traction is measurable from public data | count of usable `multichain_txns` days | DATA_UNUSABLE if zero usable days | **0 of 2,307** | **DATA_UNUSABLE** |
| **T-06** | Float-adjusted valuation is computable from this source | days since `circulating_supply` last changed | DATA_UNUSABLE if stale > 90 days | **443 days** (frozen 2025-08-27) | **DATA_UNUSABLE** |
| **T-07** | Developer activity is comparable across the full series | largest day-over-day ratio in `active_contracts` | DATA_UNUSABLE if any break > 50× | **1,052×** on 2024-06-01 | **DATA_UNUSABLE** |
| **T-08** | Contract deployment is recovering | monthly `new_contracts`, latest full month vs trailing-12-month mean, as ratio | UNSUPPORTED if latest ≤ mean | **2.26×** (Oct 2026: 1,030 vs mean ≈ 455) | **SUPPORTED** |
| **T-09** | The validator set is adequately decentralised | Nakamoto coefficient at the 33% consensus-halt threshold (validator level) | UNSUPPORTED if coefficient < 15 | **9** (33.51% at `bitwise_2.poolv1.near`) | **UNSUPPORTED** |
| **T-10** | Block production is stable | coefficient of variation (sample stdev/mean, %) of monthly mean `blocks`/day, last 12 full months | UNSUPPORTED if cv > 10% | **1.40%** | **SUPPORTED** |
| **T-11** | Operator-level concentration is no worse than validator-level | Nakamoto coefficient at 33% after grouping pools by shared name-prefix tokens | UNSUPPORTED if grouped < ungrouped | **5** vs **9** | **UNSUPPORTED** — **heuristic, see caveat** |
| **T-12** | Account churn is comparable across the full series | largest persistent day-over-day ratio in `deleted_accounts` | DATA_UNUSABLE if any break > 50× | **3,948×** on 2024-08-15 | **DATA_UNUSABLE** |
| **T-13** | Fee burn materially offsets issuance | `txn_fee` burned over the last 12 full months, as % of gross `total_supply` issuance over the trailing 365 days | UNSUPPORTED if the offset is below 10% | **1.95%** | **UNSUPPORTED** |
| **T-14** | The valuation is supported by fee revenue | market cap ÷ trailing-12-full-month `txn_fee_usd` (the fee multiple) | UNSUPPORTED if the multiple exceeds 300× | **3,387×** | **UNSUPPORTED** |
| **T-15** | Transactions are getting richer, not just rarer | fee per transaction (monthly `txn_fee` / `txns`), latest 3 full months vs prior 3, % change | UNSUPPORTED if flat or falling | **+31.31%** | **SUPPORTED** |

### T-11 caveat (travels with the number everywhere it renders)

> Heuristic finding. Pools are grouped by shared name-prefix tokens; one pool (`svrn_bitwise`) matches two groups and is counted once, in the larger group it first joins. A shared prefix suggests but does not prove common operation — confirming it requires operator disclosure this source does not carry.

The clusters the heuristic finds: `figment` (figment, ledgerbyfigment) 8.57% · `cnear` (cnear-1/2/3) 8.04% · `bitwise` (bitwise_1, bitwise_2, svrn_bitwise) 7.96% · `svrn` (svrn-ai, svrn.pool, svrn-luganodes, svrn_bitwise) 7.74%.

### Notes a reviewer will want

- T-12 exists because the audit gate found `deleted_accounts` on its own; the proposition records the finding rather than letting a broken field pass unmentioned. Its detector is the same code path as the gate's, so record and audit cannot disagree.
- T-13's bar (10%) and T-14's bar (300×) were written into the falsifiers before the values were computed; both fail by an order of magnitude. T-14 uses the capture-time market cap ($4.084B ÷ $1.206M TTM fees), not a live price.
- T-13's threshold is not self-chosen convenience: Messari's 2026 Crypto Theses argues "at minimum, a chain's daily gas fee revenue should exceed the amount it distributes through inflationary rewards" — NEAR's burn offsets under 2% of gross issuance, and the burn itself is gas-only (see the Intents caveat), which makes the failure starker, not softer.
- T-14 ships both denominations: the USD multiple (3,387×) and a NEAR-denominated twin (market cap in NEAR ÷ TTM fees in NEAR ≈ 2,125×) — USD metrics flatter or distort fundamentals during a price rally (Blockworks, 2026-11-04). For peer context, public reporting puts Aptos at ~6,369×, making NEAR's multiple mid-pack rather than uniquely damning.
- T-04's r = −0.514 measures price against the fundamentals this source contains; the dominant post-fee-switch revenue line (NEAR Intents, ~85% of REV, recycled via buybacks) is absent from `txn_fee`. The honest reading is not "price ignores fundamentals" but "price tracks a fundamental this endpoint does not carry" — see the Intents note in Method.

- T-02's single-month headline: Jul 2026 = 24,956 NEAR → Oct 2026 = 39,440 NEAR, **+58.04%** off the trough (the trough month is included in `support.pctLatestVsTrough`).
- T-01's metric is the 30-day mean per the proposition's stated definition; a latest-day reading gives ≈3.8% of peak. Either way the falsifier (< 50%) is failed by an order of magnitude.
- T-05/T-06/T-07 carry `value: null` in the snapshot (FR-08: a proposition whose source field is unusable never renders a numeric verdict); their diagnostic numbers live in `support` and on the Audit page.
- The Nakamoto walk uses the API's own `cumulativePercent` fields, computed by the source across the full 371-seat set — sufficient for any threshold under 65.12% (the top-25 cumulative share).
- Re-derive any verdict yourself: `decide(spec, value, audit, support)` in `src/compute/verdict.ts`, or run `npm test` (TS-07 re-applies every falsifier to every committed record).
