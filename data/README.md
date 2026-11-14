# data/ — the artifacts every figure is rendered from

No number in this repository was typed by a human. Everything published traces back through this directory: a figure in the console → a record in `snapshot.json` → a capture id and a byte hash → a URL and a UTC timestamp.

## Regenerate everything

```bash
npm run fetch      # re-capture all three sources (needs network)
npm run compute    # rebuild snapshot.json from whatever is in raw/ (pure)
# or both:
npm run snapshot
```

`compute` refuses to run if a file in `raw/` does not match its recorded SHA-256 in `captures.json`.

## What each file proves

| File | What it proves |
| --- | --- |
| `captures.json` | Provenance of the raw bytes: for each capture, the exact URL, the UTC fetch time, the byte length and the SHA-256. This is what makes "where did this number come from" answerable rather than rhetorical |
| `raw/charts.json` | The daily series as the source served it — 2,307 rows, 2020-07-21 → 2026-11-13, 1,544,699 bytes, unmodified. Twelve of the fifteen propositions derive from this file. Also the evidence for all four audit findings |
| `raw/stats.json` | Current network aggregates at capture time. Supplies the market capitalisation used by T-14 |
| `raw/validators.json` | Stake distribution across the validator set. The evidence for T-09 and T-11 |
| `snapshot.json` | The machine bundle: 3 captures, 20 audited fields, 15 metric records each with value, verdict, falsifier, the intermediate `support` numbers, chain index, prevHash, hash and receipt, plus the summary counts and chain head. Everything the console renders and everything `VERIFY.md` reports |

The raw files are committed deliberately, at 1.5 MB. That cost is what makes the snapshot reproducible by a stranger with no network, and it is why `verify:offline` is a real guarantee rather than a replay of a cached answer.

## How to verify independently

Operations a sceptic performs without our help. None need a key.

**1 · The figures match the captured bytes.**
```bash
npm install && npm run verify:offline
# → OFFLINE: 15/15 metrics recomputed from committed captures; chain head matches; liveness not checked.
```
Recomputes all fifteen from `raw/` with no network at all. Exit 0 means every published value and verdict is reproducible from the bytes in this directory.

**2 · The records have not been altered since publication.**
```bash
npm run verify:chain
# → chain verified · 15/15 links · head d3ae227a773e…
```
Then break it on purpose — edit any `value` in `snapshot.json` and run it again:
```
chain broken at index 0: hash mismatch: expected d3bd2512… got e8072526…   (exit 1)
```
Each record's hash commits to its own `chainIndex` and `prevHash`, so a substituted or reordered record breaks the chain at that index and at every index after it.

**3 · The figures still reproduce from the live source today.**
```bash
npm run verify     # needs network
```
Re-fetches, recomputes, and writes `VERIFY.md` with an expected-vs-got row per metric. The sources move, so a byte-level difference in the captures is expected and is stated as such — what matters is whether each figure still reproduces. A figure that has legitimately moved is reported as drift with both values.

**4 · The expectations predate the results.**
```bash
git log -p src/propositions.ts
```
Each falsifier is committed English plus a machine form, written before any value existed. Compare its commit timestamp against `snapshot.json`'s `generatedAt`. This is the property that makes six UNSUPPORTED verdicts meaningful rather than convenient.

**5 · A figure traces to the code that produced it.**
Every metric record carries `computedBy` — for example `metrics.validatorNakamoto` — naming the exact exported pure function in `src/compute/`.

**6 · No model produced any number.**
```bash
npm test     # test/architecture.test.ts
```
Walks the import graph and fails if `src/compute/**` imports an LLM SDK, an HTTP client, `node:fs`, `Date` or `Math.random`. Every `prose[]` entry in the snapshot carries `model: null` and contains no digits beyond proposition ids.

**7 · Re-fetch the source yourself and compare.**
```bash
curl -s https://api.nearblocks.io/v1/charts | shasum -a 256
```
Compare against `charts`'s `sha256` in `captures.json`. It will differ once the source has advanced a day — which is the point of step 3 rather than a failure of step 1.

## What you cannot verify

The per-record JWS receipts are **HS256 under an author-held secret**. You can verify the hash chain completely and offline; you cannot verify the signatures. The public guarantee is the chain. Switching to ES256 with the public key committed here would make the receipts publicly checkable, and is the first roadmap item. See `../SYSTEM_CARD.md`.
