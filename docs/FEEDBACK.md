# Feedback — the build retrospective

Build day was not friction-free. This is the full record: **16 numbered issues** across the NEAR data sources, the NEAR protocol model, our own product bugs, and the build/deploy toolchain — plus the decisions that held up, what we got wrong early, and the gaps we chose to document rather than hide.

Numbers are unique across the document, so "issue #9" means the same thing everywhere. Every fix names the file it lives in. Nothing here is aspirational: if it is listed as fixed, it shipped and was verified against a fresh clone or CI.

**Why this document exists:** four of these issues became product features rather than patches. The audit gate (§1) is the whole thesis, and it exists because the first three data problems were severe enough that quoting the fields would have been dishonest.

---

## The build, in four phases

| Phase | What happened |
| --- | --- |
| **1 — Idea selection** | The first idea was an agent spending-guard. Abandoned after a clone check: of 1,533 hackathon submissions, 652 were in the AI Security & Defense track and 619 in Agent Economy — five of the first eight submissions ever filed were agent spend-firewalls. The Investment Thesis track had 123. Re-aimed at the thinnest viable track where the existing engine was a differentiator rather than the commodity |
| **2 — Capture and audit** | The three sources captured byte-for-byte and committed. The usability gate written to run over *all* fields rather than suspected ones — which is what surfaced the fourth finding |
| **3 — Propositions and chain** | 11 propositions with falsifiers committed before any value existed, then the SHA-256 prev-hash chain and JWS receipts. Expanded to 15 after the gate's fourth finding earned its own proposition |
| **4 — Console and publish** | Four pages rendering purely from `data/snapshot.json`, static build to `docs/`, GitHub Pages from `main / docs` |

---

## NEAR data sources — issues faced and handled

| # | Issue | Symptom | Fix / disposition | Where |
| --- | --- | --- | --- | --- |
| 1 | **`multichain_txns` is advertised by the schema and empty in reality** | The field is present on all 2,307 daily rows of `api.nearblocks.io/v1/charts` and non-null-non-zero on **none** of them. Any "cross-chain traction" figure read from it is a figure about nothing | Became a finding rather than a workaround: the gate classifies it `EMPTY_SERIES` and proposition **T-05** reports `DATA_UNUSABLE` with the usable-day count as its evidence | `src/compute/audit.ts`, `src/propositions.ts` T-05 |
| 2 | **`circulating_supply` has been frozen since 2025-08-27** | The value sits at one constant while `total_supply` keeps climbing. Float-adjusted market cap, FDV ratios and "percent circulating" all silently inherit the staleness. The same frozen value is returned by `/v1/stats`, so switching endpoints does not help | Gate classifies `FROZEN` at a 90-day threshold; proposition **T-06** reports `DATA_UNUSABLE` and carries the staleness in days. We compute no float-adjusted valuation anywhere | `audit.ts`, T-06 |
| 3 | **`active_contracts` has an unreconciled 1,052× break** | 2024-06-01: 738 → 776,038 in one day, and it never returns. Values either side of that date are not the same quantity, so any multi-year developer-activity chart drawn from it is meaningless | Gate classifies `DEFINITIONAL_BREAK` with the date; **T-07** reports `DATA_UNUSABLE`. We use `new_contracts` instead for the deployment proposition (T-08), which has no break | `audit.ts`, T-07, T-08 |
| 4 | **`deleted_accounts` has a second, larger break — which we were not looking for** | 2024-08-15: 16 → 63,170, a 3,948× persistent jump. We had three known findings and wrote the gate to run across all 20 fields anyway; it returned a fourth | Promoted to proposition **T-12** rather than left as an audit footnote, and the break detector was extracted to `audit.worstPersistentBreak` so the gate entry and the proposition share one implementation and can never disagree | `audit.ts` `worstPersistentBreak`, T-12 |
| 5 | **Distinguishing a redefinition from an organic spike** | A naive "ratio > 50×" test flags legitimate one-day volume spikes. `txn_volume` alone has a day-over-day ratio over 9,000× that is real market behaviour, not a schema change | The gate requires three conditions together: the jump exceeds 50×, the pre-jump base is already typical of the field, **and the new level persists** rather than reverting. Organic spikes fail the persistence test. The calibration is published on the Method page so it can be disagreed with precisely | `audit.ts`, `src/web/pages/Method.tsx` |
| 6 | **`/v1/validators` is paginated at 25 of 371 seats, and two of its fields are unusable** | `validatorFullData` returns only the first 25 pools. `contractStake` is `null` on every row. `description.country_code` is inconsistently cased across rows (`AQ`, `us`, `US`, `de`), so any geographic concentration analysis would be comparing mismatched keys | Nakamoto coefficients need only the top of the distribution, and each row carries an API-computed `cumulativePercent` that spans all 371 seats — so 25 rows suffice for any threshold below 65.12%, which both of ours are. Geography dropped entirely rather than normalised on a guess; stake concentration kept (**T-09**, **T-11**) | `src/compute/cluster.ts`, T-09, T-11 |
| 7 | **Operator identity is not in the data** | `figment` and `ledgerbyfigment`, three `cnear-*` pools, four `svrn*` pools and three `bitwise*` pools look like single operators running multiple validators — which would cut the effective Nakamoto coefficient roughly in half. But nothing in the source *states* an operator | Shipped as an explicit heuristic, not a fact: **T-11** carries `heuristic: true` and a mandatory non-empty `caveat`, and the UI refuses to render a heuristic metric without displaying its caveat in the same component. The honest claim is "name-prefix clustering suggests ≈5; confirming it needs operator disclosure this source does not carry" | `cluster.ts`, T-11, `src/web/components/ConcentrationPanel.tsx` |

