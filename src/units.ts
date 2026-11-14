// src/units.ts — the ONLY yocto conversion. Every NEAR figure in the project
// goes through here; nothing converts inline (workbook §3, §10).

export function yoctoToNear(y: string | number): number {
  const v = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(v)) {
    throw new Error(`yoctoToNear: not a number: ${String(y)}`);
  }
  return v / 1e24;
}

/** Round-trippable display formatting is left to the web layer; the compute
 * layer keeps raw doubles. This helper exists for code-derived prose. */
export function fmt(n: number, digits = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
