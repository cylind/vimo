import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),
    },
  },
  // 确保 publicDir 不影响输出
  publicDir: false,
});