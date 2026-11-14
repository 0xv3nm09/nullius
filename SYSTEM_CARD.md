# System card — nullius

What this system is, what it is allowed to do, and what it cannot tell you. Written so a reviewer can find the limits without having to discover them.

---

## Identity

nullius is a **data-audit and provenance pipeline** that publishes an investment thesis about NEAR. It is not an agent, not a trading system, and not a recommendation service. It reads public data, computes figures from it, and publishes those figures with the evidence attached.

It takes no actions in the world. It holds no keys to anything that can move value. It signs nothing except its own records.

---

## Boundaries — stated as code-enforced, not prompt-enforced

| Boundary | Mechanism | Where |
| --- | --- | --- |
| **No model produces any number** | There is no model in the repository. `test/architecture.test.ts` fails the build if `src/compute/**` imports an LLM SDK, an HTTP client, `node:fs`, `Date` or `Math.random` | `test/architecture.test.ts` |
| **Only one layer reaches the network** | `src/capture/fetch.ts` is the sole networked module; the same import-graph test forbids compute from reaching it | `src/compute/**` |
| **Only one module may assign a verdict** | `compute/verdict.ts` is the single producer of a `Verdict`; metrics return `{value, support}` and never a label | `src/compute/verdict.ts` |
| **A broken field cannot yield a number** | If any field a proposition depends on fails the audit gate, the verdict is `DATA_UNUSABLE` and `value` is `null` — there is no code path that computes a figure from an unusable field | `verdict.ts` |
| **A heuristic cannot be shown without its caveat** | `heuristic: true` requires a non-empty `caveat` on the record, and the rendering component refuses to display the figure without it | `components/ConcentrationPanel.tsx` |
| **Tampering fails closed** | Each record's hash commits to its own `chainIndex` and `prevHash`; altering any published value breaks the chain at that index and sets a non-zero exit code | `compute/chain.ts`, `cli/verify.ts` |
| **A capture cannot be silently edited** | Compute refuses to run if a raw capture's bytes do not match its recorded SHA-256 | `cli/lib.ts` |
| **No secret in the repository** | `.env` is gitignored; `.env.example` carries placeholders only; the one secret the project reads is supplied by environment variable | `.gitignore`, `.env.example` |

---

## What the system does not do

- It does not give investment advice, and nothing in it should be read as a recommendation to buy, sell or hold anything. It states propositions and reports whether the data supports them.
- It does not predict. Every figure is a measurement of a past window, labelled with the window it covers.
- It does not write prose about numbers. The three prose blocks are hand-authored, carry `model: null`, and contain no digits beyond proposition ids.
- It does not sign transactions, hold funds, or connect to a wallet.
- It does not phone home. The published console fetches nothing at runtime.

---

## Known limitations

1. **The JWS receipts are not third-party verifiable.** They are HS256 under an author-held secret. A reader can verify the **hash chain** completely and offline; they cannot verify the **signatures**. The public guarantee is therefore the chain, and the receipts are an author-side integrity control only. Moving to ES256 with the public key committed to the repo would make them publicly checkable, and is the first roadmap item.

2. **One data source.** Every figure derives from `api.nearblocks.io`. A systematic error there is invisible to this system. Cross-validating `total_supply` and total stake against a second indexer is the highest-value next step.

3. **T-11 is explicitly a heuristic.** Operator identity is not present in the data; the clustering infers it from staking-pool name prefixes. The record says so, the UI says so, and `svrn_bitwise` plausibly belongs to either of two clusters. The honest claim is that clustering *suggests* an effective coefficient near 5, not that it is 5.

4. **Validator figures are point-in-time.** `/v1/validators` carries no history, so T-09 and T-11 describe the moment of capture and cannot show a trend.

5. **`/v1/validators` is paginated at 25 of 371 seats.** The API-computed `cumulativePercent` spans the whole set, so thresholds below 65.12% are sound — both of ours are — but a threshold above that could not be computed from this capture.

6. **The snapshot is dated.** `generatedAt` is in the header strip of every page. The chain has moved on since; `npm run verify` is what tells you which figures still reproduce today.

7. **Fonts load from a CDN.** The "works with no network" property is about the data and the figures, not the typography; offline, fonts fall back to system defaults.

8. **Three of the twenty audited fields are usable but noisy.** `txn_volume`, `gas_fee` and `new_accounts` have large day-over-day ratios that pass the persistence test and are therefore treated as real. No proposition depends on `txn_volume`.

---

## Intended use, and misuse

**Intended:** as a worked example of how to publish a quantitative claim so that a stranger can check it — and, secondarily, as a current read on what NEAR's public data does and does not support.

**Misuse to avoid:** quoting a figure from this project without its window or its verdict. Six of the fifteen propositions are UNSUPPORTED and four are DATA_UNUSABLE; a figure lifted out of that context inverts the point of the project. Every record carries the falsifier it was tested against — quote that too.
