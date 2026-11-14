# AUDIT.md — the data-quality findings

**What this is.** Before stating a single proposition, an audit gate ran on **all 20 fields** exposed by `api.nearblocks.io` (the 19 daily charts fields plus the validators capture) — not only on the fields already suspected. A field must prove itself non-empty, live, and definitionally continuous before any proposition is allowed to stand on it. The gate is deterministic code (`src/compute/audit.ts`); its calibration is published; a further failure would appear on the console's Audit page with no code change.

## The gate, precisely

Applied in fixed order to each field's full daily series:

1. **EMPTY_SERIES** — no non-null, non-zero value anywhere in the series.
2. **FROZEN** — unchanged for more than 90 days of series, measured against the **last row of the series** (data, not the wall clock — the compute layer contains no clock).
3. **DEFINITIONAL_BREAK** — a day-over-day jump greater than 50× that (a) starts from a base already typical of the field — at least half the median of its non-zero values, which is scale-invariant — and (b) **persists**: the median of the following seven days stays at least 10× the pre-jump base.

Why the calibration looks like this: the naive form ("ratio > 50× on a base > 100") is vacuous for yocto-scaled fields (every base exceeds 100) and meaningless for dollar-scaled ones. Worked examples **on this very series**:

- `txn_fee` moved ~201× on **2020-07-22, day two of chain history** (0.009 → 1.9 NEAR) and ~84× on 2020-08-21 — but from bases microscopic next to the field's median. Organic launch noise; fails test (a). The field is usable, and T-02 computes.
- `new_contracts` jumped 73× on 2023-01-30 (20 → 1,465) and was **back the next day**. A deploy wave, not a redefinition; fails test (b). The field is usable, and T-08 computes.
- `active_contracts` jumped 1,052× on 2024-06-01 (738 → 776,038) and **never came back down**. Passes all three. A genuine definitional break.

## Findings — fields that cannot support any verdict

| Field | Reason | Evidence |
| --- | --- | --- |
| `multichain_txns` | **EMPTY_SERIES** | 0 of 2,307 days have a non-null, non-zero value. The cross-chain series the endpoint advertises does not exist. |
| `circulating_supply` | **FROZEN** | Last change **2025-08-27**; stale by **443 days** at capture time, frozen at 1,249,836,992 NEAR while `total_supply` rose to 1,311,625,144. Any float, free-float market cap or FDV ratio built on this field is wrong. |
| `active_contracts` | **DEFINITIONAL_BREAK** | **2024-06-01: 738 → 776,038 (1,052×), persistent.** Values either side are not the same quantity; every multi-year comparison drawn from the field is meaningless. |
| `deleted_accounts` | **DEFINITIONAL_BREAK** — additional finding | **2024-08-15: 16 → 63,170 (3,948×), persistent.** Discovered by running the gate on every field. No proposition depends on this field; it is reported because it is there. One-day mass-deletion spikes earlier in the series (e.g. 2024-02-02: 8 → 205,809, reverting the next day) correctly do **not** trip the gate — they fail the persistence test. |

## Fields that passed — checked anyway, not assumed

`near_price`, `market_cap`, `total_supply`, `blocks`, `gas_fee`, `gas_used`, `txns`, `txn_volume`, `txn_volume_usd`, `txn_fee`, `txn_fee_usd`, `new_accounts`, `active_accounts`, `new_contracts`, `unique_contracts`, and the `validators` capture (25 rows paginated of 371 seats; `percent` and `cumulativePercent` present on every row; thresholds above the top-25 cumulative share of 65.12% are out of reach).

Large organic moves inside usable fields, for the record: `txn_fee` max day-over-day ≈ 201× (day two), `txn_volume` ≈ 9,156× (2020-09-07, the Rainbow Bridge era), `blocks` ≈ 12× (day two). All fail the base test — the pre-jump values were microscopic next to each field's own median — which is precisely the discrimination an absolute threshold cannot make.

## Why this matters for the thesis

These are the three (now four) numbers a rushed NEAR thesis is most likely to quote: cross-chain traction, float-adjusted valuation, developer activity — the kind of figure that goes straight into a bull case. Being the entry that *checked* is the differentiator, and reporting the fourth finding unprompted is the difference between an audit and a hardcoded anecdote.
