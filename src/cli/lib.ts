// src/cli/lib.ts — shared CLI plumbing: repo paths, .env loading, capture
// reading with the refusal contract (a raw capture whose SHA-256 does not
// match its recorded hash stops the run — compute refuses to run rather
// than produce a figure).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Capture } from '../types.js';
import { sha256Buf } from '../compute/canonical.js';

export const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
export const DATA_DIR = join(ROOT, 'data');
export const RAW_DIR = join(DATA_DIR, 'raw');
export const SNAPSHOT_PATH = join(DATA_DIR, 'snapshot.json');
export const CAPTURES_PATH = join(DATA_DIR, 'captures.json');

export function rawPath(id: string): string {
  return join(RAW_DIR, `${id}.json`);
}

/** Minimal .env loader — no dependency. Existing env vars win. */
export function loadEnv(): void {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1] as string;
    let val = m[2] as string;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

export function signingSecret(): string | undefined {
  const s = process.env['MANDATE_SIGNING_SECRET'];
  return s && !s.startsWith('replace-with') ? s : undefined;
}

export interface RawSet {
  captures: Capture[];
  bodies: Record<string, Uint8Array>;
}

/** Read the committed captures + raw bodies and enforce the refusal
 * contract: every byte length and SHA-256 must match what was recorded. */
export function readRawSet(): RawSet {
  if (!existsSync(CAPTURES_PATH)) {
    throw new Error(`no captures found at ${CAPTURES_PATH} — run \`npm run fetch\` first`);
  }
  const parsed = JSON.parse(readFileSync(CAPTURES_PATH, 'utf8')) as Capture[] | { captures: Capture[] };
  const captures: Capture[] = Array.isArray(parsed) ? parsed : parsed.captures;
  const bodies: Record<string, Uint8Array> = {};
  for (const c of captures) {
    const p = rawPath(c.id);
    if (!existsSync(p)) throw new Error(`capture ${c.id}: raw body missing at ${p}`);
    const body = new Uint8Array(readFileSync(p));
    if (body.byteLength !== c.bytes) {
      throw new Error(`capture ${c.id}: byte length ${body.byteLength} != recorded ${c.bytes} — refusing to compute`);
    }
    const hash = sha256Buf(body);
    if (hash !== c.sha256) {
      throw new Error(`capture ${c.id}: sha256 ${hash} != recorded ${c.sha256} — refusing to compute`);
    }
    bodies[c.id] = body;
  }
  return { captures, bodies };
}

export function decode(body: Uint8Array): string {
  return new TextDecoder().decode(body);
}
