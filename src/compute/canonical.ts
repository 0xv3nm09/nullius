// src/compute/canonical.ts — canonical JSON and SHA-256.
//
// Canonical JSON: keys sorted lexicographically at every level, no whitespace,
// numbers in shortest round-trip form, UTF-8, no trailing newline. Never hash
// through JSON.stringify directly — key order drift is the classic way a hash
// chain silently stops reproducing across Node versions (workbook §9).

import { createHash } from 'node:crypto';

export function canonicalJSON(v: unknown): string {
  return ser(v);
}

function ser(v: unknown): string {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') {
    return JSON.stringify(v);
  }
  if (typeof v === 'string') {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return '[' + v.map(ser).join(',') + ']';
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const val = (v as Record<string, unknown>)[k];
      if (val === undefined) continue; // undefined carries no bytes
      parts.push(JSON.stringify(k) + ':' + ser(val));
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`canonicalJSON: unsupported value ${String(v)}`);
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function sha256Buf(b: Uint8Array): string {
  return createHash('sha256').update(b).digest('hex');
}
