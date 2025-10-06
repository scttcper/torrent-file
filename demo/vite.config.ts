import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
});
