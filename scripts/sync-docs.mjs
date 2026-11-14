// scripts/sync-docs.mjs — kill the doc-drift class at the source.
//
// Three hand-written doc lines quote values that change on every compute:
// the chain head in data/README.md, and the generatedAt/head provenance line
// plus the conclusion quote in README.md. Hand-updating them is how a
// three-minute drift sneaks in (PROPOSITIONS.md once quoted a generatedAt
// from a run that had already been superseded). This script is wired into
// `npm run compute` so the docs are synced mechanically from snapshot.json
// at the same moment the snapshot is written — never from memory.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshot.json'), 'utf8'));
const head = snap.summary.chainHead.slice(0, 12);
const generatedAt = snap.generatedAt;
const conclusion = snap.summary.conclusion;
const captures = JSON.parse(readFileSync(join(ROOT, 'data', 'captures.json'), 'utf8')).captures;
const fetchedAt = captures[0]?.fetchedAt ?? '';

let touched = 0;

// 1. data/README.md — the chain-verified example line
{
  const p = join(ROOT, 'data', 'README.md');
  const s = readFileSync(p, 'utf8');
  const next = s.replace(/(chain verified · 15\/15 links · head )[0-9a-f]+…/, `$1${head}…`);
  if (next !== s) {
    writeFileSync(p, next);
    touched++;
    console.log(`data/README.md: chain head → ${head}…`);
  }
}

// 2. PROPOSITIONS.md — the provenance line
{
  const p = join(ROOT, 'PROPOSITIONS.md');
  const s = readFileSync(p, 'utf8');
  const next = s.replace(
    /Values below are from the committed snapshot \(`data\/snapshot\.json`, generated [^)]+captures fetched [^)]+from `api\.nearblocks\.io`\)\. Chain head: `[0-9a-f]+…`/,
    `Values below are from the committed snapshot (\`data/snapshot.json\`, generated ${generatedAt}, captures fetched ${fetchedAt} from \`api.nearblocks.io\`). Chain head: \`${head}…\``,
  );
  if (next !== s) {
    writeFileSync(p, next);
    touched++;
    console.log(`PROPOSITIONS.md: provenance → ${generatedAt} · head ${head}…`);
  }
}

// 3. README.md — the conclusion blockquote is regenerated, never hand-edited
{
  const p = join(ROOT, 'README.md');
  const s = readFileSync(p, 'utf8');
  const next = s.replace(/> Of 15 propositions:.*?\n/, `> ${conclusion}\n`);
  if (next !== s) {
    writeFileSync(p, next);
    touched++;
    console.log('README.md: conclusion quote regenerated from snapshot');
  }
}

console.log(touched ? `${touched} doc line(s) synced` : 'docs already in sync');
