import { defineConfig } from 'vite';

// base './' sorgt dafür, dass die App unter jedem Repo-Namen auf GitHub Pages läuft.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
