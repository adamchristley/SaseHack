import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pure client-side SPA. No backend — all data is bundled JSON, all logic runs in the browser.
export default defineConfig({
  plugins: [react()],
})
