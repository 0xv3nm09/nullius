# Model card — there is no model

The honest version of this document is one line: **nullius uses no machine-learning model, for anything.** This page exists because "model card" is the right place for a reader to look, and because the absence is a design decision worth defending rather than an omission worth hiding.

---

## What a reader can verify in ten seconds

```bash
grep -rn "openai\|anthropic\|langchain\|near.ai\|chat/completions" src/
# → one hit: test/architecture.test.ts, which exists to FORBID these imports
```

There is no provider SDK, no API key, no inference call, and no prompt anywhere in `src/`. `.env.example` declares exactly one variable (`MANDATE_SIGNING_SECRET`, which signs receipts), so a reader cannot even configure a model.

---

## Why not

The project's entire claim is that `npm run verify` re-derives every published figure from committed bytes, deterministically, and fails loudly when it stops reproducing.

A model anywhere in the number path would break that claim at the root:

| Property the project sells | What a model in the pipeline does to it |
| --- | --- |
| Byte-identical recomputation across runs and machines | Destroys it — sampling is not deterministic |
| `verify` means something | Makes it meaningless: a mismatch could be drift, or could be temperature |
| The hash chain is load-bearing | Weakens it: a non-reproducible input makes a broken chain ambiguous |
| A figure traces to the exact function that produced it | Replaces a named pure function with an opaque call |

So the model is not merely absent — it is *structurally* absent, and a test enforces that. `test/architecture.test.ts` walks the import graph and fails the build if `src/compute/**` reaches for an LLM SDK, an HTTP client, the filesystem, the clock or randomness.

The hackathon requires no model: the Investment Thesis track asks for onchain data, dashboards and models anyone can re-run, and `HACKATHON.md` Q-011 states plainly that there are no mandatory integrations. "Model" in that brief means an analytical model, which is what the fifteen propositions are.

---

## What produces each part of the output

| Output | Produced by | Marked as |
| --- | --- | --- |
| All 15 metric values | pure functions in `src/compute/metrics.ts` and `cluster.ts`, each named in the record's `computedBy` | `code` |
| All 15 verdicts | `src/compute/verdict.ts` applying a falsifier committed before the value existed | `code` |
| The 20 audit classifications | `src/compute/audit.ts` | `code` |
| The summary conclusion sentence | interpolated from the metric records by code | `code` |
| 3 prose blocks (thesis, audit, method framing) | **hand-written by the author** | `prose`, `model: null` |

The console badges every rendered element with its origin, and a test asserts that no `prose[]` body contains a digit beyond a proposition id. A reader can therefore see, on the page, which sentences are derived and which are written — and know that no number was ever written by anything but code.

---

## If a model were ever added

The only non-corrosive place for one is at the **input** end: proposing *candidate propositions* for a human to accept or reject before any value is computed. Generation of hypotheses, never computation of figures, never assignment of verdicts, never authorship of a number.

That would leave every guarantee on this page intact, because the falsifier would still be committed text reviewed by a person, and the value would still come from a pure function. It is not implemented, and it was deliberately left out of the submission.
