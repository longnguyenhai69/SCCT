import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    // Build thẳng vào server/public để 1 Node app phục vụ luôn
    outDir: '../server/public',
    emptyOutDir: true
  }
})
