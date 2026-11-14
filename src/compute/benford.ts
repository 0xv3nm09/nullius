// src/compute/benford.ts — digit-distribution conformance testing, with the
// applicability precondition the applied literature says almost everyone
// skips (H1 of the hardening brief).
//
// Forensic grounding: Benford's Law gives expected leading-digit frequencies
// for multiplicative, order-spanning series; deviation is long-established
// forensic evidence (Nigrini's standard reference; applied to crypto wash
// trading by Cong, Li, Tang & Yang; second-digit tests discriminate harder —
// arXiv 2301.01809). The precondition matters as much as the test: the law
// needs a series spanning several orders of magnitude. A monotonic field
// like total_supply (1.0e9 → 1.31e9 — first digit 1 on every day) is NOT a
// Benford candidate, and a naive chi-squared would scream fabrication at an
// innocent field. So the test gates on its own validity precondition and
// reports NOT_APPLICABLE with a stated reason. That gate is the contribution.
//
// Pure, deterministic, dependency-free. No I/O, no clock, no randomness.

export type BenfordVerdict = 'CONFORMS' | 'MARGINAL' | 'NONCONFORMANT' | 'NOT_APPLICABLE';

export interface BenfordDigitStats {
  observed: number[]; // counts per bin
  expected: number[]; // expected counts under Benford
  chi2: number;
  mad: number; // mean absolute deviation of proportions
}

export interface BenfordResult {
  field: string;
  applicable: boolean;
  reason?: 'INSUFFICIENT_RANGE' | 'INSUFFICIENT_N';
  n: number; // non-zero observations used
  log10Range: number; // the precondition, reported either way
  first: BenfordDigitStats; // first significant digit, 9 bins (df 8)
  second: BenfordDigitStats; // second significant digit, 10 bins (df 9)
  verdict: BenfordVerdict;
}

export const FIRST_EXPECTED = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)));
export const SECOND_EXPECTED = Array.from({ length: 10 }, (_, d) => {
  let s = 0;
  for (let k = 1; k <= 9; k++) s += Math.log10(1 + 1 / (10 * k + d));
  return s;
});

const MIN_LOG10_RANGE = 2; // the field must span ≥ 2 orders of magnitude
const MIN_N = 300; // and have ≥ 300 non-zero observations
// Nigrini's MAD bands differ by digit. The second-digit distribution is nearly
// flat (≈12% for 0 down to ≈8.5% for 9) where the first declines steeply, so the
// same absolute deviation is stronger evidence and the bands are tighter.
// First digit:  <0.006 close, 0.006–0.012 acceptable, 0.012–0.015 marginal, ≥0.015 nonconformity
// Second digit: <0.008 close, 0.008–0.010 acceptable, 0.010–0.012 marginal, ≥0.012 nonconformity
const FIRST_CONFORMS = 0.012;
const FIRST_MARGINAL = 0.015;
const SECOND_CONFORMS = 0.008;
const SECOND_MARGINAL = 0.012;

function digitOf(v: number, digitIndex: number): number {
  const t = Math.abs(v);
  let e = Math.floor(Math.log10(t));
  let mantissa = t / Math.pow(10, e); // [1, 10) — up to FP slop
  if (mantissa >= 10) {
    // floating-point undercount of the exponent on exact powers of ten
    mantissa /= 10;
    e += 1;
  }
  void e;
  if (digitIndex === 0) return Math.floor(mantissa) - 1; // digits 1..9 → bins 0..8
  return Math.floor(mantissa * 10) % 10; // digits 0..9 → bins 0..9
}

function digitStats(values: number[], expectedProps: number[], digitIndex: number): BenfordDigitStats {
  const k = expectedProps.length;
  const observed = new Array<number>(k).fill(0);
  for (const v of values) {
    const d = digitOf(v, digitIndex);
    observed[d] = (observed[d] ?? 0) + 1;
  }
  const n = values.length;
  const expected = expectedProps.map((p) => p * n);
  let chi2 = 0;
  let mad = 0;
  for (let i = 0; i < k; i++) {
    const exp = expected[i] as number;
    if (exp > 0) chi2 += Math.pow((observed[i] as number) - exp, 2) / exp;
    mad += Math.abs((observed[i] as number) / n - (expectedProps[i] as number));
  }
  return { observed, expected, chi2, mad: mad / k };
}

export function benfordTest(values: number[], field: string): BenfordResult {
  const nonzero = values.filter((v) => v !== null && v !== undefined && v > 0 && Number.isFinite(v));
  const n = nonzero.length;
  const max = n ? Math.max(...nonzero) : 0;
  const min = n ? Math.min(...nonzero) : 0;
  const log10Range = n > 0 && min > 0 ? Math.log10(max / min) : 0;

  let applicable = true;
  let reason: BenfordResult['reason'] | undefined;
  if (log10Range < MIN_LOG10_RANGE) {
    applicable = false;
    reason = 'INSUFFICIENT_RANGE';
  } else if (n < MIN_N) {
    applicable = false;
    reason = 'INSUFFICIENT_N';
  }

  const empty: BenfordDigitStats = {
    observed: new Array<number>(9).fill(0),
    expected: new Array<number>(9).fill(0),
    chi2: 0,
    mad: 0,
  };
  const first = applicable ? digitStats(nonzero, FIRST_EXPECTED, 0) : empty;
  const secondStats = applicable ? digitStats(nonzero, SECOND_EXPECTED, 1) : empty;

  // Verdict = the WORSE of the two digits. Nigrini's bands are defined for
  // the first digit; we apply the same bounds to the second digit as a
  // stated conservative extension (the second-digit literature — arXiv
  // 2301.01809 — shows it discriminates harder, so ignoring it would let a
  // field read CONFORMS while carrying a gross second-digit deviation).
  const sev = (v: BenfordVerdict): number => (v === 'NONCONFORMANT' ? 2 : v === 'MARGINAL' ? 1 : 0);
  const band = (mad: number, conforms: number, marginal: number): BenfordVerdict =>
    mad < conforms ? 'CONFORMS' : mad <= marginal ? 'MARGINAL' : 'NONCONFORMANT';
  let verdict: BenfordVerdict;
  if (!applicable) verdict = 'NOT_APPLICABLE';
  else {
    const v1 = band(first.mad, FIRST_CONFORMS, FIRST_MARGINAL);
    const v2 = band(secondStats.mad, SECOND_CONFORMS, SECOND_MARGINAL);
    verdict = sev(v2) > sev(v1) ? v2 : v1;
  }

  return {
    field,
    applicable,
    reason,
    n,
    log10Range: Math.round(log10Range * 100) / 100,
    first,
    second: secondStats,
    verdict,
  };
}
