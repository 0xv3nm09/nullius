// test/benford.test.ts — the digit-distribution test class (H1): expected
// frequencies, the applicability precondition, and the worked example the
// Method page promises (total_supply is NOT a Benford candidate).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { benfordTest, FIRST_EXPECTED, SECOND_EXPECTED } from '../src/compute/benford';
import type { Snapshot } from '../src/types';

const ROOT = join(__dirname, '..');

describe('Benford expected frequencies', () => {
  it('first- and second-digit distributions each sum to 1', () => {
    const sum1 = FIRST_EXPECTED.reduce((a, b) => a + b, 0);
    const sum2 = SECOND_EXPECTED.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum1 - 1)).toBeLessThan(1e-9);
    expect(Math.abs(sum2 - 1)).toBeLessThan(1e-9);
  });

  it('digit 1 is the most frequent first digit (30.1%)', () => {
    expect(FIRST_EXPECTED[0]).toBeCloseTo(Math.log10(2), 12);
    expect(FIRST_EXPECTED[0]).toBeGreaterThan(FIRST_EXPECTED[8] as number);
  });
});

describe('the applicability precondition (the part most implementations skip)', () => {
  it('a monotonic narrow-range series (total_supply-like) is NOT_APPLICABLE, not nonconformant', () => {
    // total_supply: 1.0e9 → 1.31e9 — first digit 1 on every day
    const values = Array.from({ length: 400 }, (_, i) => 1e9 * (1 + (i / 400) * 0.31));
    const r = benfordTest(values, 'total_supply');
    expect(r.verdict).toBe('NOT_APPLICABLE');
    expect(r.reason).toBe('INSUFFICIENT_RANGE');
    expect(r.log10Range).toBeLessThan(2);
  });

  it('a wide-range deterministic log-uniform series conforms on the first digit', () => {
    // golden-ratio hop across FIVE whole decades — log-uniform over integer
    // decades is exactly the multiplicative process Benford describes.
    // (Partial-decade spans are NOT Benford — which is precisely why the
    // precondition gate exists.)
    const values = Array.from({ length: 900 }, (_, i) => Math.pow(10, (i * 0.6180339887) % 5));
    const r = benfordTest(values, 'synthetic');
    expect(r.applicable).toBe(true);
    expect(r.verdict).toBe('CONFORMS');
    expect(r.first.mad).toBeLessThan(0.012);
  });

  it('a too-short series is INSUFFICIENT_N even with a wide range', () => {
    const values = Array.from({ length: 100 }, (_, i) => Math.pow(10, ((i * 0.618) % 3) + 1));
    const r = benfordTest(values, 'short');
    expect(r.verdict).toBe('NOT_APPLICABLE');
    expect(r.reason).toBe('INSUFFICIENT_N');
  });
});

describe('over the committed snapshot (the worked example on the Method page)', () => {
  const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8')) as Snapshot;

  it('total_supply is NOT_APPLICABLE — 100% first-digit 1 against Benford is an artefact, not fraud', () => {
    const b = snap.benford.find((x) => x.field === 'total_supply');
    expect(b?.verdict).toBe('NOT_APPLICABLE');
    expect(b?.reason).toBe('INSUFFICIENT_RANGE');
  });

  it('multichain_txns (all zeros) is NOT_APPLICABLE — no digit data exists', () => {
    const b = snap.benford.find((x) => x.field === 'multichain_txns');
    expect(b?.verdict).toBe('NOT_APPLICABLE');
    expect(b?.n).toBe(0);
  });

  it('every applicable field carries first- and second-digit statistics', () => {
    for (const b of snap.benford) {
      if (!b.applicable) continue;
      expect(b.first.observed.length).toBe(9);
      expect(b.second.observed.length).toBe(10);
      expect(b.first.mad).toBeGreaterThan(0);
    }
  });
});

describe('MAD bands are digit-specific (Nigrini: the second digit is graded tighter)', () => {
  const snap = JSON.parse(
    readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8'),
  ) as Snapshot;

  it('a clean first digit does not rescue a second digit in the 0.012+ band', () => {
    // deleted_accounts-shaped: mad1 ≈ 0.0106 (acceptable on the first digit),
    // mad2 ≈ 0.077 (far past the second-digit nonconformity threshold of 0.012).
    const d = snap.benford.find((b) => b.field === 'deleted_accounts');
    expect(d).toBeDefined();
    expect(d!.first.mad).toBeLessThan(0.012); // would pass on the first digit alone
    expect(d!.second.mad).toBeGreaterThan(0.012); // fails the second-digit band
    expect(d!.verdict).toBe('NONCONFORMANT'); // the worse digit must win
  });

  it('the second-digit band is tighter than the first', () => {
    // A field whose second-digit MAD sits between the two thresholds must not be
    // graded by the first-digit scale.
    const n = snap.benford.find((b) => b.field === 'new_accounts');
    expect(n).toBeDefined();
    expect(n!.second.mad).toBeGreaterThan(0.008); // past second-digit close conformity
    expect(n!.second.mad).toBeLessThan(0.015); // but inside the old first-digit band
    expect(n!.verdict).not.toBe('CONFORMS'); // the tighter band must bite
  });
});
