# Sources — every endpoint, call and real response

Three HTTPS GETs, no authentication, no API key, no rate-limit negotiation. Each response is stored byte-for-byte in `data/raw/`, with its URL, UTC fetch timestamp, byte length and SHA-256 recorded in `data/captures.json`.

All three were captured within 900 ms of each other, so every figure in the project describes one consistent moment:

| id | URL | fetchedAt (UTC) | bytes | sha256 (first 12) |
| --- | --- | --- | --- | --- |
| `charts` | `https://api.nearblocks.io/v1/charts` | 2026-11-14T16:44:22.173Z | 1,544,699 | `ea41ab718c87` |
| `stats` | `https://api.nearblocks.io/v1/stats` | 2026-11-14T16:44:22.385Z | 480 | `a819cd664eea` |
| `validators` | `https://api.nearblocks.io/v1/validators` | 2026-11-14T16:44:23.058Z | 19,924 | `8a5b7e0fdc7c` |

> **Attribution.** All on-chain data in this project comes from [NearBlocks](https://nearblocks.io), a public NEAR explorer. No endpoint required a key at capture time. The audit findings below are observations about specific fields in a public API, recorded so that figures drawn from them are not quoted blindly — not criticism of the service, which is the most complete public source for NEAR history that exists.

---

## 1 · `/v1/charts` — the daily series

**The spine of the project.** One row per day from NEAR mainnet genesis to the day before capture: **2,307 rows, 2020-07-21 → 2026-11-13.** Twelve of the fifteen propositions derive from this file alone.

Each row carries 20 fields:

`date`, `near_price`, `market_cap`, `total_supply`, `circulating_supply`, `blocks`, `gas_fee`, `gas_used`, `txns`, `txn_volume`, `txn_volume_usd`, `txn_fee`, `txn_fee_usd`, `new_accounts`, `active_accounts`, `deleted_accounts`, `new_contracts`, `active_contracts`, `unique_contracts`, `multichain_txns`

Real response, last row of the committed capture (truncated):

```json
{ "charts": [ "...2306 rows...",
  {
    "date": "2026-11-13T00:00:00.000Z",
    "near_price": "3.41914019",
    "market_cap": "4484370345.164358",
    "total_supply": "1311625144032720116407840772458244",
    "circulating_supply": "1249836992159308065117756741322730",
    "blocks": "150839",
    "gas_fee": "1261640831619458657000000000.00000000",
    "txns": "1036324",
    "txn_fee": "1061519366446306313900000000.00000000",
    "txn_fee_usd": "3627.70774452",
    "new_accounts": "6304",
    "active_accounts": "85595"
  }
] }
```

**Handling notes**

- Every numeric field arrives as a **string**, and supply and fee fields are in **yoctoNEAR** (1 NEAR = 10^24 yocto). All conversion goes through the single helper in `src/units.ts`; there are no inline `1e24` divisions.
- `src/compute/parse.ts` **throws on schema drift** rather than coercing a missing key to zero. A silent zero is how a thesis publishes a false figure.
- The series ends the day *before* capture, so "latest" everywhere means 2026-11-13.

**Audit outcome — four of these 20 fields do not survive the gate:**

| Field | Reason | Evidence | Proposition |
| --- | --- | --- | --- |
| `multichain_txns` | `EMPTY_SERIES` | no non-null, non-zero value on any of 2,307 days | T-05 |
| `circulating_supply` | `FROZEN` | last changed 2025-08-27, while `total_supply` kept climbing | T-06 |
| `active_contracts` | `DEFINITIONAL_BREAK` | 2024-06-01: 738 → 776,038, persistent | T-07 |
| `deleted_accounts` | `DEFINITIONAL_BREAK` | 2024-08-15: 16 → 63,170, persistent | T-12 |

Note that `circulating_supply` appears in every row of the series and is *also* returned by `/v1/stats` — with the same frozen value. Any float-adjusted market cap, FDV ratio or "percent circulating" computed from either endpoint inherits the staleness. This project computes none.

---

## 2 · `/v1/stats` — live aggregates

A single object of current network aggregates. 480 bytes. Supplies the market capitalisation used in T-14 and context figures; no proposition depends on its `circulating_supply`.

The complete committed response:

```json
{"stats":[{"id":1,
  "total_supply":"1311701694905998226994908653354720",
  "circulating_supply":"1249836992159308065117756741322730",
  "avg_block_time":"0.57140000","gas_price":"100000000","nodes_online":371,
  "near_price":"3.11000000","near_btc_price":"0.00004764",
  "market_cap":"4084158686.00000000","volume":"494725973.00000000",
  "high_24h":"3.55000000","high_all":"20.44000000",
  "low_24h":"3.18000000","low_all":"0.52676200",
  "change_24":"-11.13682000","total_txns":"5482957605","tps":8}]}
```

**Handling note.** `near_price` here (3.11) differs from the last daily row's `near_price` (3.4191) because one is a spot read at capture time and the other is a daily aggregate for the previous day. T-14 uses `market_cap` from this file and annualised fees from the daily series, and the record's `support` block states the basis — *fees as earnings; the capture-time market cap, not a live price* — so the mixture is explicit rather than silent.

---

## 3 · `/v1/validators` — stake distribution

Powers T-09 (Nakamoto coefficient) and T-11 (operator-clustered coefficient).

Top-level keys include `currentValidators`, `totalStake`, `lastEpochApy`, `epochProgressData`, `latestBlock`, `validatorFullData` and `validatorTelemetry`.

Real response shape, first pool (truncated):

```json
{
  "currentValidators": 371,
  "totalStake": "<yoctoNEAR>",
  "lastEpochApy": "4.91",
  "validatorFullData": [
    {
      "index": 0,
      "accountId": "astro-stakers.poolv1.near",
      "percent": "5.61",
      "cumulativeStake": { "cumulativePercent": "5.61", "ownPercentage": "5.61",
                           "accumulatedPercent": "0.00" },
      "currentEpoch": { "stake": "<yoctoNEAR>", "progress": { "blocks": {}, "chunks": {} } },
      "poolInfo": { "delegatorsCount": 32344, "fee": { "numerator": 1, "denominator": 100 } },
      "contractStake": null,
      "description": { "country_code": "AQ", "url": "...", "twitter": "..." },
      "stakingStatus": "active"
    }
  ]
}
```

**Three handling notes, all of which shaped what we would and would not compute:**

1. **`validatorFullData` is paginated at 25 rows of the 371 seats.** But each row carries `cumulativeStake.cumulativePercent`, computed by the API across the whole validator set, reaching 65.12% by row 25. Any stake threshold below that is therefore computable from this single capture — and both of ours (33%) are. A threshold above 65.12% would not be, and we compute none.
2. **`contractStake` is `null` on every row.** Not used.
3. **`description.country_code` is inconsistently cased across rows** — `AQ`, `us`, `US`, `de` — so grouping by it would compare mismatched keys. Geographic concentration was **dropped entirely** rather than normalised on a guess. Stake concentration was kept.

**What is computed:** the Nakamoto coefficient at the 33% consensus threshold, by accumulating `cumulativePercent` until it is crossed (T-09); and the same figure after grouping pools by `accountId` name prefix (T-11), which is an **explicit heuristic** because operator identity is not present in the data at all. T-11's record carries `heuristic: true` and a mandatory caveat, and the UI will not render it without displaying that caveat.

---

## 4 · Re-fetching, and what changes

```bash
npm run fetch      # re-captures all three; needs network
npm run compute    # recomputes the snapshot from whatever is in data/raw/
npm run verify     # re-fetches, recomputes, and diffs against the committed snapshot
```

`npm run verify` is the honest one: the sources move, so a re-fetch will differ byte-wise from the committed captures almost immediately. That is expected and is **not** itself a failure — the report says so in as many words. What matters is whether each *figure* still reproduces, and `VERIFY.md` names every metric that drifted with both values.

A judge needs none of this: the captures are committed, so `npm run verify:offline` reproduces all fifteen figures with the network unplugged.

**One environmental caveat worth recording.** Some CI and container environments sit behind an egress allow-list that refuses `CONNECT api.nearblocks.io:443` outright (HTTP 403) — we hit exactly that during the build, along with the same refusal for `rpc.mainnet.near.org`. This is why capture is isolated as the only networked step: everything downstream, including the whole test suite and `verify:offline`, runs on committed bytes and is unaffected. See [FEEDBACK.md](FEEDBACK.md) #14.
