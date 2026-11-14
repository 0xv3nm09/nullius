// src/cli/verify.ts — the claim that any of this is true. Three modes:
//
//   npm run verify            live: re-fetch → recompute → diff → VERIFY.md
//   npm run verify:offline    recompute from committed captures; chain only
//   npm run verify:chain      chain integrity only (FR-10 tamper check)
//
// Exit 0 = the guarantee named in the output held; exit 1 = something did
// not reproduce, and VERIFY.md names each drifted metric with both values.
// The unhappy path is a feature: offline mode says exactly which guarantee
// it checked and which it could not (FR-17).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Capture, MetricRecord, Snapshot } from '../types.js';
import { buildSnapshot } from '../compute/index.js';
import { verifyChain } from '../compute/chain.js';
import { receiptMatches } from '../compute/receipt.js';
import { capture, SOURCES, type SourceId } from '../capture/fetch.js';
import { ROOT, SNAPSHOT_PATH, decode, loadEnv, readRawSet, signingSecret } from './lib.js';

loadEnv();

const args = process.argv.slice(2);
const chainOnly = args.includes('--chain-only');
const offline = args.includes('--offline');
const VERIFY_MD = join(ROOT, 'VERIFY.md');

interface Row {
  id: string;
  metric: string;
  expected: string;
  got: string;
  pass: boolean;
}

