// src/compute/chain.ts — the SHA-256 prev-hash chain over metric records.
//
// hash = SHA256(prevHash ‖ canonicalJSON(record)) where the hashed payload is
// the record WITHOUT its own `hash` and `receipt` fields (they cannot sign
// themselves) but WITH chainIndex and prevHash. Genesis prevHash is 64 zeros.
// One broken link invalidates everything after it — verifyChain names the
// first broken index (FR-10).

import type { MetricRecord } from '../types.js';
import { canonicalJSON, sha256Hex } from './canonical.js';

export type RecordBase = Omit<MetricRecord, 'chainIndex' | 'prevHash' | 'hash' | 'receipt'>;

export const GENESIS_HASH = '0'.repeat(64);

/** The exact bytes a record's hash commits to: everything except `hash` and
 * `receipt` (they cannot sign themselves) but including chainIndex and
 * prevHash. Key order is canonical, so this reproduces across machines. */
export function chainPayload(r: MetricRecord): Record<string, unknown> {
  const { hash: _hash, receipt: _receipt, ...rest } = r;
  return rest as Record<string, unknown>;
}

export function recordHash(r: Omit<MetricRecord, 'hash'>): string {
  return sha256Hex(r.prevHash + canonicalJSON(chainPayload(r as MetricRecord)));
}

export function link(records: RecordBase[]): MetricRecord[] {
  let prev = GENESIS_HASH;
  return records.map((base, i) => {
    const partial = { ...base, chainIndex: i, prevHash: prev, hash: '', receipt: '' };
    const hash = recordHash(partial);
    prev = hash;
    return { ...partial, hash };
  });
}

export function verifyChain(records: MetricRecord[]): { ok: boolean; brokenAt?: number; detail?: string } {
  for (let i = 0; i < records.length; i++) {
    const r = records[i] as MetricRecord;
    const expectedPrev = i === 0 ? GENESIS_HASH : (records[i - 1] as MetricRecord).hash;
    if (r.chainIndex !== i) {
      return { ok: false, brokenAt: i, detail: `chainIndex ${r.chainIndex} != position ${i}` };
    }
    if (r.prevHash !== expectedPrev) {
      return { ok: false, brokenAt: i, detail: `prevHash mismatch: expected ${expectedPrev.slice(0, 8)}… got ${r.prevHash.slice(0, 8)}…` };
    }
    const actual = recordHash(r);
    if (actual !== r.hash) {
      return { ok: false, brokenAt: i, detail: `hash mismatch: expected ${actual.slice(0, 8)}… got ${r.hash.slice(0, 8)}…` };
    }
  }
  return { ok: true };
}
