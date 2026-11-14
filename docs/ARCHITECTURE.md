# Architecture

How nullius actually works, with file references. Diagrams live in [DIAGRAMS.md](DIAGRAMS.md); this page is the prose and the rules.

The whole design serves one sentence: **no number published by this project was produced by anything other than deterministic code reading committed bytes.** Everything below is in service of making that sentence checkable by a stranger rather than merely asserted.

---

## 1 · The four layers

| Layer | Files | May touch | Must not touch |
| --- | --- | --- | --- |
| **Capture** | `src/capture/fetch.ts`, `src/cli/fetch.ts` | network, clock, filesystem | metrics, verdicts |
| **Compute** | `src/compute/*.ts` | nothing but its inputs | network, `node:fs`, `Date`, `Math.random`, any model SDK |
| **Presentation** | `src/web/**` | `data/snapshot.json`, types | capture, network at runtime |
| **Verification** | `src/cli/verify.ts`, `src/cli/verify-receipt.ts` | network, filesystem, compute | writing a metric itself |

These are not conventions. `test/architecture.test.ts` walks the import graph and fails the build if `src/compute/**` reaches for the network, the filesystem, the clock, randomness or a model. The code/model boundary is a test, not a paragraph — which matters because the hackathon's automated pre-screen cross-checks README claims against code.

---

## 2 · Capture — the only networked step

`src/capture/fetch.ts` performs an HTTPS GET and writes the response body **byte-for-byte**, with no reformatting and no pretty-printing. For each capture it records:

| Field | Meaning |
| --- | --- |
| `id` | `charts` · `stats` · `validators` |
| `url` | the exact URL requested |
| `fetchedAt` | UTC ISO-8601, the moment of the request |
| `bytes` | length of the stored body |
| `sha256` | hash of those exact bytes |

Written to `data/raw/<id>.json` and `data/captures.json`, both committed. Three captures, 1,564 KB in total, dominated by `charts.json` at 1,544,699 bytes of 2,307 daily rows.

Reformatting the body would be fatal: the recorded hash must be the hash of bytes a third party can re-fetch and compare, not of our re-serialisation of them. `src/compute/parse.ts` reads the raw text and **throws on schema drift** rather than coercing a missing field to zero — a silent zero is how a thesis publishes a false figure.

Source detail, with every endpoint and a real response: [SOURCES.md](SOURCES.md).

---

## 3 · Compute — pure, and provably so

### 3.1 The audit gate (`src/compute/audit.ts`)

Runs over **all 20 fields** the charts endpoint exposes, before any metric is computed. A field is classified unusable when it fails one of three tests:

| Reason | Rule |
| --- | --- |
| `EMPTY_SERIES` | no non-null, non-zero value anywhere in the series |
| `FROZEN` | the value has not changed for more than 90 days |
| `DEFINITIONAL_BREAK` | a day-over-day jump that is **(a)** greater than 50×, **(b)** from a base already typical of the field, and **(c)** persistent — the series stays at the new level rather than reverting |

Condition (c) is what distinguishes a redefinition from market behaviour. `txn_volume` has a day-over-day ratio above 9,000× that is real and reverts; it stays usable. `active_contracts` jumps 1,052× on 2024-06-01 and never returns; it is a break.

The three-part test lives in one exported function, `audit.worstPersistentBreak`, used by both the gate and propositions T-07 and T-12 — so an audit entry and a proposition record can never disagree about the same field.

Running the gate over every field rather than a suspected list is what produced the fourth finding (`deleted_accounts`, 2024-08-15, 16 → 63,170). A fifth remains possible: the gate reruns on every capture.

### 3.2 Metrics (`src/compute/metrics.ts`, `src/compute/cluster.ts`)

One exported pure function per proposition, named in that proposition's `computedBy` field so a reader can jump from a figure to the code that produced it. Each returns `{ value, support }`, where `support` carries the intermediate numbers — peak and peak date, the month windows compared, the sums on each side — so a figure is never a bare scalar a reader has to trust.

`cluster.ts` handles the validator set: parsing, the Nakamoto coefficient at a stake threshold, and the name-prefix clustering behind T-11.

All yoctoNEAR conversion goes through the single helper in `src/units.ts`. There are no inline `1e24` divisions anywhere.

### 3.3 Verdicts (`src/compute/verdict.ts`)

The **only** module in the repository permitted to return a `Verdict`. It takes the proposition spec, the computed value and the audit results, and applies the falsifier:

- If any field in the proposition's `dependsOn` is unusable → `DATA_UNUSABLE`, and `value` is `null`. A proposition whose source field is a finding cannot be given a numeric verdict.
- Otherwise the machine form of the falsifier (`kind`) is applied to the value → `SUPPORTED` or `UNSUPPORTED`.

`src/propositions.ts` holds every falsifier as committed English *and* as that machine `kind`, written before any value existed and never edited afterwards. This ordering is the reason the project can publish **6 UNSUPPORTED verdicts out of 15**, two of them about NEAR's own decentralisation, without that being a failure of the submission.

### 3.4 Chain and receipts (`src/compute/chain.ts`, `receipt.ts`, `canonical.ts`)

Records are linked in id order:

