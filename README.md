# nullius — take nobody's word for it

An **executable NEAR investment thesis**. Every figure is computed by deterministic code from raw on-chain captures, every figure carries a signed provenance receipt, and one command re-runs the whole thesis against NEAR mainnet and tells you which figures still reproduce.

> Most theses ask you to believe them. This one ships with a verify command.

Built for the NEAR HACKATHON investment-thesis track. No backend, no keys, no sign-up: the console is a static build of a committed snapshot, and the verification runs from a fresh clone.

---

## The finding

**Three of the headline fields in NEAR's most-used public analytics endpoint (`api.nearblocks.io`) do not survive an audit.** These are exactly the numbers a rushed thesis would quote — cross-chain traction, float-adjusted valuation, and developer activity:

| Field | Finding | Evidence |
| --- | --- | --- |
| `multichain_txns` | **Empty for the entire history** | 0 of 2,307 days have a non-null, non-zero value |
| `circulating_supply` | **Frozen since 2025-08-27** at 1,249,836,992 NEAR while `total_supply` kept climbing | any float-adjusted valuation from this field is wrong |
| `active_contracts` | **Definitional break on 2024-06-01**: 738 → 776,038 in one day (~1,052×), never reconciled | values either side are not the same quantity |

The audit gate that found these ran on **all 20 fields** the endpoint exposes — and it surfaced a fourth, unrequested finding (`deleted_accounts`, a persistent 3,948× break on 2024-08-15) that no proposition depends on. It is reported anyway. See [AUDIT.md](AUDIT.md).

## Verdict summary

Eleven numbered propositions about NEAR, each with its falsifier written **before** the value was computed, each verdict assigned by code. Computed 2026-11-14 from live mainnet captures:

**4 SUPPORTED · 4 UNSUPPORTED · 3 DATA_UNUSABLE**

> Of 11 propositions: 4 SUPPORTED, 4 UNSUPPORTED, 3 DATA_UNUSABLE. The bull case cannot rest on usage, on float-adjusted valuation, or on decentralisation. It rests on supply discipline (T-03: 2.48% TTM issuance vs 4.39% lifetime), a fee-burn inflection (T-02: +23.28% on three-month sums; +58.04% since the trough month), and a deployment recovery (T-08: 2.26× the trailing-year mean) — against usage at 2.87% of its peak (T-01), price not tracking usage (T-04: r = −0.514), a Nakamoto coefficient of 9 at the consensus threshold (T-09), and operator clustering that may cut that to 5 (T-11, heuristic).

The full table is in [PROPOSITIONS.md](PROPOSITIONS.md) and rendered on the console's Thesis page.

## Try it in 60 seconds

No keys, no network needed for the first two:

```bash
npm install && npm run verify:offline
# → see: OFFLINE: 11/11 metrics recomputed from committed captures; chain head matches; liveness not checked. (exit 0)

npm run build && npx serve docs
# → see: the console at localhost:3000 with all eleven propositions populated, network unplugged

npm run verify        # needs network
# → see: VERIFY.md with an expected-vs-got row per metric

# tamper test — the provenance chain is load-bearing, not decorative:
# edit any `value` in data/snapshot.json, then:
npm run verify:chain
# → see: chain broken at index N: hash mismatch: expected … got … (exit 1)
```

A figure that legitimately moved when you run `npm run verify` is a **pass of the design, not a failure**: the thesis is built to be able to turn against itself without anyone editing it. `VERIFY.md` names each drifted metric with both values.

## The console