---

## NEAR protocol — a wrong assumption, corrected early

| # | Issue | What we believed | What is actually true |
| --- | --- | --- | --- |
| 8 | **Function-call access-key `allowance` is a gas budget, not a spending cap** | The original project idea assumed NEAR gives you a native per-key spending limit — mint a function-call key with an allowance and the agent simply cannot spend beyond it | The protocol docs are explicit: allowance is *"a balance limit to use by this access key to pay for function call gas and transaction fees"*, typically ~0.25 NEAR, earmarked for fees only. It does not cap token transfers. It also **cannot be changed** once set — you delete the key and mint a new one — and a key added by a contract with allowance `0` means *unlimited*, which is a live footgun. The real enforcement point on NEAR is a contract that holds the funds and checks the policy itself. Correcting this early is part of why the project moved off the spend-guard idea entirely |

This one is worth flagging to NEAR directly: the naming invites the wrong reading, and a large share of agent-spending-limit projects are likely built on it.

---

## Our own bugs

| # | Issue | Symptom | Fix | Where |
| --- | --- | --- | --- | --- |
| 9 | **`verify:offline` claimed "chain head matches" on a tampered snapshot** | With a `value` edited, the run correctly failed (14/15, exit 1) but the headline still read `chain head matches`. Cause: it compared `committed.summary.chainHead` — which the tamper had not touched — against a head freshly recomputed from untouched raw bytes, so they agreed. The offline path never called `verifyChain` on the committed records | `verifyChain(committed.metrics)` now runs **before** the headline is composed, and its result gates the wording: a tampered snapshot reports `chain BROKEN at index 0`. Caught by a cold-read audit from a fresh clone, not by the test suite — which is why the tamper case is now exercised explicitly, and why `make tamper` exists | `src/cli/verify.ts`, `Makefile` |
| 10 | **The finding count drifted from three to four** | The gate surfaced `deleted_accounts` (#4) and the documents were updated to "four", but one string in the console still read *"Every bull case built on these three numbers…"* — sitting directly under four finding cards | Fixed and rebuilt. The lesson is that a count stated in prose in more than one place will drift; the console now derives the four finding cards from `snapshot.audit` rather than from a hardcoded list, so only the sentence itself is prose | `src/web/pages/Thesis.tsx` |
| 11 | **Adding the documentation set to `docs/` deleted it on the next build** | `docs/` is simultaneously the Vite `outDir` and the GitHub Pages publish root. With `emptyOutDir: true`, `npm run build` wipes the directory — so every prose doc added under `docs/` vanishes at the next build, silently | `emptyOutDir: false`, plus orphan pruning in `scripts/postbuild.mjs`: after each build, any file in `docs/assets/` not referenced by the freshly written `index.html` is deleted. The output stays a single clean build and the docs survive | `vite.config.ts`, `scripts/postbuild.mjs` |
| 12 | **One unpinned dependency in a project whose pitch is reproducibility** | `lucide-react` was specified as `^1.73.0` in `dependencies` *and* duplicated as an exact pin in `devDependencies` — so the caret still floated the version that actually shipped | Pinned to `1.73.0` and the duplicate removed. `grep -E '"[~^]' package.json` now returns nothing. If the claim is that anyone can re-derive the figures, the dependency tree cannot float | `package.json` |
| 13 | **`.env.example` advertised a model API key the code never reads** | It listed `NEAR_AI_API_KEY` with a note that "the LLM is off by default" — but there is no LLM anywhere in `src/`, so the variable invited precisely the wrong inference about whether a model touches the numbers | Removed. `.env.example` now declares the single variable the project actually reads and states plainly that there is no model, no provider and no account. See `docs/MODEL_CARD.md` | `.env.example` |

---

## Toolchain and environment

| # | Issue | Symptom | Fix / disposition |
| --- | --- | --- | --- |
| 14 | **The data source was unreachable from the build environments** | Both the cloud container and the local Linux VM used during development were behind an egress allow-list that refused `CONNECT api.nearblocks.io:443` with HTTP 403 — as did `rpc.mainnet.near.org` and `rpc.fastnear.com`. A policy denial, not a transient failure, so retrying or routing around it was not an option | Shaped the architecture for the better: **capture is the only networked step**, it runs wherever the operator has network, and everything downstream runs on committed bytes. A judge therefore never needs network either. `npm run fetch` ran from the author's own shell; `compute`, `verify:offline`, `test` and `build` run anywhere |
| 15 | **macOS-installed `node_modules` cannot run in a Linux container** | Running the suite against a copied working tree failed at startup: `Cannot find native binding … @rolldown/binding-wasm32-wasi`. The install had resolved darwin-arm64 binaries (`@rolldown`, `lightningcss`, `@tailwindcss/oxide`) | Not a repo defect, but it hid the real signal. Every audit since is run the way a judge runs it: fresh clone, fresh `npm install`, `.env` absent. That is also how #9 was found |
| 16 | **A content-hashed asset plus a cached browser made a fixed bug look live** | After #10 was fixed and deployed, the live page still showed the old text, and the bug was briefly re-reported as outstanding. A fresh fetch of the HTML returned the new asset name while the open tab was still executing the previous bundle from cache | No code change — but worth recording, because it nearly caused a correct fix to be "re-fixed". Verify a deploy by fetching the HTML and comparing the referenced asset hash against the committed one, not by looking at a rendered page |

---

## What worked

- **Writing the falsifier before the value.** `src/propositions.ts` holds each falsifier as committed English and as a machine `kind`; `compute/verdict.ts` is the only module that may return a `Verdict`. That ordering is what makes 6 of 15 UNSUPPORTED verdicts publishable instead of embarrassing.
- **Running the gate over every field, not the suspected ones.** It cost nothing and produced finding #4, which is the strongest single item in the project.
- **The import-graph test.** `test/architecture.test.ts` fails the build if `src/compute/**` reaches for the network, the filesystem, the clock or a model. The code/model boundary is checked rather than claimed — which matters when an automated reviewer is cross-checking the README against the code.
- **Committing the raw bytes.** 1.5 MB of JSON in git looked indulgent and turned out to be the foundation: it is what makes `verify:offline` meaningful, what makes the snapshot reproducible by a stranger, and what made issue #14 a design input rather than a blocker.
- **A cold-read audit from a fresh clone.** It found #9, #10, #12 and #13. The test suite was green throughout all four.

---

## Known gaps — documented not hidden

1. **The JWS receipts are not third-party verifiable.** HS256 under an author-held secret: a reader can verify the hash chain completely and offline, but not the signatures. The public guarantee is the chain. Moving to ES256 with the public key committed would fix it and is the first roadmap item. Stated in `README.md` and `SYSTEM_CARD.md`.
2. **One data source.** Every figure derives from `api.nearblocks.io`. A systematic error there is invisible to us. Cross-validating `total_supply` and total stake against a second indexer is the highest-value next step.
3. **Operator clustering in T-11 is a heuristic** and is labelled as one in the record, the UI and the documentation. `svrn_bitwise` plausibly belongs to either of two clusters.
4. **No screenshots in the repo.** The live console is one click away, but a reader who will not open it sees no product imagery. Named in `REPO-SPEC.md` §4.
5. **Fonts load from Google Fonts.** The "works with no network" claim is about the data, not the typography; fonts degrade to system fallbacks offline.
6. **`/v1/validators` is a point-in-time read.** There is no history, so T-09 and T-11 describe the moment of capture and cannot show a trend. Building that needs repeated captures over weeks.

### No third-party-verifiable anchor

The hash chain proves internal consistency: alter any value and verification breaks at that index and
every index after it. It does **not** prove when the snapshot existed. The JWS receipts are signed with
an author-held secret, so they are not third-party verifiable either — a reader who distrusts us gains
nothing from them that the chain does not already give. FR-18 (anchoring the evidence root to a NEAR
transaction) was specified and not built.

What would close it: a timestamp a third party vouches for. Either an on-chain anchor of the root hash,
or an external timestamping service. Both are real work and neither was attempted in the window, so the
honest statement is that the snapshot's *contents* are tamper-evident and its *date* rests on our word.

### T-04 needs a null model

See the power-limitation note in `PROPOSITIONS.md`. r on 12 monthly means cannot support an inference
either way; the fix is weekly resolution plus an enumerated cyclic-permutation band, which changes a
published value and so is deferred.

### Not built: Nigrini's second-order test

The ordinary Benford test asks whether values look fabricated. The second-order test runs digit analysis
on the differences between consecutively ranked values, and the applied literature advocates it for
financial data diagnostics because it is superior when rounding is present. What it detects is a
different failure mode: series that were interpolated, smoothed or backfilled rather than observed.
Given that this endpoint already yielded one frozen field, one empty field and two unreconciled
definitional breaks, "is any remaining series partly manufactured by the provider's own backfill?" is
the natural next question, and the second-order test is the instrument for it. Pure compute, no network,
no RNG — it belongs beside the existing test in `src/compute/benford.ts`.

### Not built: live in-browser falsification

The Ledger could recompute the chain client-side and let a visitor edit a value to watch the chain break
at that index. The blocker is `node:crypto` in `src/compute/canonical.ts` — a pure/Node split
(`canonical.ts` + `hash.ts`, `chainCore.ts`) plus a `crypto.subtle` verifier would ship it, but it
touches the guarded compute directory and the chain head depends on its output. Specified, tested in
design, deferred: a subtly wrong browser hash would have the console declare an intact chain broken.

