import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

const readTlsOptions = (env) => {
  const keyPath = env.VITE_TLS_KEY_PATH
  const certPath = env.VITE_TLS_CERT_PATH
  if (!keyPath && !certPath) return undefined
  if (!keyPath || !certPath) {
    throw new Error('Set both VITE_TLS_KEY_PATH and VITE_TLS_CERT_PATH to enable HTTPS.')
  }

  return {
    key: fs.readFileSync(path.resolve(keyPath)),
    cert: fs.readFileSync(path.resolve(certPath))
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const https = readTlsOptions(env)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Make the dev server reachable at https://<this-computer-LAN-IP>:5173.
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      https
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Keep the app shell lean; heavy editors stay on their lazy routes.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'react-vendor'
            }
            if (id.includes('yjs') || id.includes('y-quill') || id.includes('/lib0/')) return 'yjs'
            if (id.includes('quill')) return 'quill'
            if (id.includes('xlsx')) return 'xlsx'
            if (id.includes('html2canvas') || id.includes('html2pdf') || id.includes('jspdf')) {
              return 'export'
            }
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('axios') || id.includes('clsx')) return 'http'
            if (id.includes('framer-motion')) return 'motion'
            return undefined
          }
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx}']
    }
  }
})
