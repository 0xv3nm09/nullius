# REPO-SPEC — nullius

The project's contract with itself. If any other document in this repo disagrees with this page, **this page wins.**

| | |
| --- | --- |
| **Project** | nullius — take nobody's word for it |
| **Tier** | **T1 Showcase** — a judged submission read by people who will never speak to the author, so it must convince unaided |
| **Brief** | NEAR HACKATHON, Investment Thesis track — <https://nearhackathon.com> · rules: <https://nearhackathon.com/HACKATHON.md> |
| **Deadline** | 2026-11-14 23:59 UTC (development ends; repo must be public by then) |
| **Judged state** | tag `v1.0-submission` |
| **Positioning** | An investment thesis whose every figure is recomputed from raw captured bytes by deterministic code, carries a signed provenance receipt, and fails loudly when it stops reproducing. |

Tier justification: this is a public, judged artifact competing against 123 other entries in its track, pre-screened by automated reviewers before a human panel. The full manifest earns its place; a T3 README would lose on presentation alone.

---

## 1 · Hard requirements → status → evidence

Requirements lifted verbatim from `HACKATHON.md`. Not paraphrased into something easier to satisfy.

| # | Requirement (verbatim from brief) | Status | Satisfied by | Verify with |
|---|---|---|---|---|
| R1 | "Make the repository public before development ends, 2026-11-14T23:59:00Z" | ✅ | public at `github.com/0xv3nm09/nullius` | open the URL while signed out |
| R2 | "Judges can't open a private one" / repo is what judges review | ✅ | 68 tracked files, no submodules | `git clone` anonymously |
| R3 | "write the README for a machine reader as well as a human one: what the product is, the problem it solves, and how to try it as 'do X - see Y' steps" | ✅ | `README.md` §Try it in 60 seconds | run the four blocks literally |
| R4 | "Repo stays public through judging; add a LICENSE file" (Q-014) | ✅ | `LICENSE`, MIT, repo root | GitHub About sidebar shows "MIT" |
| R5 | "Code written since the announcement counts" — window 2026-10-19 → 2026-11-14 (Q-001) | ✅ | every commit dated 2026-11-14 | `git log --format='%ad' --date=iso` |
| R6 | "Build a long-term investment thesis for NEAR and back it with data: onchain analytics, live dashboards and models anyone can re-run" | ✅ | 15 propositions + `npm run verify` | `npm run verify:offline` |
| R7 | "Judged on the evidence, not the conviction" | ✅ | 6 of the project's own 15 propositions are published UNSUPPORTED | `data/snapshot.json` → `summary` |
| R8 | "Local-only demo OK: public repo, reproducible README … Hosted demo is a plus" (Q-012) | ✅ | GitHub Pages — <https://0xv3nm09.github.io/nullius/> | open it; no login, no keys |
| R9 | "keep it up to 2026-11-18, ideally 2026-11-25" (Q-012) | ✅ | Pages from `main / docs`, no server to expire | nothing to keep alive |
| R10 | "Existing product on another chain? Allowed. Only the NEAR integration built in the window is judged. Disclose in README." (Q-002) | ✅ | `README.md` §Provenance and disclosure | read the disclosure paragraph |
| R11 | "Libraries, templates, boilerplate … List in README; own old libs count as baseline" (Q-005) | ✅ | same disclosure; no code reused | `THIRD-PARTY-NOTICES.md` |
| R12 | Demo post on X tagging `@NEARProtocol` + `#NEARHackathon` with video or screenshots | ⚠️ **author action — not yet posted at time of writing** | — | the post URL in the submission |
| R13 | Submission fields: project name, team lead, email, size, tracks, NEAR mainnet address, repo link, demo link, 20–2,000 char idea | ⚠️ **pending the NEAR mainnet payout address** | drafted and ready | the submitted payload |
| R14 | "One submission per project … the same repository is rejected with 409" | ✅ | single repo, single intended submission | n/a |
| R15 | "Commit secrets. Keys belong in environment variables, never in the repository." | ✅ | `.env` gitignored; only `.env.example` tracked | `git ls-files \| grep env` |

