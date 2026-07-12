import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
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
    },
    server: {
      proxy: {
        // Proxy /api/loops → Loops REST API (keeps API key out of browser bundle)
        '/api/loops': {
          target: 'https://app.loops.so',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/loops/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_LOOPS_API_KEY}`)
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})