```
hash[i] = SHA256( hash[i-1] ‖ canonicalJSON(record[i] minus hash, receipt) )
hash[-1] = "0" × 64
```

The hashed payload excludes only `hash` and `receipt` — which cannot sign themselves — and **includes** `chainIndex` and `prevHash`, so reordering or substituting a record breaks the chain at that index and every index after it.

Canonical JSON is explicit and lives in one function: keys sorted lexicographically, no whitespace, UTF-8, shortest round-trip number form. Hashing never goes through a bare `JSON.stringify`, because key-order drift between runtimes is the classic way a hash chain silently stops reproducing.

`generatedAt` is the only non-deterministic field in the snapshot and is excluded from every hash and from every diff, so two runs over the same captures produce byte-identical records.

Each record also carries a compact JWS (HS256) receipt over itself. **These are an author-side control, not a public guarantee** — the secret is author-held. See [SYSTEM_CARD.md](../SYSTEM_CARD.md).

### 3.5 The data contract (`src/types.ts`)

`data/snapshot.json` is the single source of truth for everything downstream:

```
Snapshot {
  schemaVersion, generatedAt,
  captures[]  — id, url, fetchedAt, bytes, sha256
  audit[]     — field, usable, reason?, detail, evidence
  metrics[]   — id, proposition, metric, falsifier, value, unit, verdict,
                dependsOn, fromCaptures, computedBy, support,
                heuristic?, caveat?, chainIndex, prevHash, hash, receipt
  prose[]     — id, kind:'prose', body, model
  summary     — supported, unsupported, inconclusive, dataUnusable,
                chainHead, seriesDays, conclusion
}
```

Two properties of this shape carry weight. `prose[].kind` is always `'prose'` and `metrics` are always code-derived, so the console can badge every rendered element with its origin — and a test asserts no prose body contains digits beyond proposition ids. And `heuristic` + `caveat` travel with the record rather than living in the UI, so a heuristic figure cannot be rendered anywhere without its caveat.

---

## 4 · Presentation — a pure function of the snapshot

`src/web/**` imports `data/snapshot.json` at build time and **never fetches anything at runtime**. Four pages:

| Page | File | What it carries |
| --- | --- | --- |
| Thesis | `pages/Thesis.tsx` | positioning, the verdict tiles, the four finding cards (derived from `snapshot.audit`), all 15 propositions |
| Audit | `pages/Audit.tsx` | the gate, per field, usable and unusable alike, with the evidence numbers |
| Ledger | `pages/Ledger.tsx` | the full metric table, chain indices, hash prefixes, per-row receipt export |
| Method | `pages/Method.tsx` | the rules above, the canonicalisation definition, the gate calibration, the limitations |

Components worth naming: `Figure.tsx` renders a traceable number and opens `ProvenanceDrawer.tsx` (source URL, fetch timestamp, raw SHA-256, chain index); `KindBadge.tsx` marks code-derived versus prose; `ConcentrationPanel.tsx` renders T-09/T-11 and refuses to display a heuristic metric without its caveat; `VerdictPill.tsx` carries a text label and a glyph so colour is never the only signal.

Design tokens are a separate file, `src/web/tokens.css`, with verdict colour driven from semantic tokens rather than ad-hoc hex.

**Build:** Vite, `base: './'` so the same output works from the Pages subpath and from `npx serve docs`. `outDir: 'docs'` with **`emptyOutDir: false`** — `docs/` is also where this documentation lives, and emptying it would delete these files on every build. `scripts/postbuild.mjs` writes `.nojekyll` and prunes any asset the new `index.html` does not reference, so the output stays exactly one build.

---

## 5 · Verification — the claim that any of this is true

`src/cli/verify.ts`, three modes:

| Command | What it does | Guarantee |
| --- | --- | --- |
| `npm run verify` | re-fetch live → recompute → diff against the committed snapshot | the figures still reproduce from the source *today* |
| `npm run verify:offline` | recompute from committed raw bytes → `verifyChain` → diff | the figures match the captured bytes; liveness unchecked |
| `npm run verify:chain` | `verifyChain` on the committed records only | the published records have not been altered |

All three write `VERIFY.md` with an expected-vs-got row per metric and exit non-zero on any mismatch. `verify:offline` runs `verifyChain` on the committed records **before** composing its headline, so it cannot report an intact chain beside a failing metric — a bug that existed and is written up as [FEEDBACK.md](FEEDBACK.md) #9.

Receipts are checked only when `MANDATE_SIGNING_SECRET` is set; without it the run says so explicitly rather than passing silently.

A figure that has legitimately moved since the capture is **a pass of the design, not a failure.** The thesis is built to be able to turn against itself without anyone editing it, and `VERIFY.md` names each drifted metric with both values.

---

## 6 · Why no model, and no agent

There is no LLM anywhere in the pipeline, and that is a design decision rather than an omission. The project's entire claim is that `npm run verify` re-derives every figure deterministically; a model in the number path would make the output non-reproducible and the verify command meaningless. The three prose blocks in `data/snapshot.json` are hand-written, carry `model: null`, and contain no digits beyond proposition ids — asserted by a test.

Full statement: [MODEL_CARD.md](MODEL_CARD.md).
