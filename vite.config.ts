import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-routes-json',
      writeBundle() {
        copyFileSync(
          resolve(__dirname, '_routes.json'),
          resolve(__dirname, 'dist/_routes.json')
        );
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  publicDir: false,
});