Static React build served from `docs/` — Thesis (the pitch, in the track brief's own order), Audit (the gate, its evidence, and a chart per finding), Ledger (every metric with its chain index, hash prefix, and per-row `.jws` receipt download), Method (the zone architecture, the must-not-import rules, the gate calibration, the disclosure).

Click any figure: a drawer shows the source URL, the fetch timestamp, the SHA-256 of the raw response, the record's position in the hash chain, and its signed receipt.

## How it works

Five zones, with the borders enforced by a test (`test/architecture.test.ts`), not by discipline:

| Zone | Owns | May not |
| --- | --- | --- |
| capture (`src/capture/`) | network + clock; writes raw bytes + SHA-256 | import metrics or verdict logic |
| compute (`src/compute/`) | every number, every verdict, every hash | I/O, `Date`, `Math.random`, HTTP, LLM SDKs |
| web (`src/web/`) | rendering only — a pure function of `snapshot.json` | import the capture layer |
| verify (`src/cli/verify.ts`) | the claim that any of this is true | trust anything but the diff |

- **Canonical JSON**: keys sorted, no whitespace, shortest round-trip numbers. `hash = SHA256(prevHash ‖ canonicalJSON(record))`, genesis `prevHash` = 64 zeros; the payload excludes the record's own `hash` and `receipt`.
- **Receipts**: compact JWS (HS256) over each record, keyed by `MANDATE_SIGNING_SECRET` (env only; `.env` is gitignored). No secret at compute time → receipts ship empty with a visible banner. Never fabricated.
- **generatedAt** is the only nondeterministic field in a snapshot; it is excluded from hashing and from verify diffs. Compute twice on the same captures → byte-identical output (tested).
- **The audit gate**, in order: `EMPTY_SERIES` → `FROZEN` (>90 days unchanged, measured against the last row of the series, not the wall clock) → `DEFINITIONAL_BREAK` (>50× jump, from a base already typical of the field — at least half its non-zero median, which is scale-invariant — that *persists*: the median of the following seven days stays ≥10× the pre-jump base). The calibration, with worked examples from this very series, is published on the Method page so you can disagree with it precisely.

## How NEAR fits in

NEAR is both the subject and the evidence base: NEAR mainnet chain data is what gets measured, and the validator-set findings (Nakamoto coefficient 9; ~5 operator-clustered) are findings **about NEAR's security surface**. This is not a "powered by NEAR" integration — the protocol's own public data is the material under test.

## Limitations

Stated here before a judge finds them:

- **Single source.** Every figure derives from one analytics endpoint. Cross-validation against a second indexer is roadmap, not reality.
- **T-11 is a name-prefix heuristic.** Operator identity is not disclosed by this source; the caveat travels with the number everywhere it renders (enforced by test).
- **T-09's threshold is a judgement.** "Adequately decentralised" was operationalised as a falsifier (coefficient < 15 → UNSUPPORTED) written before computing.
- **The break gate is calibrated**, and the calibration is published. `deleted_accounts` tripping it mid-2024 is a finding, not a tuning target — no proposition depends on that field.
- **The snapshot is dated** (`generatedAt` in the header strip). The chain has moved on since; `npm run verify` reports which figures still reproduce.
- T-01's headline uses the 30-day mean of `active_accounts` vs the 24-month peak (2.87% of peak), per the proposition's stated metric — a latest-day reading gives ≈3.8%.

## Provenance and disclosure

> **Disclosure.** The provenance-chain and signed-receipt pattern used here originates in the author's own prior project *Mandate*, built for a different hackathon and currently under judging there. No code was copied from it: this repository was written from scratch inside the NEAR HACKATHON window and contains no NEAR-unrelated material from that project. Per the rules permitting reuse of your own prior work as a disclosed baseline, that prior work is declared here as baseline; everything judged here is new.

## Repository map

```
data/raw/          byte-for-byte captures, committed (charts 1,544,699 B · stats 480 B · validators 19,924 B)
data/snapshot.json the data contract — captures, audit, 11 metric records, prose, summary, evidence series
src/capture/       the only network caller
src/compute/       parse · audit · metrics · verdict · chain · receipt — pure, no I/O, no clock
src/cli/           fetch · compute · verify (live / --offline / --chain-only) · verify-receipt
src/web/           the console (React 19 + Vite, tokens.css design system)
test/              46 tests: import-graph guard, audit gate, chain + receipts, determinism
docs/              committed build output — GitHub Pages serves this; .nojekyll included
```

## Licence

MIT — see [LICENSE](LICENSE).
