const path = require('path');

import {
  fileURLToPath,
  URL
} from 'url'

import {
  defineConfig
} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // Allow access from local network
    port: 5173,
  },
  preview: {
    host: '0.0.0.0', // Allow access from local network
    port: 5050,
  },
  resolve: {
    root: path.resolve(__dirname, 'src'),
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "bootstrap/scss/bootstrap";`
      }
    }
  },
})