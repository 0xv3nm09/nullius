// src/compute/verdict.ts — the ONLY place in the codebase where a Verdict is
// produced (FR-07). Two layers: the audit gate (an unusable source field
// short-circuits to DATA_UNUSABLE, FR-08) and the falsifier itself, applied
// mechanically. `applyFalsifier` is exported so tests and verify can re-apply
// the falsifier to a record and confirm the verdict was not typed by hand.

import type { FieldAudit, PropositionSpec, Verdict } from '../types.js';

type Support = Record<string, number | string | null>;

/** Apply the machine falsifier to a value. No audit knowledge. */
export function applyFalsifier(spec: PropositionSpec, value: number | null, support: Support = {}): Verdict {
  if (value === null || !Number.isFinite(value)) return 'INCONCLUSIVE';
  switch (spec.kind) {
    case 'lt-50':
      return value < 50 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'le-0':
      return value <= 0 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'ttm-ge-lifetime': {
      const lifetime = Number(support['lifetimeCagrPct']);
      if (!Number.isFinite(lifetime)) return 'INCONCLUSIVE';
      return value >= lifetime ? 'UNSUPPORTED' : 'SUPPORTED';
    }
    case 'lt-0.3':
      return value < 0.3 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'unusable-zero-usable-days':
      return Number(support['usableDays']) === 0 ? 'DATA_UNUSABLE' : 'SUPPORTED';
    case 'unusable-stale-gt-90':
      return Number(support['staleDays']) > 90 ? 'DATA_UNUSABLE' : 'SUPPORTED';
    case 'unusable-break-gt-50x':
      return Number(support['ratio']) > 50 ? 'DATA_UNUSABLE' : 'SUPPORTED';
    case 'le-1':
      return value <= 1 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'lt-15':
      return value < 15 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'gt-10':
      return value > 10 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'lt-ungrouped': {
      const ungrouped = Number(support['ungroupedNakamoto']);
      if (!Number.isFinite(ungrouped)) return 'INCONCLUSIVE';
      return value < ungrouped ? 'UNSUPPORTED' : 'SUPPORTED';
    }
    case 'lt-10':
      return value < 10 ? 'UNSUPPORTED' : 'SUPPORTED';
    case 'gt-300':
      return value > 300 ? 'UNSUPPORTED' : 'SUPPORTED';
  }
}

/** Full decision: audit gate first (DATA_UNUSABLE short-circuits, FR-08),
 * then the falsifier. Throws if a depended-on field has no audit entry —
 * that is an FR-06 violation and must fail loudly, not silently pass. */
export function decide(spec: PropositionSpec, value: number | null, audit: FieldAudit[], support: Support = {}): Verdict {
  for (const f of spec.dependsOn) {
    const a = audit.find((x) => x.field === f);
    if (!a) {
      throw new Error(`verdict: ${spec.id} depends on field \`${f}\` which has no audit entry (FR-06)`);
    }
    if (!a.usable) return 'DATA_UNUSABLE';
  }
  return applyFalsifier(spec, value, support);
}
