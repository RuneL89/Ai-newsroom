import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isGhPages = process.env.GH_PAGES === 'true';

export default defineConfig({
  base: isGhPages ? '/Ai-newsroom/' : './',
  build: {
    outDir: isGhPages ? 'dist' : 'ai-newsroom',
    emptyOutDir: isGhPages,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
