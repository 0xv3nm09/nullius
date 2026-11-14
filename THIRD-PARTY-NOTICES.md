# Third-party notices

nullius is MIT licensed (see `LICENSE`). It bundles no third-party source code. The runtime dependencies below are installed from npm at their exact pinned versions and ship inside the built console in `docs/assets/`; the development dependencies do not ship.

No dependency in either list carries a copyleft obligation. All are permissive (MIT, or Apache-2.0 in the case of TypeScript), which is compatible with this project's MIT licence and with the hackathon's licence requirement (Q-014).

## Runtime dependencies — present in the built bundle

| Package | Version | Licence | Used for |
| --- | --- | --- | --- |
| [`react`](https://github.com/facebook/react) | 19.3.1 | MIT | the console UI |
| [`react-dom`](https://github.com/facebook/react) | 19.3.1 | MIT | DOM rendering |
| [`recharts`](https://github.com/recharts/recharts) | 3.10.1 | MIT | the Audit and Ledger charts. Pulls in the `d3-*` family and `victory-vendor`, all MIT or ISC |
| [`lucide-react`](https://github.com/lucide-icons/lucide) | 1.73.0 | ISC | interface icons |
| [`jose`](https://github.com/panva/jose) | 6.2.17 | MIT | JWS (HS256) signing and verification of the per-metric receipts |

## Development dependencies — not shipped

| Package | Version | Licence |
| --- | --- | --- |
| [`typescript`](https://github.com/microsoft/TypeScript) | 7.0.2 | Apache-2.0 |
| [`vite`](https://github.com/vitejs/vite) | 8.3.8 | MIT |
| [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) | 6.3.0 | MIT |
| [`vitest`](https://github.com/vitest-dev/vitest) | 5.1.0 | MIT |
| [`tsx`](https://github.com/privatenumber/tsx) | 4.23.15 | MIT |
| [`tailwindcss`](https://github.com/tailwindlabs/tailwindcss) | 4.3.5 | MIT |
| [`@tailwindcss/vite`](https://github.com/tailwindlabs/tailwindcss) | 4.3.5 | MIT |
| `@types/node`, `@types/react`, `@types/react-dom` | 26.6.6 / 19.3.0 / 19.3.0 | MIT (DefinitelyTyped) |

Every version above is **exact**, with no caret or tilde ranges. That is deliberate: a project whose central claim is that anyone can re-derive its figures cannot have a floating dependency tree. Confirm with `grep -E '"[~^]' package.json` — it returns nothing.

## Data

On-chain data is retrieved from the **[NearBlocks](https://nearblocks.io) public API** (`api.nearblocks.io`), unauthenticated, read-only. The captured responses are committed verbatim under `data/raw/` with their URLs, fetch timestamps and SHA-256 hashes recorded in `data/captures.json`. NearBlocks is credited as the sole data source throughout; see `docs/SOURCES.md` for every endpoint and a real response.

NEAR Protocol documentation (`docs.near.org`) is referenced in `docs/FEEDBACK.md` for the access-key allowance semantics. No text is reproduced beyond a short quoted definition with attribution.

## Fonts

The console loads **Bricolage Grotesque**, **DM Sans** and **DM Mono** from Google Fonts at runtime. All three are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/). They are not vendored into this repository. Offline, the console falls back to system fonts — the "works with no network" property covers the data and the figures, not the typography.
