import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API through same origin so the dashboard works via public tunnels.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
