import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  server: {
    host: '0.0.0.0', // 允许局域网/外网访问
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true, // 同时代理 WebSocket（/api/v1/ws/query-log）
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),   // Tailwind v4 官方 Vite 插件，正确处理 @theme inline 和工具类
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // react core — 变动最少，缓存最久
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core'
          }
          // router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
            return 'router'
          }
          // server state
          if (id.includes('node_modules/@tanstack/')) {
            return 'query'
          }
          // client state
          if (id.includes('node_modules/zustand/')) {
            return 'state'
          }
          // http
          if (id.includes('node_modules/axios/')) {
            return 'http'
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n'
          }
          // charts — lazy loaded，独立 chunk 方便按需加载
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'charts'
          }
          // radix ui primitives — 变动频率低，独立缓存
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-radix'
          }
        },
      },
    },
  },
})