**Automated pre-screen (Q-017):** Claude Code and Codex perform a reproducibility check and feature verification before the human panel. Every claim in this repo is therefore written to be machine-checkable: see §4.

---

## 2 · Required-file manifest

| Path | Why it exists | Status |
| --- | --- | --- |
| `README.md` | The only document most readers open | present |
| `LICENSE` | MIT at repo root so GitHub detects it | present |
| `.gitignore` | No secrets, no build noise | present |
| `.env.example` | A reader configures without asking | present |
| `Makefile` | One obvious command per intent | present |
| `.github/workflows/ci.yml` | A badge that means something — asserts the core guarantee | present |
| `REPO-SPEC.md` | This contract | present |
| `SYSTEM_CARD.md` | Boundaries, stated as code-enforced | present |
| `THIRD-PARTY-NOTICES.md` | Licence hygiene | present |
| `PROPOSITIONS.md` | The case library — falsifiers as committed text | present |
| `AUDIT.md` | The four data-quality findings, written up | present |
| `VERIFY.md` | Machine-rendered expected-vs-got report | present (regenerated by `npm run verify`) |
| `docs/ARCHITECTURE.md` | How it works, with file references | present |
| `docs/DIAGRAMS.md` | Mermaid diagrams, each with a "what this tells you" line | present |
| `docs/EVIDENCE.md` | Criteria → proof, plus the 60-second tour | present |
| `docs/FEEDBACK.md` | Build retrospective — the failures are documentation too (16 numbered issues) | present |
| `docs/MODEL_CARD.md` | Which model does what — here, none | present |
| `docs/SOURCES.md` | Every endpoint, call and real response | present |
| `docs/RUN-GUIDE.md` | Zero to running | present |
| `data/README.md` | What each raw artifact proves + how to verify independently | present |
| `data/raw/*.json` | Raw captured bytes, hash-recorded | present (3 captures) |
| `data/snapshot.json` | The machine bundle every figure is rendered from | present |
| `docs/` build output | Pages publish root | present |
| `docs/screenshots/` | `cover.png`, `poster.png`, claimed UI states | **missing — see §4** |
| `docs/diagrams/*.svg` + `make_diagrams.py` | Raster/vector hero pair that survives both themes | **missing — Mermaid used instead, see §4** |
| `.github/workflows/pages.yml` | Pages via Actions | dropped — Pages is served from `main / docs`, which needs no workflow |
| `docs/DEPLOY-<target>.md` | Deployment runbook | dropped — there is no server to deploy; `docs/RUN-GUIDE.md` covers Pages |
| `eval_cases/` + `eval_results/` | Case library + machine results | dropped as separate dirs — `src/propositions.ts` **is** the case library (falsifiers committed before values exist) and `data/snapshot.json` **is** the results bundle. Mapping stated in `docs/EVIDENCE.md` |
| `docs/<SPONSOR>.md` | One doc per sponsor tool | dropped — this project uses no sponsor tool; `docs/SOURCES.md` serves the same purpose for the data source |

---

## 3 · Evidence map plan

Realised in `docs/EVIDENCE.md`: one row per judging criterion → what the project does → the file or command that proves it; then the deliverables table; then the **60-second tour** — four numbered steps from cold to convinced, naming exact commands and exact files.

The load-bearing property is that **no figure in any document is hand-typed.** Every number traces to `data/snapshot.json`, which traces to `data/raw/*.json` by recorded SHA-256, which traces to a URL and a UTC fetch timestamp. `npm run verify` re-derives the chain end to end.

---

## 4 · Gap list, ranked by what a reviewer notices first

