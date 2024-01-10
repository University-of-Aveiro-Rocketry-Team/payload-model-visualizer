import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

// Load environment variables from .env
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    BROKER_HOST: `"${process.env.BROKER_HOST}"`,
    BROKER_PORT: `${process.env.BROKER_PORT}`,
    BROKER_USERNAME: `"${process.env.BROKER_USERNAME}"`,
    BROKER_PASSWORD: `"${process.env.BROKER_PASSWORD}"`,
    MAP_KEY: `"${process.env.MAP_KEY}"`,
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
