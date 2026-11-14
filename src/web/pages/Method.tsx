import { SNAPSHOT, shortDate } from '../lib';
import { KindBadge } from '../components/KindBadge';

export function Method() {
  return (
    <>
      <h2 className="section" style={{ marginTop: 'var(--s-8)' }}>
        Method — what makes this auditable
      </h2>

      <h3 className="sub">The zone architecture</h3>
      <div className="zonebox">
        <div className="zonetitle">Zone 1 · public data sources</div>
        <div className="zonedesc">
          api.nearblocks.io — /v1/charts ({SNAPSHOT.summary.seriesDays.toLocaleString('en-US')} daily rows), /v1/stats, /v1/validators. The ground truth, outside our trust boundary.
        </div>
      </div>
      <div className="zonebox">
        <div className="zonetitle">Zone 2 · capture layer <span className="faint">(src/capture/)</span></div>
        <div className="zonedesc">
          The only zone that touches the network or the clock. HTTPS GET, no transform; records url, fetchedAt (UTC ISO-8601), byte length and SHA-256; writes byte-for-byte captures committed under data/raw/.
        </div>
      </div>
      <div className="zonebox det">
        <div className="zonetitle">Zone 3 · deterministic compute <span className="faint">(src/compute/)</span></div>
        <div className="zonedesc">
          Owns every number and every verdict. Pure functions: no I/O, no clock, no randomness, no LLM, no HTTP client — enforced by a test (test/architecture.test.ts), not by discipline. The refusal contract: a raw capture whose SHA-256 does not match its recorded hash stops the run rather than producing a figure.
        </div>
      </div>
      <div className="zonebox">
        <div className="zonetitle">Zone 4 · presentation <span className="faint">(src/web/)</span></div>
        <div className="zonedesc">
          This console: a pure function of data/snapshot.json. No fetch, no backend, no keys — it renders from the committed snapshot with the network unplugged.
        </div>
      </div>
      <div className="zonebox">
        <div className="zonetitle">Zone 5 · verification <span className="faint">(src/cli/verify.ts)</span></div>
        <div className="zonedesc">
          Re-fetch → recompute → diff per metric → VERIFY.md. Exit 0 only for the guarantee named in the output; offline mode verifies chain integrity without liveness and says exactly that.
        </div>
      </div>

      <h3 className="sub">The code-owns-facts split</h3>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>module</th>
              <th>must not import / use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="hash">src/compute/**</td>
              <td>any HTTP client, node:fs, <code>Date</code>, <code>Math.random</code>, any LLM SDK</td>
            </tr>
            <tr>
              <td className="hash">src/capture/**</td>
              <td>anything from compute/metrics.ts or verdict.ts</td>
            </tr>
            <tr>
              <td className="hash">src/web/**</td>
              <td>anything from src/capture/** — types and snapshot.json only</td>
            </tr>
          </tbody>
        </table>
        <p className="small muted" style={{ marginBottom: 0 }}>
          The guard is a grep-based test over the import graph (<code>test/architecture.test.ts</code>). It is what
          makes the architecture claim on this page verifiable rather than aspirational. Dates inside compute are
          handled by pure civil-calendar arithmetic (<code>src/compute/dateutil.ts</code>) — no <code>Date</code>{' '}
          object anywhere in the zone.
        </p>
      </div>

      <h3 className="sub">Canonical JSON and the hash chain</h3>
      <div className="card">
        <p className="small">
          <strong>Canonical JSON:</strong> keys sorted lexicographically at every level, no whitespace, numbers in
          shortest round-trip form, UTF-8, no trailing newline. <strong>Chain:</strong>{' '}
          <code>hash = SHA256(prevHash ‖ canonicalJSON(record))</code>, where the hashed payload is the record
          without its own <code>hash</code> and <code>receipt</code> fields; genesis <code>prevHash</code> is 64
          zeros. <strong>Receipts:</strong> compact JWS (HS256) over the record without its <code>receipt</code>{' '}
          field, keyed by <code>MANDATE_SIGNING_SECRET</code> (env only, never in the repo).
        </p>
        <p className="small muted" style={{ marginBottom: 0 }}>
          <strong>generatedAt</strong> is the only nondeterministic field in a snapshot and is excluded from hashing
          and from verify diffs. Determinism test: compute twice on the same captures → byte-identical output.
        </p>
      </div>

      <h3 className="sub">The audit gate, precisely</h3>
      <div className="card">
        <p className="small">
          Run against every field the endpoint exposes, in fixed order:
        </p>
        <ol className="small">
          <li><strong>EMPTY_SERIES</strong> — no non-null, non-zero value anywhere in the series.</li>
          <li><strong>FROZEN</strong> — unchanged for more than 90 days of series, measured against the last row (data, not the wall clock).</li>
          <li>
            <strong>DEFINITIONAL_BREAK</strong> — a day-over-day jump greater than 50× that (a) starts from a base
            already typical of the field — at least half the median of its non-zero values, which is
            scale-invariant — and (b) persists: the median of the following seven days stays at least 10× the
            pre-jump base. Organic spikes fail (b) or (c); redefinitions pass all three.
          </li>
        </ol>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Worked examples on this very series: txn_fee moved ~84× on 2020-08-21 but from a microscopic base (organic
          launch noise); new_contracts jumped 73× on 2023-01-30 and was back the next day (a spike, not a
          redefinition); active_contracts jumped 1,052× on 2024-06-01 and never came back — a genuine break. The
          gate additionally surfaced a persistent break in deleted_accounts that no proposition depends on; it is
          reported on the Audit page as a finding, which is the difference between an audit and a hardcoded
          anecdote.
        </p>
      </div>

      <h3 className="sub">Reproduce it</h3>
      <div className="card">
        <pre className="hash" style={{ whiteSpace: 'pre-wrap' }}>
{`# first run, with network (produces the authoritative committed snapshot)
cp .env.example .env          # set MANDATE_SIGNING_SECRET to any random string
npm install
npm run snapshot              # fetch → compute → data/raw/* + data/snapshot.json
npm test
npm run build                 # emits docs/ (the console you are reading)
npm run verify                # re-fetch, recompute, diff → VERIFY.md

# what a judge runs — no keys, no network needed
npm install && npm run verify:offline && npm run build && npx serve docs`}
        </pre>
      </div>

      <h3 className="sub">Provenance and disclosure</h3>
      <div className="card">
        <p className="small" style={{ marginBottom: 0 }}>
          <strong>Disclosure.</strong> The provenance-chain and signed-receipt pattern used here originates in the
          author's own prior project <em>Mandate</em>, built for a different hackathon and currently under judging
          there. No code was copied from it: this repository was written from scratch inside the NEAR HACKATHON
          window and contains no NEAR-unrelated material from that project. Per the rules on reusing your own prior
          work as a disclosed baseline, that prior work is declared here as baseline; everything judged here is
          new. <KindBadge kind="prose" /> <span className="xsmall faint">this paragraph is the only model-assisted text on this page; the rest is method.</span>
        </p>
      </div>

      <h3 className="sub">Honest limitations</h3>
      <ul className="small muted">
        <li>Single source. Every figure derives from one analytics endpoint; a second indexer confirming each figure is roadmap, not reality.</li>
        <li>No cross-validation of the validator percentages beyond the API's own cumulative fields.</li>
        <li>T-09's falsifier verdict is UNSUPPORTED at coefficient 9 — but "adequately decentralised" is a threshold judgement; the threshold (15) was chosen before computing and is stated in the falsifier.</li>
        <li>T-11 is a name-prefix heuristic — operator identity is not disclosed by this source; the caveat travels with the number everywhere it renders.</li>
        <li>The definitional-break gate is calibrated (ratio 50×, median-relative base, persistence window); its calibration is published above so you can disagree with it precisely.</li>
        <li>Snapshot generated {shortDate(SNAPSHOT.generatedAt)} — the chain has moved on since; <code>npm run verify</code> will tell you which figures still reproduce.</li>
      </ul>
    </>
  );
}
