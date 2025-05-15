import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';
import adapter from '@hono/vite-dev-server/cloudflare';
import build from '@hono/vite-cloudflare-pages';

export default defineConfig({
  plugins: [
    react(),
    devServer({
      entry: 'src/index.tsx',
      adapter,
    }),
    build(),
  ],
});