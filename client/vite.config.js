import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173,
    proxy: {
      // Proxy API calls to backend (adjust host/port if needed)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      // Proxy socket.io websocket traffic
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true
      }
    }
  }
})
