// src/cli/verify-receipt.ts — verify a single exported .jws receipt against
// MANDATE_SIGNING_SECRET and print the record it commits to (FR-16).
//
//   npm run verify:receipt -- path/to/T-01.jws

import { readFileSync } from 'node:fs';
import { verifyReceipt } from '../compute/receipt.js';
import { loadEnv, signingSecret } from './lib.js';

loadEnv();

const file = process.argv[2];
if (!file) {
  console.error('usage: npm run verify:receipt -- <file.jws>');
  process.exit(1);
}
const secret = signingSecret();
if (!secret) {
  console.error('MANDATE_SIGNING_SECRET is not set — cannot verify. Set it in .env (same secret that signed the snapshot).');
  process.exit(1);
}

try {
  const jws = readFileSync(file, 'utf8').trim();
  const rec = await verifyReceipt(jws, secret);
  console.log(`receipt verifies (HS256)`);
  console.log(`  id       ${rec.id}`);
  console.log(`  value    ${rec.value === null ? '—' : rec.value}`);
  console.log(`  verdict  ${rec.verdict}`);
  console.log(`  chain    index ${rec.chainIndex} · hash ${rec.hash.slice(0, 16)}…`);
  console.log(`  computed ${rec.computedBy}`);
  process.exit(0);
} catch (e) {
  console.error(`receipt FAILED to verify: ${(e as Error).message}`);
  process.exit(1);
}
