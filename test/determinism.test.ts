// test/determinism.test.ts — compute twice over the same raw inputs and the
// snapshots must be byte-identical (TS-04 / FR-04). Runs on the committed
// fixture slice plus minimal synthetic stats/validators, keeping the 1.5 MB
// capture out of the test path.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSnapshot } from '../src/compute/index';
import type { Capture, Snapshot } from '../src/types';

const ROOT = join(__dirname, '..');

const chartsRaw = readFileSync(join(ROOT, 'test', 'fixtures', 'charts.slice.json'), 'utf8');

// Minimal synthetic stats + validators captures shaped exactly like the
// source (parse must accept them; values only feed context fields here).
const statsRaw = JSON.stringify({
  stats: [
    {
      total_supply: '1311625144032720116407840772458244',
      circulating_supply: '1249836992159308065117756741322730',
      avg_block_time: '0.55050000',
      gas_price: '100000000',
      nodes_online: 371,
      near_price: '3.09000000',
      near_btc_price: '0.00004728',
      market_cap: '4052811473.00000000',
      volume: '455375654.00000000',
      high_24h: '3.55000000',
      high_all: '20.44000000',
      low_24h: '3.18000000',
      low_all: '0.52676200',
      change_24: '-11.99741000',
      total_txns: '5482949792',
      tps: 17,
    },
  ],
});

const validatorsRaw = JSON.stringify({
  total: 742,
  currentValidators: 371,
  totalStake: '593372643427247499039494722567712864',
  lastEpochApy: '4.91',
  validatorFullData: [
    {
      accountId: 'astro-stakers.poolv1.near',
      percent: '5.61',
      cumulativeStake: { accumulatedPercent: '0.00', cumulativePercent: '5.61', ownPercentage: '5.61' },
      currentEpoch: { stake: '33270925619217119134459443495696' },
    },
    {
      accountId: 'figment.poolv1.near',
      percent: '4.70',
      cumulativeStake: { accumulatedPercent: '0.00', cumulativePercent: '10.31', ownPercentage: '4.70' },
      currentEpoch: { stake: '27888514183216128273117564125465' },
    },
    {
      accountId: 'cnear-1.poolv1.near',
      percent: '3.87',
      cumulativeStake: { accumulatedPercent: '0.00', cumulativePercent: '14.18', ownPercentage: '3.87' },
      currentEpoch: { stake: '22961525571000000000000000000000' },
    },
  ],
});

const captures: Capture[] = [
  { id: 'charts', url: 'https://api.nearblocks.io/v1/charts', fetchedAt: '2026-11-14T16:44:22.173Z', bytes: chartsRaw.length, sha256: 'fixture' },
  { id: 'stats', url: 'https://api.nearblocks.io/v1/stats', fetchedAt: '2026-11-14T16:44:22.385Z', bytes: statsRaw.length, sha256: 'fixture' },
  { id: 'validators', url: 'https://api.nearblocks.io/v1/validators', fetchedAt: '2026-11-14T16:44:23.058Z', bytes: validatorsRaw.length, sha256: 'fixture' },
];

function input() {
  return { chartsRaw, statsRaw, validatorsRaw, captures };
}

describe('TS-04: compute is deterministic', () => {
  it('two runs with the same generatedAt and secret are byte-identical', async () => {
    const a = await buildSnapshot(input(), { generatedAt: '2026-01-01T00:00:00.000Z', signingSecret: 'determinism-secret' });
    const b = await buildSnapshot(input(), { generatedAt: '2026-01-01T00:00:00.000Z', signingSecret: 'determinism-secret' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a different generatedAt changes ONLY generatedAt', async () => {
    const a = (await buildSnapshot(input(), { generatedAt: '2026-01-01T00:00:00.000Z' })) as Snapshot;
    const b = (await buildSnapshot(input(), { generatedAt: '2026-02-02T00:00:00.000Z' })) as Snapshot;
    expect(a.generatedAt).not.toBe(b.generatedAt);
    const ra = JSON.parse(JSON.stringify(a)) as Record<string, unknown>;
    const rb = JSON.parse(JSON.stringify(b)) as Record<string, unknown>;
    delete ra['generatedAt'];
    delete rb['generatedAt'];
    expect(JSON.stringify(ra)).toBe(JSON.stringify(rb));
  });

  it('receipts differ when the secret differs — but hashes do not (chain is secret-independent)', async () => {
    const a = await buildSnapshot(input(), { generatedAt: '2026-01-01T00:00:00.000Z', signingSecret: 'secret-a' });
    const b = await buildSnapshot(input(), { generatedAt: '2026-01-01T00:00:00.000Z', signingSecret: 'secret-b' });
    expect(a.metrics[0]?.receipt).not.toBe(b.metrics[0]?.receipt);
    expect(a.metrics.map((m) => m.hash)).toEqual(b.metrics.map((m) => m.hash));
  });

  it('the canonical JSON form is stable under key-order shuffling', async () => {
    const { canonicalJSON } = await import('../src/compute/canonical');
    expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
    expect(canonicalJSON({ z: { y: 1, x: [2, { c: 3, b: 4 }] } })).toBe('{"z":{"x":[2,{"b":4,"c":3}],"y":1}}');
  });
});
