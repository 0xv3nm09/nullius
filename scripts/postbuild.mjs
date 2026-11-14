// Post-build, two jobs:
//
// 1. GitHub Pages must not run Jekyll, or Vite's underscore-prefixed assets
//    404. Drop .nojekyll into the build output.
//
// 2. Prune orphaned hashed assets. `docs/` is both the Pages publish root and
//    the home of the prose documentation set, so vite runs with
//    emptyOutDir:false (see vite.config.ts) — otherwise every build would
//    delete docs/*.md. The cost of that is that old content-hashed bundles
//    would pile up in docs/assets/ forever, so we delete any asset the freshly
//    written docs/index.html does not reference.
//
// Net effect: docs/ holds exactly one build plus the documentation, and
// `git status` after a no-op rebuild is clean.
import { writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');

writeFileSync(join(docs, '.nojekyll'), '');
console.log('docs/.nojekyll written');

const assetsDir = join(docs, 'assets');
if (existsSync(assetsDir)) {
  const html = readFileSync(join(docs, 'index.html'), 'utf8');
  const orphans = readdirSync(assetsDir).filter((f) => !html.includes(f));
  for (const f of orphans) rmSync(join(assetsDir, f));
  console.log(
    orphans.length
      ? `docs/assets: pruned ${orphans.length} orphaned asset(s) — ${orphans.join(', ')}`
      : 'docs/assets: no orphans',
  );
}
