import { SNAPSHOT, shortDate } from '../lib';
import { KindBadge } from '../components/KindBadge';
import { Section } from '../components/Section';

export function Method() {
  return (
    <>
      <Section kicker="Method · what makes it auditable" title={<>The zones, the border, <span className="accent-text">the guarantee</span>.</>}>
        <div className="zonebox src">
          <p style={{ margin: 0 }}>
            <span className="zonenum">1</span>
            <span className="zonetitle">Public data sources</span>
          </p>
          <div className="zonedesc">
            api.nearblocks.io — /v1/charts ({SNAPSHOT.summary.seriesDays.toLocaleString('en-US')} daily rows), /v1/stats, /v1/validators. The ground truth, outside our trust boundary.
          </div>
        </div>
        <div className="zonebox cap">
          <p style={{ margin: 0 }}>
            <span className="zonenum">2</span>
            <span className="zonetitle">Capture layer</span> <span className="hash">(src/capture/)</span>
          </p>
          <div className="zonedesc">
            The only zone that touches the network or the clock. HTTPS GET, no transform; records url, fetchedAt (UTC ISO-8601), byte length and SHA-256; writes byte-for-byte captures committed under data/raw/.
          </div>
        </div>
        <div className="zonebox det">
          <p style={{ margin: 0 }}>
            <span className="zonenum">3</span>
            <span className="zonetitle">Deterministic compute</span> <span className="hash">(src/compute/)</span>
          </p>
          <div className="zonedesc">
            Owns every number and every verdict. Pure functions: no I/O, no clock, no randomness, no LLM, no HTTP client — enforced by a test (test/architecture.test.ts), not by discipline. The refusal contract: a raw capture whose SHA-256 does not match its recorded hash stops the run rather than producing a figure.
          </div>
        </div>
        <div className="zonebox web">
          <p style={{ margin: 0 }}>
            <span className="zonenum">4</span>
            <span className="zonetitle">Presentation</span> <span className="hash">(src/web/)</span>
          </p>
          <div className="zonedesc">
            This console: a pure function of data/snapshot.json. No fetch, no backend, no keys — it renders from the committed snapshot with the network unplugged.
          </div>
        </div>
        <div className="zonebox verify">
          <p style={{ margin: 0 }}>
            <span className="zonenum">5</span>
            <span className="zonetitle">Verification</span> <span className="hash">(src/cli/verify.ts)</span>
          </p>
          <div className="zonedesc">
            Re-fetch → recompute → diff per metric → VERIFY.md. Exit 0 only for the guarantee named in the output; offline mode verifies chain integrity without liveness and says exactly that.
          </div>
        </div>
      </Section>

      <Section kicker="The border · code owns facts" title="What each zone may not do.">
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
        <p className="small muted" style={{ marginBottom: 0, marginTop: 'var(--s-3)' }}>
          The guard is a grep-based test over the import graph (<code>test/architecture.test.ts</code>). Dates inside
          compute are handled by pure civil-calendar arithmetic (<code>src/compute/dateutil.ts</code>) — no{' '}
          <code>Date</code> object anywhere in the zone.
        </p>
      </Section>

      <Section kicker="Canonical JSON & the chain" title="The exact bytes a hash commits to.">
        <p className="small" style={{ marginTop: 0, maxWidth: '78ch' }}>
          <strong>Canonical JSON:</strong> keys sorted lexicographically at every level, no whitespace, numbers in
          shortest round-trip form, UTF-8, no trailing newline. <strong>Chain:</strong>{' '}
          <code>hash = SHA256(prevHash ‖ canonicalJSON(record))</code>, where the hashed payload is the record
          without its own <code>hash</code> and <code>receipt</code> fields; genesis <code>prevHash</code> is 64
          zeros. <strong>Receipts:</strong> compact JWS (HS256) over the record without its <code>receipt</code>{' '}
          field, keyed by <code>MANDATE_SIGNING_SECRET</code> (env only, never in the repo).
        </p>
        <p className="small muted" style={{ marginBottom: 0, maxWidth: '78ch' }}>
          <strong>generatedAt</strong> is the only nondeterministic field in a snapshot and is excluded from hashing
          and from verify diffs. Compute twice on the same captures → byte-identical output (tested).
        </p>
      </Section>

      <Section kicker="The audit gate · precisely" title="Calibrated in the open — disagree with it precisely.">
        <ol className="small" style={{ marginTop: 0, paddingLeft: '1.2rem', display: 'grid', gap: 6, maxWidth: '78ch' }}>
          <li><strong>EMPTY_SERIES</strong> — no non-null, non-zero value anywhere in the series.</li>
          <li><strong>FROZEN</strong> — unchanged for more than 90 days of series, measured against the last row (data, not the wall clock).</li>
          <li>
            <strong>DEFINITIONAL_BREAK</strong> — a day-over-day jump greater than 50× that (a) starts from a base
            already typical of the field — at least half the median of its non-zero values, which is
            scale-invariant — and (b) persists: the median of the following seven days stays at least 10× the
            pre-jump base. Organic spikes fail (b) or (c); redefinitions pass all three.
          </li>
        </ol>
        <p className="small muted" style={{ marginBottom: 0, maxWidth: '78ch' }}>
          Worked examples on this very series: txn_fee moved ~84× on 2020-08-21 but from a microscopic base (organic
          launch noise); new_contracts jumped 73× on 2023-01-30 and was back the next day (a spike, not a
          redefinition); active_contracts jumped 1,052× on 2024-06-01 and never came back — a genuine break. The
          gate additionally surfaced a persistent break in deleted_accounts that no proposition depends on; it is
          reported on the Audit page as a finding, which is the difference between an audit and a hardcoded
          anecdote.
        </p>
      </Section>

      <Section kicker="Reproduce · do X, see Y" title="Two commands, no keys.">
        <div className="term">
          <div className="term-head">
            <span className="dots" aria-hidden>
              <i /> <i /> <i />
            </span>
            first run · with network
          </div>
          <div className="term-body">
            <span className="cmd">cp .env.example .env</span>
            {'  '}
            <span className="dim"># set MANDATE_SIGNING_SECRET to any random string</span>
            {'\n'}
            <span className="cmd">npm install</span>
            {'\n'}
            <span className="cmd">npm run snapshot</span>
            {'  '}
            <span className="dim"># fetch → compute → data/raw/* + data/snapshot.json</span>
            {'\n'}
            <span className="cmd">npm test</span>
            {'\n'}
            <span className="cmd">npm run build</span>
            {'  '}
            <span className="dim"># emits docs/ — the console you are reading</span>
            {'\n'}
            <span className="cmd">npm run verify</span>
            {'  '}
            <span className="dim"># re-fetch, recompute, diff → VERIFY.md</span>
            {'\n\n'}
            <span className="dim"># what a judge runs — no keys, no network needed</span>
            {'\n'}
            <span className="cmd">npm install &amp;&amp; npm run verify:offline &amp;&amp; npm run build &amp;&amp; npx serve docs</span>
          </div>
        </div>
      </Section>

      <Section kicker="Provenance & disclosure" title="Declared, not hidden.">
        <p className="small" style={{ margin: 0, maxWidth: '78ch' }}>
          <strong>Disclosure.</strong> The provenance-chain and signed-receipt pattern used here originates in the
          author's own prior project <em>Mandate</em>, built for a different hackathon and currently under judging
          there. No code was copied from it: this repository was written from scratch inside the NEAR HACKATHON
          window and contains no NEAR-unrelated material from that project. Per the rules on reusing your own prior
          work as a disclosed baseline, that prior work is declared here as baseline; everything judged here is
          new. <KindBadge kind="prose" />{' '}
          <span className="xsmall faint">this paragraph is the only model-assisted text on this page; the rest is method.</span>
        </p>
      </Section>

      <Section kicker="Limitations · stated first" title="What this cannot tell you.">
        <ul className="small muted" style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 6, maxWidth: '78ch' }}>
          <li>Single source. Every figure derives from one analytics endpoint; a second indexer confirming each figure is roadmap, not reality.</li>
          <li>No cross-validation of the validator percentages beyond the API's own cumulative fields.</li>
          <li>T-09's falsifier verdict is UNSUPPORTED at coefficient 9 — but "adequately decentralised" is a threshold judgement; the threshold (15) was chosen before computing and is stated in the falsifier.</li>
          <li>T-11 is a name-prefix heuristic — operator identity is not disclosed by this source; the caveat travels with the number everywhere it renders.</li>
          <li>The definitional-break gate is calibrated (ratio 50×, median-relative base, persistence window); its calibration is published above so you can disagree with it precisely.</li>
            <li>
              <strong>The Intents blind spot — the biggest caveat on this thesis.</strong> Every fee figure here
              (T-02, T-13, T-14, T-15) is built from <code>txn_fee</code>, which measures gas only. Since NEAR's fee
              switch in February 2026, the dominant revenue line is NEAR Intents — public reporting puts it at
              roughly 85% of the chain's real economic value — and captured Intents revenue is recycled through
              open-market buybacks rather than burned, so it is invisible to <code>txn_fee</code> and to the burn
              figures. Two consequences a reader should hold: the usage collapse T-01 measures has a known cause
              (the end of relayer-paid gas subsidies, which were the bulk of volume), and T-04's negative
              correlation is price against an <em>incomplete</em> fundamental set — the missing fundamental is the
              one this source does not carry. Capturing Intents revenue from DefiLlama is the roadmap fix.
            </li>
            <li>Receipt verifiability: the signing secret is held only by the author, so a fresh clone reports <code>receipts: not checked</code> — by design. The public integrity guarantee is the hash chain, which needs no secret.</li>
          <li>
              Digit-distribution (Benford) conformance and PELT changepoint cross-checks ship in v1 — see the Audit
              page; Nigrini's MAD bands, Cong et al.'s wash-trading application, second-digit tests (arXiv 2301.01809)
              and Killick, Fearnhead &amp; Eckley (2012) are the grounding. Both run threshold-free or gated on stated
              applicability preconditions.
            </li>
            <li>
              <strong>Intents capture (DefiLlama)</strong>: add a fourth capture for NEAR Intents revenue — the
              revenue line this source does not carry — and a proposition testing it against issuance.
            </li>
            <li>
              <strong>Pin to a finalized block height</strong> and reconcile <code>total_supply</code> and{' '}
              <code>totalStake</code> against NEAR RPC with exact invariants — replaces a wall-clock capture with
              provenance anyone can reproduce forever, and retires the single-source limitation properly.
            </li>
            <li><strong>ES256 receipts</strong> with the public key committed, making receipts third-party verifiable.</li>
            <li>Stake concentration over time (needs repeated validator captures) and the monetary-premium leg of the L1 valuation framework.</li>
<li>Snapshot generated {shortDate(SNAPSHOT.generatedAt)} — the chain has moved on since; <code>npm run verify</code> will tell you which figures still reproduce.</li>
        </ul>
      </Section>
    </>
  );
}
