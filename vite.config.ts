import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Build-time self-report: visible in the build log.
// Shows exactly what Vite will bake into the bundle (OS env + .env files).
// NOTE: secrets are never printed — lengths only.
const _mode = process.env.NODE_ENV === 'production' || process.argv.includes('build') ? 'production' : 'development'
const _loadedEnv = loadEnv(_mode, process.cwd(), '')
const _nvKey = _loadedEnv.VITE_NVIDIA_API_KEY || ''
const _gqKey = _loadedEnv.VITE_GROQ_API_KEY || ''
console.log(
  `[env-check] mode=${_mode} VITE_NVIDIA_API_KEY: ${_nvKey ? `present(len ${_nvKey.length})` : 'MISSING'} | ` +
  `VITE_GROQ_API_KEY: ${_gqKey ? `present(len ${_gqKey.length})` : 'MISSING'}`
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8443,
    host: true,
    proxy: {
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, ''),
        secure: true,
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, ''),
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' || warning.message?.includes('external')) return
        warn(warning)
      },
    },
  },
  optimizeDeps: {
    exclude: ['jszip'],
  },
})
