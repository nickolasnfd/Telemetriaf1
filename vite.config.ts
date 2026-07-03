import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Asset base path for GitHub Pages (https://nickolasnfd.github.io/Telemetriaf1/)
  base: '/Telemetriaf1/',
  plugins: [react()],
})
