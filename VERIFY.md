# Verify report

- mode: **offline (committed captures)**
- committed snapshot generatedAt: 2026-11-14T21:36:39.325Z
- chain: verified · 15/15 links · head 808f129d4824…
- receipts: verified · 15/15 JWS receipts
- captures: 3 committed · sha256 recorded

| metric | expected (committed) | got (recomputed) | pass |
| --- | --- | --- | --- |
| T-01 | 2.87% · UNSUPPORTED | 2.87% · UNSUPPORTED | ✓ |
| T-02 | 23.28% · SUPPORTED | 23.28% · SUPPORTED | ✓ |
| T-03 | 2.48% · SUPPORTED | 2.48% · SUPPORTED | ✓ |
| T-04 | -0.5138 · UNSUPPORTED | -0.5138 · UNSUPPORTED | ✓ |
| T-05 | — · DATA_UNUSABLE | — · DATA_UNUSABLE | ✓ |
| T-06 | — · DATA_UNUSABLE | — · DATA_UNUSABLE | ✓ |
| T-07 | — · DATA_UNUSABLE | — · DATA_UNUSABLE | ✓ |
| T-08 | 2.2629 · SUPPORTED | 2.2629 · SUPPORTED | ✓ |
| T-09 | 9 · UNSUPPORTED | 9 · UNSUPPORTED | ✓ |
| T-10 | 1.40% · SUPPORTED | 1.40% · SUPPORTED | ✓ |
| T-11 | 5 · UNSUPPORTED | 5 · UNSUPPORTED | ✓ |
| T-12 | — · DATA_UNUSABLE | — · DATA_UNUSABLE | ✓ |
| T-13 | 1.95% · UNSUPPORTED | 1.95% · UNSUPPORTED | ✓ |
| T-14 | 3,348.3785 · UNSUPPORTED | 3,348.3785 · UNSUPPORTED | ✓ |
| T-15 | 31.31% · SUPPORTED | 31.31% · SUPPORTED | ✓ |

Recomputed from the committed raw captures in `data/raw/` — no network was used.
Chain: verified · 15/15 links · head matches. Liveness of the source was not checked.

**Result: 15/15 metrics reproduced.**