| # | Gap | Impact | Disposition |
| --- | --- | --- | --- |
| 1 | **No X demo post yet (R12)** | Submission-blocking: `demoUrl` is a required field | Author action. Draft text prepared; author posts and supplies the URL |
| 2 | **NEAR mainnet payout address not yet supplied (R13)** | Submission-blocking | Author action; must not be invented on their behalf |
| 3 | **No `docs/screenshots/`** | README has no poster or UI stills, so a reader who will not run code sees no product | Accepted for this submission: the live Pages console is one click away and is the real thing rather than a picture of it. Named here rather than hidden |
| 4 | **Hero diagrams are Mermaid, not a light/dark raster pair** | Mermaid renders on GitHub with no build step but is less legible in the README at width | Accepted: Mermaid costs no build pipeline and cannot go stale against a regeneration script that is not run. `docs/DIAGRAMS.md` carries all of them |
| 5 | **Receipts cannot be verified by a third party** | The JWS receipts are HS256 under an author-held secret, so a reader can verify the *hash chain* but not the *signatures* | Disclosed in `README.md` and `SYSTEM_CARD.md`. The public guarantee is the hash chain; the receipts are an author-side integrity control. An asymmetric key (ES256) with the public key committed would make them publicly checkable — roadmap |
| 6 | **Single data source** | Every figure derives from `api.nearblocks.io`; a systematic error there is invisible | Disclosed in `README.md` §Limitations. Cross-validation against a second indexer is the first roadmap item |
| 7 | **`docs/` is both Pages root and docs home** | A build with `emptyOutDir:true` deletes the whole documentation set — this happened once during the build, not hypothetically | **Fixed**: `emptyOutDir:false` plus orphan-asset pruning in `scripts/postbuild.mjs`. Recorded in `docs/FEEDBACK.md` #11 |
| 8 | **Fonts load from Google Fonts** | The "works with no network" claim covers data, not typography | Disclosed in `README.md` §Limitations; fonts degrade to system fallbacks |
| 9 | Bundle 767 kB (gzip 228 kB) | Slower first paint | Accepted — Recharts. Code-splitting is not worth the regression risk pre-deadline |

---

## 5 · GitHub surface

Set these on the repo page; they are part of the deliverable.

| Setting | Value |
| --- | --- |
| **About description** | `An executable NEAR investment thesis: every figure recomputed from raw bytes, with a signed receipt.` (103 chars) |
| **Topics** | `near`, `near-protocol`, `onchain-analytics`, `investment-thesis`, `reproducible-research`, `provenance`, `data-audit`, `typescript`, `nearhackathon` |
| **Website** | <https://0xv3nm09.github.io/nullius/> |
| **Pages** | `main` / `docs` — live |
| **Licence detected** | MIT must appear in the About sidebar |
| **Release/tag** | `v1.0-submission` on the submitted commit |
| **Default branch** | `main`, clean history, no archives or build junk |
| **Social preview** | not set — depends on gap #3 |

---

## 6 · Verification checklist

Run as a cold reader before tagging the submission.

- [x] Every requirement row in §1 is ✅, or its gap is named in §4 and linked
- [x] Every number in every document traces to `data/snapshot.json` or `data/raw/`
- [x] Zero-key quickstart works from a fresh clone, run literally as written
- [x] CI asserts the core guarantee (`npm run verify:offline`), not just formatting
- [x] `git ls-files` contains no `.env`, key, token, archive or build junk
- [x] `docs/RESULTS`-equivalent (`VERIFY.md`) regenerated after the last run that changed a number
- [x] Every `expected` (falsifier in `src/propositions.ts`) predates the run that produced its `got`
- [x] Every `DATA_UNUSABLE` reason resolves to a named gate rule in `docs/ARCHITECTURE.md`
- [x] The honest ⚠️ is present and diagnosed (§4 #5 and #6)
- [x] A rebuild from committed source reproduces the committed `docs/` asset hash
- [ ] Repo tagged `v1.0-submission`
- [ ] X demo post live and its URL in the submission
