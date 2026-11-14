import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' so the built console works BOTH from GitHub Pages at /<repo>/
// and from `npx serve docs` at the filesystem root. There is no client
// router, so relative asset URLs are safe.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'docs',
    // MUST stay false: `docs/` is both the Pages publish root (main / docs)
    // and the home of the prose documentation set (ARCHITECTURE.md,
    // DIAGRAMS.md, …). With emptyOutDir true, every build silently deletes
    // those files. scripts/postbuild.mjs prunes orphaned hashed assets
    // instead, so the output stays clean without eating the docs.
    emptyOutDir: false,
  },
});
