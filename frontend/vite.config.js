import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron
  optimizeDeps: {
    exclude: ['html2pdf.js'] // Exclude from pre-bundling to avoid parsing issues
  },
  esbuild: {
    // Ignore syntax errors in large template strings
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    commonjsOptions: {
      include: [/html2pdf\.js/, /node_modules/]
    }
  }
})
