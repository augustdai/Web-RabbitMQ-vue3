import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElIcons from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'

// 强制暗色模式
document.documentElement.classList.add('dark')

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

Object.entries(ElIcons).forEach(([name, component]) => {
  app.component(name, component)
})

app.mount('#app')
