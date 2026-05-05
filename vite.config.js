import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 这里的配置是关键
      '/api': {
        target: 'http://localhost:3001', // 👈 指向 Vercel Dev 运行的后端端口
        changeOrigin: true,
      }
    }
  }
})
