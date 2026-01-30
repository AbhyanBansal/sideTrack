import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  root: path.join(__dirname, 'app/renderer'),
  publicDir: 'public',
  build: {
    outDir: '../../build/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '127.0.0.1',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app/renderer/src'),
    },
  },
});
