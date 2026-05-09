import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      process: 'process/browser',
      crypto: 'crypto-browserify',
      util: 'util',
      events: 'events',
    }
  },
  define: {
    'process.env': {},
    'global': 'window',
  },
  optimizeDeps: {
    include: ['buffer', 'events', 'process', 'util', 'stream-browserify', 'crypto-browserify'],
  }
})
