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
    }
  }
})