function show(v: MetricRecord['value'], unit: string): string {
  if (v === null) return '—';
  if (unit === 'pct') return `${v.toFixed(2)}%`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function metricRows(committed: Snapshot, fresh: Snapshot): Row[] {
  return committed.metrics.map((c) => {
    const f = fresh.metrics.find((m) => m.id === c.id);
    if (!f) {
      return { id: c.id, metric: c.metric, expected: show(c.value, c.unit), got: 'MISSING', pass: false };
    }
    const valuePass = c.value === f.value;
    const verdictPass = c.verdict === f.verdict;
    const chainPass = c.hash === f.hash; // hashes exclude generatedAt, so offline they must match
    return {
      id: c.id,
      metric: c.metric,
      expected: `${show(c.value, c.unit)} · ${c.verdict}`,
      got: `${show(f.value, f.unit)} · ${f.verdict}${chainPass ? '' : ' · hash drifted'}`,
      pass: valuePass && verdictPass && chainPass,
    };
  });
}

function writeReport(committed: Snapshot, rows: Row[], mode: string, notes: string[], receipts: string): void {
  const passed = rows.filter((r) => r.pass).length;
  const lines: string[] = [
    '# Verify report',
    '',
    `- mode: **${mode}**`,
    `- committed snapshot generatedAt: ${committed.generatedAt}`,
    `- chain: ${chainLine(committed)}`,
    `- receipts: ${receipts}`,
    `- captures: ${committed.captures.length} committed · sha256 recorded`,
    '',
    '| metric | expected (committed) | got (recomputed) | pass |',
    '| --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.id} | ${r.expected} | ${r.got} | ${r.pass ? '✓' : '✗'} |`),
    '',
    ...notes,
    '',
    `**Result: ${passed}/${rows.length} metrics reproduced.**`,
    '',
  ];
  writeFileSync(VERIFY_MD, lines.join('\n'));
}

function chainLine(s: Snapshot): string {
  const c = verifyChain(s.metrics);
  return c.ok
    ? `verified · ${s.metrics.length}/${s.metrics.length} links · head ${s.summary.chainHead.slice(0, 12)}…`
    : `BROKEN at index ${c.brokenAt} — ${c.detail}`;
}

async function verifyReceipts(s: Snapshot, secret: string | undefined): Promise<string> {
  if (!secret) return 'not checked — no MANDATE_SIGNING_SECRET configured (fresh clone: this is expected)';
  let ok = 0;
  for (const m of s.metrics) {
    if (await receiptMatches(m, secret)) ok++;
  }
  return ok === s.metrics.length ? `verified · ${ok}/${s.metrics.length} JWS receipts` : `FAILED · only ${ok}/${s.metrics.length} verify`;
}

async function runOffline(committed: Snapshot, secret: string | undefined): Promise<number> {
  const { captures, bodies } = readRawSet(); // refuses on hash mismatch
  const fresh = await buildSnapshot(
    {
      chartsRaw: decode(bodies['charts'] as Uint8Array),
      statsRaw: decode(bodies['stats'] as Uint8Array),
      validatorsRaw: decode(bodies['validators'] as Uint8Array),
      captures,
    },
    { generatedAt: committed.generatedAt, signingSecret: secret },
  );
  const rows = metricRows(committed, fresh);
  const passed = rows.filter((r) => r.pass).length;
  const receipts = await verifyReceipts(committed, secret);
  // integrity check on the COMMITTED chain itself — the summary head field
  // survives value tampering, so it is not the check (found in audit §2)
  const chainCheck = verifyChain(committed.metrics);
  const notes = [
    `Recomputed from the committed raw captures in \`data/raw/\` — no network was used.`,
    `Chain: ${chainCheck.ok ? `verified · ${committed.metrics.length}/${committed.metrics.length} links · head matches` : `BROKEN at index ${chainCheck.brokenAt} — ${chainCheck.detail}`}. Liveness of the source was not checked.`,
  ];
  writeReport(committed, rows, 'offline (committed captures)', notes, receipts);
  console.log(`OFFLINE: ${passed}/${rows.length} metrics recomputed from committed captures; ${chainCheck.ok ? `chain head matches` : `chain BROKEN at index ${chainCheck.brokenAt}`}; liveness not checked.`);
  console.log(`receipts: ${receipts}`);
  console.log(`report → VERIFY.md`);
  return passed === rows.length ? 0 : 1;
}

async function main(): Promise<number> {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error(`no committed snapshot at ${SNAPSHOT_PATH} — nothing to verify against. Run \`npm run snapshot\` on a machine with network.`);
    return 1;
  }
  const committed = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
  const secret = signingSecret();

  // ---------------- chain-only (FR-10) ----------------
  if (chainOnly) {
    const c = verifyChain(committed.metrics);
    if (!c.ok) {
      console.error(`chain broken at index ${c.brokenAt}: ${c.detail}`);
      return 1;
    }
    console.log(`chain verified · ${committed.metrics.length}/${committed.metrics.length} links · head ${committed.summary.chainHead.slice(0, 12)}…`);
    return 0;
  }

  // ---------------- offline (FR-17) ----------------
  if (offline) {
    return runOffline(committed, secret);
  }

  // ---------------- live ----------------
  let fresh: Snapshot;
  let mode = 'live (re-fetched from api.nearblocks.io)';
  const notes: string[] = [];
  try {
    const captures: Capture[] = [];
    const bodies: Record<string, Uint8Array> = {};
    for (const id of ['charts', 'stats', 'validators'] as SourceId[]) {
      process.stdout.write(`re-fetching ${id} … `);
      const got = await capture(id, SOURCES[id]);
      captures.push(got.capture);
      bodies[id] = got.body;
      process.stdout.write(`${got.capture.bytes.toLocaleString('en-US')} bytes · sha256 ${got.capture.sha256.slice(0, 12)}…\n`);
    }
    fresh = await buildSnapshot(
      {
        chartsRaw: decode(bodies['charts'] as Uint8Array),
        statsRaw: decode(bodies['stats'] as Uint8Array),
        validatorsRaw: decode(bodies['validators'] as Uint8Array),
        captures,
      },
      { generatedAt: new Date().toISOString(), signingSecret: secret },
    );
    const driftedCaptures = captures.filter((c, i) => c.sha256 !== committed.captures[i]?.sha256).length;
    notes.push(
      `Live re-fetch: ${driftedCaptures} of ${captures.length} captures differ byte-wise from the committed ones (sources move; that is expected and is not itself a failure).`,
    );
  } catch (e) {
    // Source unreachable → degrade honestly to the offline guarantee (§15).
    console.error(`source unreachable (${(e as Error).message}); falling back to the offline guarantee`);
    return runOffline(committed, secret);
  }

  const rows = metricRows(committed, fresh);
  const passed = rows.filter((r) => r.pass).length;
  const receipts = await verifyReceipts(committed, secret);
  if (passed !== rows.length) {
    notes.push('A figure that legitimately moved is a pass of the design, not a failure: the thesis is designed to turn against itself without anyone editing it. Check the drift below before deciding.');
  }
  writeReport(committed, rows, mode, notes, receipts);
  console.log(`${passed}/${rows.length} metrics reproduced against a live re-fetch`);
  console.log(`report → VERIFY.md`);
  return passed === rows.length ? 0 : 1;
}

const code = await main();
process.exit(code);
