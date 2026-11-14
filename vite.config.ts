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
    emptyOutDir: true,
  },
});
