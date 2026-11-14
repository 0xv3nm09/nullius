// test/pelt.test.ts — the PELT cross-check (H2): exact change-in-mean
// segmentation on deterministic series, plus the agreement the Method page
// claims against the committed audit gate.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { peltChangepoints } from '../src/compute/pelt';
import type { Snapshot } from '../src/types';

const ROOT = join(__dirname, '..');

describe('PELT on deterministic series', () => {
  it('finds a single exact step', () => {
    const y = [...Array(50).fill(1), ...Array(50).fill(10)];
    expect(peltChangepoints(y)).toEqual([50]);
  });

  it('finds both steps in a two-step series', () => {
    const y = [...Array(40).fill(1), ...Array(40).fill(100), ...Array(40).fill(1)];
    expect(peltChangepoints(y)).toEqual([40, 80]);
  });

  it('returns no changepoints for a constant series', () => {
    expect(peltChangepoints(Array(80).fill(7))).toEqual([]);
  });

  it('handles multiplicative scale the same as additive (log transform)', () => {
    // ×100 step in raw values == ×2 in log10 — same segmentation
    const y = [...Array(40).fill(3), ...Array(40).fill(300)];
    expect(peltChangepoints(y)).toEqual([40]);
  });

  it('returns nothing for very short input', () => {
    expect(peltChangepoints([1, 2, 3])).toEqual([]);
  });
});

describe('PELT over the committed snapshot (the agreement the Method page claims)', () => {
  const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8')) as Snapshot;

  it('corroborates the gate: active_contracts is in scope and agrees exactly', () => {
    const c = snap.crosscheck.find((x) => x.field === 'active_contracts');
    expect(c?.inScope).toBe(true);
    expect(c?.agree).toBe(true);
    expect(c?.changepoints).toContain('2024-06-01');
  });

  it('marks event-driven fields out of scope instead of scoring them', () => {
    const d = snap.crosscheck.find((x) => x.field === 'deleted_accounts');
    expect(d?.inScope).toBe(false);
    expect(d?.agree).toBeNull();
    expect(d!.changepointCount).toBeGreaterThan(6);
  });

  it('every crosscheck entry carries its gate finding', () => {
    for (const c of snap.crosscheck) {
      expect(c.gateFinding.length).toBeGreaterThan(0);
    }
  });
});
