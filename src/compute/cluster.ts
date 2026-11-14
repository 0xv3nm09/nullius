// src/compute/cluster.ts — name-prefix clustering for T-11.
//
// A deterministic, stated heuristic (workbook §4): normalise a pool id by
// stripping the well-known staking suffixes, tokenise on non-alphanumerics,
// then union tokens where one contains the other as a substring (which is
// what merges `figment` with `ledgerbyfigment`). A pool joins every cluster
// one of its tokens belongs to — `svrn_bitwise` therefore legitimately
// matches both `svrn` and `bitwise`, exactly the ambiguity the workbook
// flags. This module is pure; the caveat lives with the proposition spec.

import type { Pool } from './parse.js';

export interface Cluster {
  cluster: string; // the representative token
  members: { accountId: string; percent: number }[];
  percent: number; // sum of member percents (may overlap other clusters)
}

const SUFFIXES = ['.poolv1.near', '.pool.near', '.staked.near', '.near'];

export function normalizePoolId(accountId: string): string {
  const lower = accountId.toLowerCase();
  for (const s of SUFFIXES) {
    if (lower.endsWith(s)) return lower.slice(0, lower.length - s.length);
  }
  return lower;
}

function tokenize(base: string): string[] {
  return base
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t)); // drop pure-numeric fragments
}

export function clusterByPrefix(pools: Pool[]): Cluster[] {
  // 1. tokens per pool
  const poolTokens = new Map<string, string[]>();
  for (const p of pools) poolTokens.set(p.accountId, tokenize(normalizePoolId(p.accountId)));

  // 2. collect every distinct token
  const all = new Set<string>();
  for (const ts of poolTokens.values()) for (const t of ts) all.add(t);

  // 3. union-find over tokens: equal, or substring with the shorter one >= 4 chars
  const parent = new Map<string, string>();
  const find = (t: string): string => {
    let r = t;
    while ((parent.get(r) ?? r) !== r) r = parent.get(r) as string;
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // deterministic root: the shorter token, then lexicographic
    const root = ra.length < rb.length || (ra.length === rb.length && ra < rb) ? ra : rb;
    parent.set(ra, root);
    parent.set(rb, root);
  };
  const tokens = [...all].sort();
  for (let i = 0; i < tokens.length; i++) {
    parent.set(tokens[i] as string, tokens[i] as string);
  }
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const a = tokens[i] as string;
      const b = tokens[j] as string;
      if (a.includes(b) || b.includes(a)) {
        const shorter = a.length <= b.length ? a : b;
        if (shorter.length >= 4) union(a, b);
      }
    }
  }

  // 4. pools join every cluster their tokens belong to
  const byRoot = new Map<string, Cluster>();
  for (const p of pools) {
    const ts = poolTokens.get(p.accountId) ?? [];
    const roots = new Set(ts.map(find));
    for (const r of roots) {
      let c = byRoot.get(r);
      if (!c) {
        c = { cluster: r, members: [], percent: 0 };
        byRoot.set(r, c);
      }
      c.members.push({ accountId: p.accountId, percent: p.percent });
      c.percent += p.percent;
    }
  }

  // 5. deterministic order: stake desc, then name asc
  return [...byRoot.values()].sort((a, b) => b.percent - a.percent || (a.cluster < b.cluster ? -1 : 1));
}
