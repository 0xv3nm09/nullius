// scripts/sync-docs.mjs — kill the doc-drift class at the source.
//
// Three hand-written doc lines quote values that change on every compute:
// the chain head in data/README.md, and the generatedAt/head provenance line
// plus the conclusion quote in README.md. Hand-updating them is how a
// three-minute drift sneaks in. This script is wired into `npm run compute`
// AND asserted in CI (`node scripts/sync-docs.mjs && git diff --exit-code`),
// so drift is repaired on every compute and caught at push time if a doc is
// hand-edited and pushed without one.
//
// Loudness contract: for each replacement, if the file already carries the
// canonical line, it is in sync. If not, the known pattern MUST match — a
// zero-match is an unknown shape and exits 1 rather than silently doing
// nothing. A failed sync is loud.

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

const touched = [];
const problems = [];

function sync(file, expected, pattern, label, replacement) {
  const p = join(ROOT, file);
  const s = readFileSync(p, 'utf8');
  if (s.includes(expected)) return; // already in sync
  if (!pattern.test(s)) {
    problems.push(`${label}: line not found in any known shape — the file shape has drifted and needs a human`);
    return;
  }
  writeFileSync(p, s.replace(pattern, replacement));
  touched.push(label);
}

// 1. data/README.md — the chain-verified example line
sync(
  join('data', 'README.md'),
  `chain verified · 15/15 links · head ${head}…`,
  /chain verified · 15\/15 links · head [0-9a-f]+…/,
  'data/README.md chain head',
  `chain verified · 15/15 links · head ${head}…`,
);

// 2. PROPOSITIONS.md — the provenance line
sync(
  'PROPOSITIONS.md',
  `Values below are from the committed snapshot (\`data/snapshot.json\`, generated ${generatedAt}, captures fetched ${fetchedAt} from \`api.nearblocks.io\`). Chain head: \`${head}…\``,
  /Values below are from the committed snapshot \(`data\/snapshot\.json`, generated [^)]+captures fetched [^)]+from `api\.nearblocks\.io`\)\. Chain head: `[0-9a-f]+…`/,
  'PROPOSITIONS.md provenance',
  `Values below are from the committed snapshot (\`data/snapshot.json\`, generated ${generatedAt}, captures fetched ${fetchedAt} from \`api.nearblocks.io\`). Chain head: \`${head}…\``,
);

// 3. README.md — the conclusion blockquote, count-agnostic (any proposition count)
sync(
  'README.md',
  `> ${conclusion}`,
  /^> Of \d+ propositions:.*?\n/m,
  'README.md conclusion quote',
  `> ${conclusion}\n`,
);

if (problems.length) {
  for (const p of problems) console.error(`SYNC FAILED — ${p}`);
  process.exit(1);
}

console.log(touched.length ? `synced ${touched.length} doc line(s): ${touched.join(', ')}` : 'docs already in sync');
