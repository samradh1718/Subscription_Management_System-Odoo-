import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin API: session cookies stay first-party (docs/decisions.md D-004)
    proxy: { '/api': 'http://localhost:8000' },
  },
})
