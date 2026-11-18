import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export const bundleApp = () => build({
  entryPoints: [fileURLToPath(new URL('../src/app.mjs', import.meta.url))],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
});
