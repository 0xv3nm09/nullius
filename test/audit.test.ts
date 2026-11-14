// test/audit.test.ts — the audit gate (TS-05 / FR-05, TS-06 / FR-06, TS-07 /
// FR-07, TS-08 / FR-08). Unit tests run on the committed fixture slice
// (2023-11-18 → 2024-06-05, 201 rows, the definitional break inside); the
// three known failures are additionally asserted over the real committed
// snapshot.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseCharts } from '../src/compute/parse';
import { auditField } from '../src/compute/audit';
import { PROPOSITIONS, specById } from '../src/propositions';
import { decide } from '../src/compute/verdict';
import { SNAPSHOT } from '../src/web/lib';
import type { DailyRow } from '../src/compute/row';
import type { Snapshot } from '../src/types';

const ROOT = join(__dirname, '..');
const fixture = JSON.parse(readFileSync(join(ROOT, 'test', 'fixtures', 'charts.slice.json'), 'utf8')) as { charts: unknown };
const rows: DailyRow[] = parseCharts(JSON.stringify(fixture));

describe('TS-05: the gate classifies the known failures', () => {
  it('active_contracts is a DEFINITIONAL_BREAK on 2024-06-01 (in the fixture)', () => {
    const a = auditField(rows, 'active_contracts');
    expect(a.usable).toBe(false);
    expect(a.reason).toBe('DEFINITIONAL_BREAK');
    expect((a.evidence['breakDate'] as string).slice(0, 10)).toBe('2024-06-01');
    expect(a.evidence['valueBefore']).toBe(738);
    expect(a.evidence['valueAfter']).toBe(776038);
  });

  it('multichain_txns is EMPTY_SERIES on any span', () => {
    const a = auditField(rows, 'multichain_txns');
    expect(a.reason).toBe('EMPTY_SERIES');
  });

  it('a synthetic frozen field is FROZEN (gate 2, no big data needed)', () => {
    const synthetic: DailyRow[] = Array.from({ length: 120 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      near_price: 1,
      market_cap: i < 10 ? i : 5, // changes for 10 days then frozen for 110
      total_supply: 1,
      circulating_supply: 1,
      blocks: 1,
      gas_fee: 1,
      gas_used: 1,
      txns: 1,
      txn_volume: 1,
      txn_volume_usd: 1,
      txn_fee: 1,
      txn_fee_usd: 1,
      new_accounts: 1,
      active_accounts: 1,
      deleted_accounts: 1,
      new_contracts: 1,
      active_contracts: 1,
      unique_contracts: 1,
      multichain_txns: 1,
    })) as unknown as DailyRow[];
    // NOTE: synthetic dates wrap the day-of-month; the gate only needs
    // strictly-increasing strings for the frozen check, so build real ones:
    const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    for (let i = 0; i < synthetic.length; i++) (synthetic[i] as DailyRow).date = day(i);
    const a = auditField(synthetic, 'market_cap');
    expect(a.reason).toBe('FROZEN');
    expect(a.evidence['staleDays']).toBeGreaterThan(90);
  });

  it('organic spikes do NOT count as breaks: txn_fee and new_contracts stay usable on the full series', () => {
    const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8')) as Snapshot;
    const fee = snap.audit.find((a) => a.field === 'txn_fee');
    const nc = snap.audit.find((a) => a.field === 'new_contracts');
    expect(fee?.usable).toBe(true);
    expect(nc?.usable).toBe(true);
  });
});

describe('TS-05 (over the committed snapshot): the three headline failures', () => {
  const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8')) as Snapshot;

  it('multichain_txns → EMPTY_SERIES', () => {
    const a = snap.audit.find((x) => x.field === 'multichain_txns');
    expect(a?.reason).toBe('EMPTY_SERIES');
  });
  it('circulating_supply → FROZEN since 2025-08-27', () => {
    const a = snap.audit.find((x) => x.field === 'circulating_supply');
    expect(a?.reason).toBe('FROZEN');
    expect(String(a?.evidence['lastChangeDate']).slice(0, 10)).toBe('2025-08-27');
  });
  it('active_contracts → DEFINITIONAL_BREAK on 2024-06-01 at ~1052x', () => {
    const a = snap.audit.find((x) => x.field === 'active_contracts');
    expect(a?.reason).toBe('DEFINITIONAL_BREAK');
    expect(String(a?.evidence['breakDate']).slice(0, 10)).toBe('2024-06-01');
    expect(a?.evidence['ratio']).toBeGreaterThan(1000);
  });
});

describe('TS-06: every depended-on field appears in audit[]', () => {
  it('for all propositions (committed snapshot)', () => {
    for (const m of SNAPSHOT.metrics) {
      for (const f of m.dependsOn) {
        expect({ metric: m.id, field: f, present: SNAPSHOT.audit.some((a) => a.field === f) }).toEqual({
          metric: m.id,
          field: f,
          present: true,
        });
      }
    }
  });
  it('decide() throws loudly when an audit entry is missing (FR-06)', () => {
    const spec = specById('T-01');
    expect(() => decide(spec, 1, [], {})).toThrow(/no audit entry/);
  });
});

describe('TS-07: verdicts re-derive from the falsifier, never from literals', () => {
  it('decide(spec, value, audit, support) reproduces every committed verdict', () => {
    for (const m of SNAPSHOT.metrics) {
      const spec = PROPOSITIONS.find((p) => p.id === m.id);
      expect(spec).toBeTruthy();
      const again = decide(spec!, m.value, SNAPSHOT.audit, m.support);
      expect({ id: m.id, verdict: m.verdict, again }).toEqual({ id: m.id, verdict: m.verdict, again: m.verdict });
    }
  });
  it('the falsifier, applied to the value alone, decides SUPPORTED vs UNSUPPORTED', () => {
    for (const m of SNAPSHOT.metrics) {
      const spec = specById(m.id);
      if (m.verdict === 'DATA_UNUSABLE' || m.verdict === 'INCONCLUSIVE') continue;
      const flippedValue = m.verdict === 'SUPPORTED' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      const flipped = decide(spec, flippedValue, SNAPSHOT.audit, m.support);
      expect({ id: m.id, flipped }).not.toEqual({ id: m.id, flipped: m.verdict });
    }
  });
});

describe('TS-08: an unusable field short-circuits its proposition', () => {
  it('T-05, T-06, T-07 carry value:null and verdict DATA_UNUSABLE', () => {
    for (const id of ['T-05', 'T-06', 'T-07']) {
      const m = SNAPSHOT.metrics.find((x) => x.id === id);
      expect(m?.value).toBeNull();
      expect(m?.verdict).toBe('DATA_UNUSABLE');
    }
  });
  it('usable-field propositions never carry a null value', () => {
    for (const m of SNAPSHOT.metrics) {
      const unusableDep = m.dependsOn.some((f) => !SNAPSHOT.audit.find((a) => a.field === f)?.usable);
      if (!unusableDep) expect({ id: m.id, value: m.value }).not.toEqual({ id: m.id, value: null });
    }
  });
});
