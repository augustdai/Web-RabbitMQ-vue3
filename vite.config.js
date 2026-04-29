import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/rabbitmq-api': {
        target: 'http://localhost:15672',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/rabbitmq-api/, '/api'),
        configure: (proxy) => {
          // 去掉 WWW-Authenticate header，防止浏览器弹出原生登录框
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['www-authenticate']
          })
        }
      }
    }
  }
})
