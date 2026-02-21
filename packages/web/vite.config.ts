import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Forward WebSocket connections to the CLI review server during development.
      // Start the CLI with: codechat review --no-open --port 3001
      '/': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
    },
  },
});
