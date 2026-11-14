// src/capture/fetch.ts — Zone 2: the ONLY file that touches the network or
// the clock. Captures are stored byte-for-byte: no reformatting, no
// pretty-printing. One retry after two seconds on failure, never a loop.

import type { Capture } from '../types.js';
import { sha256Buf } from '../compute/canonical.js';

export const SOURCES = {
  charts: 'https://api.nearblocks.io/v1/charts',
  stats: 'https://api.nearblocks.io/v1/stats',
  validators: 'https://api.nearblocks.io/v1/validators',
} as const;

export type SourceId = keyof typeof SOURCES;

const TIMEOUT_MS = 90_000;
const RETRY_DELAY_MS = 2_000;

async function getOnce(url: string): Promise<{ body: Uint8Array; fetchedAt: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`capture: ${url} responded ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return { body: buf, fetchedAt: new Date().toISOString() };
}

export async function capture(id: SourceId, url: string): Promise<{ capture: Capture; body: Uint8Array }> {
  let attempt: { body: Uint8Array; fetchedAt: string };
  try {
    attempt = await getOnce(url);
  } catch (first) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    try {
      attempt = await getOnce(url);
    } catch (second) {
      throw new Error(
        `capture: ${url} failed twice (last: ${(second as Error).message}; first: ${(first as Error).message})`,
      );
    }
  }
  return {
    capture: {
      id,
      url,
      fetchedAt: attempt.fetchedAt,
      bytes: attempt.body.byteLength,
      sha256: sha256Buf(attempt.body),
    },
    body: attempt.body,
  };
}
