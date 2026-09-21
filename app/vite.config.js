import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Integration build: the React tool ships inside main's static site at /tool/.
// `base` makes asset URLs resolve under /tool/, and the build writes straight
// into ../public/tool so the marketing site and the tool deploy as one folder.
export default defineConfig({
  base: '/tool/',
  plugins: [react()],
  build: {
    outDir: '../public/tool',
    emptyOutDir: true,
  },
  server: {
    // Dev only: the Gemini + national-DB endpoints run on a local Node API server.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
