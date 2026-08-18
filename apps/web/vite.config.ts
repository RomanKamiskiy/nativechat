import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Proxy API + WS through the same origin so the demo works via tunnels / port-forward.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Dev: берём SDK из source, чтобы HMR не ломал hooks после rebuild dist
      '@nativechat/react-sdk': path.resolve(rootDir, '../../packages/react-sdk/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow Cloudflare quick tunnels / Cursor port forwards
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
        changeOrigin: true,
        rewrite: (wsPath) => wsPath.replace(/^\/ws/, '') || '/',
      },
    },
  },
})
