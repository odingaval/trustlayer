import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodePolyfills from '@rolldown/plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      util: 'util',
      events: 'events',
      buffer: 'buffer/',
      process: 'process/browser',
    }
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  }
})

