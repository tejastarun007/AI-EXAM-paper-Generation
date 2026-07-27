import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/paper': 'http://127.0.0.1:8000',
      '/verify': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/metrics': 'http://127.0.0.1:8000',
      '/generate': 'http://127.0.0.1:8000'
    }
  }
})
