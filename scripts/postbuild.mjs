// Post-build: GitHub Pages must not run Jekyll, or Vite's underscore-prefixed
// assets 404. Drop .nojekyll into the build output.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
writeFileSync(join(docs, '.nojekyll'), '');
console.log('docs/.nojekyll written');
