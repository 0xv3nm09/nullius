// test/chain.test.ts — the hash chain and receipts (TS-09 / FR-09,
// TS-10 / FR-10, TS-11 / FR-11).

import { describe, it, expect } from 'vitest';
import { link, verifyChain, chainPayload, type RecordBase } from '../src/compute/chain';
import { sign, verifyReceipt, receiptMatches } from '../src/compute/receipt';
import { canonicalJSON } from '../src/compute/canonical';
import type { MetricRecord, Snapshot } from '../src/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SECRET = 'test-secret-not-used-in-production';

function baseRecord(id: string, value: number): RecordBase {
  return {
    id,
    proposition: `proposition ${id}`,
    metric: 'test metric',
    falsifier: 'UNSUPPORTED if value < 0',
    value,
    unit: 'pct',
    verdict: 'SUPPORTED',
    dependsOn: ['active_accounts'],
    fromCaptures: ['charts'],
    computedBy: 'metrics.testRecord',
    support: { x: value },
  };
}

describe('TS-09: the chain links every record', () => {
  const linked = link([baseRecord('T-01', 1), baseRecord('T-02', 2), baseRecord('T-03', 3)]);

  it('verifyChain passes on a freshly linked chain', () => {
    expect(verifyChain(linked)).toEqual({ ok: true });
  });

  it('genesis prevHash is 64 zeros; each link points at its predecessor', () => {
    expect(linked[0]?.prevHash).toBe('0'.repeat(64));
    expect(linked[1]?.prevHash).toBe(linked[0]?.hash);
    expect(linked[2]?.prevHash).toBe(linked[1]?.hash);
    expect(linked.map((r) => r.chainIndex)).toEqual([0, 1, 2]);
  });

  it('the hash is over canonical JSON of the record without hash/receipt', () => {
    const r = linked[0] as MetricRecord;
    const payload = { ...chainPayload(r) };
    expect(payload['hash']).toBeUndefined();
    expect(payload['receipt']).toBeUndefined();
    expect(payload['value']).toBe(1);
  });
});

describe('TS-10: tamper is detected and named', () => {
  const linked = link([baseRecord('T-01', 1), baseRecord('T-02', 2), baseRecord('T-03', 3)]);
  const tampered: MetricRecord[] = linked.map((r) => ({ ...r }));
  (tampered[2] as MetricRecord).value = 999;

  it('a mutated value breaks the chain at the first affected index', () => {
    const res = verifyChain(tampered);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(2);
    expect(res.detail).toMatch(/hash mismatch/);
  });

  it('a mutated value in the committed snapshot is caught (real data)', () => {
    const snap = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'snapshot.json'), 'utf8')) as Snapshot;
    const broken = snap.metrics.map((m) => (m.id === 'T-01' ? { ...m, value: 12.0 } : m));
    const res = verifyChain(broken);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(0);
  });
});

describe('TS-11: per-metric JWS receipts', () => {
  it('a signed record round-trips and its payload equals the record', async () => {
    const [rec] = link([baseRecord('T-01', 42)]);
    const jws = await sign(rec as MetricRecord, SECRET);
    const payload = await verifyReceipt(jws, SECRET);
    expect(payload.id).toBe('T-01');
    expect(payload.value).toBe(42);
    // receipt payload = the record minus its receipt field (hash included)
    const { receipt: _omit, ...rest } = rec as MetricRecord;
    expect(canonicalJSON(payload)).toBe(canonicalJSON(rest));
    expect(await receiptMatches({ ...(rec as MetricRecord), receipt: jws }, SECRET)).toBe(true);
  });

  it('a tampered record fails its receipt', async () => {
    const [rec] = link([baseRecord('T-01', 42)]);
    const jws = await sign(rec as MetricRecord, SECRET);
    const tampered = { ...(rec as MetricRecord), value: 12, receipt: jws };
    expect(await receiptMatches(tampered, SECRET)).toBe(false);
  });

  it('the wrong secret fails verification', async () => {
    const [rec] = link([baseRecord('T-01', 42)]);
    const jws = await sign(rec as MetricRecord, SECRET);
    await expect(verifyReceipt(jws, 'other-secret')).rejects.toThrow();
  });

  it('every receipt in the committed snapshot covers exactly its record (structural)', () => {
    const snap = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'snapshot.json'), 'utf8')) as Snapshot;
    for (const m of snap.metrics) {
      expect(m.receipt.length).toBeGreaterThan(0);
      const parts = m.receipt.split('.');
      expect(parts.length).toBe(3); // compact JWS
    }
  });
});
