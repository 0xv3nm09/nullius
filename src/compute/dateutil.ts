// src/compute/dateutil.ts — pure UTC civil-date arithmetic with NO use of
// `Date` anywhere. ISO date strings are parsed with a regex and converted
// with Howard Hinnant's days-from-civil algorithm. The compute layer is
// forbidden from reading the clock (FR-03/TS-03); every "now" it needs is a
// date that came from the data, such as the last row of the series.

export function daysFromCivil(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) throw new Error(`dateutil: not an ISO date: ${date}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`dateutil: out of range: ${date}`);

  const y2 = mo <= 2 ? y - 1 : y;
  const era = Math.floor(y2 / 400);
  const yoe = y2 - era * 400; // [0, 399]
  const mp = mo <= 2 ? mo + 9 : mo - 3; // [0, 11]
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468; // days since 1970-01-01
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return daysFromCivil(b) - daysFromCivil(a);
}

/** Calendar month key 'YYYY-MM' from an ISO date/timestamp. */
export function monthKey(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) throw new Error(`dateutil: not an ISO date: ${date}`);
  return `${m[1]}-${m[2]}`;
}

/** Month key `k` shifted by `delta` months. */
export function shiftMonth(k: string, delta: number): string {
  const y = Number(k.slice(0, 4));
  const mo = Number(k.slice(5, 7));
  const total = y * 12 + (mo - 1) + delta;
  const ny = Math.floor(total / 12);
  const nmo = total - ny * 12 + 1;
  return `${String(ny).padStart(4, '0')}-${String(nmo).padStart(2, '0')}`;
}
