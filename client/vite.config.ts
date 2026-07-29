import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same build works from a file:// Capacitor bundle
  // (the Android wrapper) as well as from a web host.
  base: './',
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
