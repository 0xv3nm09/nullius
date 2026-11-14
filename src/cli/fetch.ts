// src/cli/fetch.ts — capture the three sources byte-for-byte and commit the
// metadata. Run with network; produces the authoritative raw material.

import { mkdirSync, writeFileSync } from 'node:fs';
import { SOURCES, capture, type SourceId } from '../capture/fetch.js';
import { CAPTURES_PATH, RAW_DIR, loadEnv } from './lib.js';
import type { Capture } from '../types.js';

loadEnv();

const IDS: SourceId[] = ['charts', 'stats', 'validators'];

mkdirSync(RAW_DIR, { recursive: true });
const captures: Capture[] = [];

for (const id of IDS) {
  const url = SOURCES[id];
  process.stdout.write(`capturing ${id} ← ${url} … `);
  const { capture: cap, body } = await capture(id, url);
  writeFileSync(`${RAW_DIR}/${id}.json`, body); // byte-for-byte, never re-serialised
  captures.push(cap);
  process.stdout.write(`${cap.bytes.toLocaleString('en-US')} bytes · sha256 ${cap.sha256.slice(0, 12)}… · at ${cap.fetchedAt}\n`);
}

writeFileSync(CAPTURES_PATH, JSON.stringify({ captures }, null, 2) + '\n');
console.log(`\n${captures.length} captures written; metadata at ${CAPTURES_PATH}`);
console.log('next: npm run compute');
