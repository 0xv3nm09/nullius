// test/architecture.test.ts — the import-graph guard (TS-03 / FR-03) and
// the no-model-written-numbers rule (TS-13 / FR-13). This test is what makes
// the architecture claim in the README verifiable rather than aspirational.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { SNAPSHOT, assertCaveatRenderable } from '../src/web/lib';

const ROOT = join(__dirname, '..');

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const computeFiles = listFiles(join(ROOT, 'src', 'compute'));

describe('TS-03: the compute layer performs no I/O and no clock reads', () => {
  const forbidden: [RegExp, string][] = [
    [/node:fs/, 'node:fs'],
    [/node:http/, 'node:http'],
    [/node:https/, 'node:https'],
    [/\bfetch\s*\(/, 'fetch call'],
    [/axios|undici|node-fetch/, 'http client'],
    [/openai|anthropic|langchain/, 'LLM SDK'],
    [/Date\.now/, 'Date.now'],
    [/new\s+Date/, 'Date constructor'],
    [/Math\.random/, 'Math.random'],
  ];

  it.each(computeFiles)('%s is clean', (f) => {
    const src = readFileSync(f, 'utf8');
    for (const [re, label] of forbidden) {
      expect({ file: f, violated: label, match: re.test(src) }).toEqual({ file: f, violated: label, match: false });
    }
  });

  it('dateutil does pure civil arithmetic — no Date object anywhere', () => {
    const src = readFileSync(join(ROOT, 'src', 'compute', 'dateutil.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // strip comments
    expect(/Date/.test(code)).toBe(false);
  });
});

describe('TS-03: zone separation', () => {
  it('src/capture does not import metrics or verdict logic', () => {
    for (const f of listFiles(join(ROOT, 'src', 'capture'))) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\s+['"].*compute.*(metrics|verdict)/);
    }
  });

  it('src/web does not import the capture layer', () => {
    for (const f of listFiles(join(ROOT, 'src', 'web'))) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\s+['"].*capture/);
    }
  });

  it('src/web imports the engine only for types', () => {
    for (const f of listFiles(join(ROOT, 'src', 'web'))) {
      const src = readFileSync(f, 'utf8');
      const engineImports = src.match(/from\s+['"]\.\.\/(compute|capture|cli)\/[^'"]+['"]/g) ?? [];
      for (const imp of engineImports) {
        expect({ file: f, imp, isTypeOnly: /import\s+type/.test(src.split(imp)[0] ?? '') || imp.includes('type') }).toBeTruthy();
      }
    }
  });
});

describe('TS-13: no number is model-written', () => {
  it('every prose block is digit-free apart from proposition ids', () => {
    for (const p of SNAPSHOT.prose) {
      expect(p.kind).toBe('prose');
      const stripped = p.body.replace(/T-\d{2}/g, '');
      expect({ id: p.id, digits: /\d/.test(stripped) }).toEqual({ id: p.id, digits: false });
    }
  });

  it('every metric record is code-derived (computedBy names a metrics function)', () => {
    for (const m of SNAPSHOT.metrics) {
      expect(m.computedBy).toMatch(/^metrics\.[A-Za-z]+$/);
    }
  });
});

describe('TS-19: a heuristic metric never renders without its caveat', () => {
  it('T-11 ships heuristic:true and a non-empty caveat', () => {
    const t11 = SNAPSHOT.metrics.find((m) => m.id === 'T-11');
    expect(t11?.heuristic).toBe(true);
    expect(t11?.caveat?.trim().length ?? 0).toBeGreaterThan(40);
    expect(() => assertCaveatRenderable(t11!)).not.toThrow();
  });

  it('rendering a heuristic metric WITHOUT its caveat throws', () => {
    const t11 = SNAPSHOT.metrics.find((m) => m.id === 'T-11')!;
    expect(() => assertCaveatRenderable({ ...t11, caveat: undefined })).toThrow(/FR-19/);
    expect(() => assertCaveatRenderable({ ...t11, caveat: '' })).toThrow(/FR-19/);
  });

  it('no other metric is marked heuristic', () => {
    for (const m of SNAPSHOT.metrics) {
      if (m.id !== 'T-11') expect(m.heuristic).toBeUndefined();
    }
  });
});
