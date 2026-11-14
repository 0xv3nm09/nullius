// src/compute/pelt.ts — PELT changepoint detection (Killick, Fearnhead &
// Eckley 2012, "Optimal detection of changepoints with a linear computational
// cost") used as an independent, threshold-free cross-check on the audit
// gate's definitional-break findings (H2 of the hardening brief).
//
// Configuration, stated rather than buried:
//   - change-in-mean Gaussian cost (squared error) on the LOG10-transformed
//     series — these are multiplicative financial series, and a mean-shift
//     test on raw values would fire on scale rather than on regime;
//   - BIC penalty β = 2σ̂² ln n, with σ̂² the population variance of the
//     transformed series;
//   - exact dynamic programming with PELT's functional pruning rule
//     (discard any past candidate s with F(s) + C(s,t) > F(t)).
//
// The brief is explicit about what this is: a CROSS-CHECK, not a replacement.
// If it agrees with the gate, the hand-picked 50× threshold is corroborated
// by an independent method that was told no thresholds. If it disagrees, that
// disagreement is published as a finding about the gate itself. What is
// forbidden is re-tuning the heuristic until the two agree.
//
// Pure, deterministic, dependency-free. No I/O, no clock, no randomness.

/** Returns indices i into `values` where a new segment begins (0 excluded). */
export function peltChangepoints(values: number[]): number[] {
  const n = values.length;
  if (n < 24) return []; // too short for a meaningful segmentation

  const y = values.map((v) => Math.log10(v));

  const S1 = new Float64Array(n + 1); // cumulative sum
  const S2 = new Float64Array(n + 1); // cumulative sum of squares
  for (let i = 0; i < n; i++) {
    S1[i + 1] = S1[i]! + (y[i] as number);
    S2[i + 1] = S2[i]! + (y[i] as number) * (y[i] as number);
  }
  const mean = S1[n]! / n;
  const variance = S2[n]! / n - mean * mean;
  const beta = 2 * Math.max(variance, 1e-12) * Math.log(n);

  // cost of the segment y[s..t), squared error from the segment mean
  const segCost = (s: number, t: number): number => {
    const k = t - s;
    const sy = S1[t]! - S1[s]!;
    const syy = S2[t]! - S2[s]!;
    return syy - (sy * sy) / k;
  };

  const F = new Float64Array(n + 1).fill(Number.POSITIVE_INFINITY);
  F[0] = -beta;
  const back = new Int32Array(n + 1).fill(-1);
  let candidates: number[] = [0];

  for (let t = 1; t <= n; t++) {
    let best = Number.POSITIVE_INFINITY;
    let bestS = 0;
    for (const s of candidates) {
      const c = (F[s] as number) + segCost(s, t) + beta;
      if (c < best) {
        best = c;
        bestS = s;
      }
    }
    F[t] = best;
    back[t] = bestS;
    // functional pruning — keep s only if it could still be optimal later
    const keep: number[] = [];
    for (const s of candidates) {
      if ((F[s] as number) + segCost(s, t) <= F[t]!) keep.push(s);
    }
    keep.push(t);
    candidates = keep;
  }

  // reconstruct
  const out: number[] = [];
  let t = n;
  while (t > 0) {
    const s = back[t] as number;
    if (s > 0) out.push(s);
    t = s;
  }
  return out.reverse();
}
