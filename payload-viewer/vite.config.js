import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

// Load environment variables from .env
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    BACKEND_WEBSOCKET_URL: `"${process.env.BACKEND_WEBSOCKET_URL}"`
  },
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
