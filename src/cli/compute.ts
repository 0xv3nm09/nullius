// src/cli/compute.ts — raw captures → data/snapshot.json. Refuses to run on
// any capture whose recorded hash does not match (refusal contract). The
// generatedAt timestamp and signing secret are injected here and nowhere
// else, so the compute layer itself stays deterministic (FR-04).

import { writeFileSync } from 'node:fs';
import { buildSnapshot } from '../compute/index.js';
import { verifyChain } from '../compute/chain.js';
import { CAPTURES_PATH, SNAPSHOT_PATH, decode, loadEnv, readRawSet, signingSecret } from './lib.js';

loadEnv();

const { captures, bodies } = readRawSet();

const required = ['charts', 'stats', 'validators'] as const;
for (const id of required) {
  if (!bodies[id]) throw new Error(`missing raw capture \`${id}\` — run \`npm run fetch\``);
}

const secret = signingSecret();
if (!secret) {
  console.warn('WARNING receipts: unsigned — MANDATE_SIGNING_SECRET not set; receipts ship empty, never fabricated');
}

const snapshot = await buildSnapshot(
  {
    chartsRaw: decode(bodies['charts'] as Uint8Array),
    statsRaw: decode(bodies['stats'] as Uint8Array),
    validatorsRaw: decode(bodies['validators'] as Uint8Array),
    captures,
  },
  { generatedAt: new Date().toISOString(), signingSecret: secret },
);

const chain = verifyChain(snapshot.metrics);
if (!chain.ok) throw new Error(`internal: freshly built chain is broken at ${chain.brokenAt}: ${chain.detail}`);

writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');

const s = snapshot.summary;
console.log(`snapshot written → ${SNAPSHOT_PATH}`);
console.log(`  series: ${s.seriesDays.toLocaleString('en-US')} days · captures: ${captures.length} · ${CAPTURES_PATH}`);
console.log(`  verdicts: ${s.supported} SUPPORTED · ${s.unsupported} UNSUPPORTED · ${s.inconclusive} INCONCLUSIVE · ${s.dataUnusable} DATA_UNUSABLE`);
console.log(`  chain: verified · ${snapshot.metrics.length}/${snapshot.metrics.length} links · head ${s.chainHead.slice(0, 12)}…`);
console.log(`  receipts: ${secret ? 'signed (HS256)' : 'UNSIGNED — no secret configured'}`);
for (const m of snapshot.metrics) {
  const v = m.value === null ? '—' : m.unit === 'pct' ? `${m.value.toFixed(2)}%` : m.value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  console.log(`  ${m.id}  ${m.verdict.padEnd(14)} ${v}`);
}
