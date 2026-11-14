# Run guide — zero to running

## Prerequisites

| | |
| --- | --- |
| Node | **≥ 22** (`engines` in `package.json`; built and tested on 22.23.4) |
| npm | 10 or newer |
| Network | **not required** for anything below except `npm run fetch` / `npm run verify` |
| Credentials | **none.** No API key, no account, no wallet, no provider |

## The fast path — reproduce every figure, offline

```bash
git clone https://github.com/0xv3nm09/nullius && cd nullius
npm install
npm run verify:offline
```

Expected, on a fresh clone with no `.env`:

```
OFFLINE: 15/15 metrics recomputed from committed captures; chain head matches; liveness not checked.
receipts: not checked — no MANDATE_SIGNING_SECRET configured (fresh clone: this is expected)
report → VERIFY.md
```

Exit code 0. Roughly 25 s for `npm install`, under 2 s for the verification. All fifteen propositions are recomputed from the committed bytes in `data/raw/`; nothing is read from the network.

Note the second line: the run **states** that receipts were not checked rather than passing silently. See [MODEL_CARD.md](MODEL_CARD.md) and [SYSTEM_CARD.md](../SYSTEM_CARD.md) for why the chain, not the receipts, is the public guarantee.

## See the console

```bash
npm run build
npx serve docs
```

Opens on `localhost:3000` with all fifteen propositions, the four audit findings and the full ledger populated — with the network unplugged, because the snapshot is compiled into the bundle. This is byte-identical to what GitHub Pages serves.

Or skip the build entirely: <https://0xv3nm09.github.io/nullius/>

For hot reload while editing: `npm run dev`.

## Prove the chain is load-bearing

```bash
make tamper
```

Backs up the snapshot, edits one published value, runs the chain check, restores. Expected:

```
tampering T-01: 2.872662173596536 -> 12.0
chain broken at index 0: hash mismatch: expected d3bd2512… got e8072526…
exit=1
```

By hand, if you prefer: edit any `value` in `data/snapshot.json`, then `npm run verify:chain`.

## Re-capture from NEAR mainnet (needs network)

```bash
npm run snapshot    # = fetch && compute
npm run verify      # re-fetch, recompute, diff against the committed snapshot
```

`npm run verify` writes `VERIFY.md` with an expected-vs-got row per metric and exits non-zero on drift. **A figure that has legitimately moved since the capture is a pass of the design, not a failure** — the thesis is built to be able to turn against itself without anyone editing it, and the report names both values.

**If `fetch` fails with a connection refusal rather than a timeout**, you are probably behind an egress allow-list. We hit exactly this during the build: some CI and container environments refuse `CONNECT api.nearblocks.io:443` with HTTP 403 as a policy denial, which no amount of retrying fixes. Everything except `fetch` and `verify` runs on committed bytes and is unaffected. See [FEEDBACK.md](FEEDBACK.md) #14.

## Sign the receipts (optional)

```bash
cp .env.example .env      # set MANDATE_SIGNING_SECRET to any long random string
npm run compute           # re-signs every record
npm run verify:offline    # → receipts: verified · 15/15 JWS receipts
npm run verify:receipt <path-to-exported.jws>
```

Receipts are an author-side integrity control. A third party cannot verify them, because HS256 is symmetric and the secret is not in the repo — by design. The hash chain is what a stranger checks.

## Commands

| Command | Needs network | What it does |
| --- | --- | --- |
| `make help` | no | list every target |
| `make check` | no | exactly what CI runs: tests, build, offline verification |
| `npm run test` | no | 46 unit tests, including the import-graph guard |
| `npm run build` | no | typecheck, then static build into `docs/` |
| `npm run verify:offline` | no | recompute all 15 from committed captures |
| `npm run verify:chain` | no | chain integrity of the committed records |
| `make tamper` | no | break a value and watch it fail closed |
| `npm run dev` | no | console with hot reload |
| `npm run fetch` | **yes** | re-capture the three sources |
| `npm run verify` | **yes** | re-fetch, recompute, diff |

## Deployment

There is no server. The console is a static build, and `docs/` is both the Vite output directory and the GitHub Pages publish root (`main` / `docs`).

Two consequences worth knowing before you touch the build config:

1. **`emptyOutDir` must stay `false`** in `vite.config.ts`. `docs/` also holds this documentation set; emptying it on build would delete these files. `scripts/postbuild.mjs` prunes orphaned hashed assets instead, so the output stays exactly one build. This is not hypothetical — see [FEEDBACK.md](FEEDBACK.md) #11.
2. **`base` is `'./'`**, so the same output works from the Pages subpath (`/nullius/`) and from `npx serve docs` at a filesystem root.

To redeploy: `npm run build`, commit `docs/`, push. Pages picks it up in a minute or two. Verify a deploy by fetching the HTML and comparing the asset hash it references against the committed one — not by looking at an open tab, which may be serving the previous bundle from cache ([FEEDBACK.md](FEEDBACK.md) #16).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot find native binding … wasm32-wasi` | `node_modules` installed on a different OS/arch than the one running | Delete `node_modules` and `npm install` on the machine that will run it |
| `verify:offline` fails on a fresh clone | a raw capture's bytes no longer match its recorded SHA-256 | Do not "fix" the hash — re-run `npm run snapshot` to recapture, or `git checkout data/` |
| Pages shows an old build | browser cache, or `docs/` not committed | Hard-reload; confirm `docs/index.html` and `docs/assets/` are committed |
| Blank page on Pages | `base` misconfigured | `base: './'` in `vite.config.ts`; confirm `docs/.nojekyll` exists |
| `receipts: not checked` | no `MANDATE_SIGNING_SECRET` | Expected on a fresh clone. Set it only if you want to re-sign |
| Docs disappeared after a build | `emptyOutDir` was set back to `true` | Restore `emptyOutDir: false`; recover the files from git |
