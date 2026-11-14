// src/compute/receipt.ts — per-metric JWS (HS256) receipts via `jose`.
// The payload is the record minus its `receipt` field, canonicalised. The
// secret comes from the environment and never from the repo. If no secret is
// configured, receipts are skipped and flagged — never fabricated (§15).

import { CompactSign, compactVerify } from 'jose';
import type { MetricRecord } from '../types.js';
import { canonicalJSON } from './canonical.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function receiptPayload(r: Omit<MetricRecord, 'receipt'> | MetricRecord): Record<string, unknown> {
  const { receipt: _receipt, ...rest } = r as MetricRecord;
  return rest;
}

export async function sign(record: MetricRecord, secret: string): Promise<string> {
  if (!secret) throw new Error('receipt.sign: no signing secret configured');
  const payload = canonicalJSON(receiptPayload(record));
  return new CompactSign(encoder.encode(payload))
    .setProtectedHeader({ alg: 'HS256' })
    .sign(encoder.encode(secret));
}

export async function signAll(records: MetricRecord[], secret: string): Promise<MetricRecord[]> {
  const out: MetricRecord[] = [];
  for (const r of records) {
    out.push({ ...r, receipt: await sign(r, secret) });
  }
  return out;
}

/** Verify a compact JWS and return the record it commits to. Throws when the
 * signature or payload does not check out. */
export async function verifyReceipt(jws: string, secret: string): Promise<Omit<MetricRecord, 'receipt'>> {
  const { payload } = await compactVerify(jws, encoder.encode(secret));
  const parsed = JSON.parse(decoder.decode(payload)) as Omit<MetricRecord, 'receipt'>;
  return parsed;
}

/** True when a record's receipt verifies AND commits to exactly this record. */
export async function receiptMatches(record: MetricRecord, secret: string): Promise<boolean> {
  if (!record.receipt) return false;
  try {
    const payload = await verifyReceipt(record.receipt, secret);
    return canonicalJSON(payload) === canonicalJSON(receiptPayload(record));
  } catch {
    return false;
  }
}
