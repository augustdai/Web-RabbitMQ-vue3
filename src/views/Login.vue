<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-grid"></div>
      <div class="bg-glow"></div>
    </div>

    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🐇</div>
        <h1 class="login-title">RabbitMQ Console</h1>
        <p class="login-subtitle">连接到你的 RabbitMQ 管理节点</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-alert
          v-if="errorMsg"
          :title="errorMsg"
          type="error"
          :closable="false"
          show-icon
          class="login-error"
        />

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="login-btn"
          @click="handleLogin"
        >
          {{ loading ? '验证中...' : '登录' }}
        </el-button>
      </el-form>

      <div class="login-footer">
        <span>RabbitMQ {{ version }}</span>
        <span>·</span>
        <span>{{ host }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')
const version = ref('')
const host = ref('localhost:15672')

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value.validate().catch(() => null)
  if (!form.username || !form.password) return

  loading.value = true
  errorMsg.value = ''

  try {
    const credentials = btoa(`${form.username}:${form.password}`)
    const { data } = await axios.get('/rabbitmq-api/whoami', {
      headers: { Authorization: `Basic ${credentials}` }
    })

    // 验证成功，保存凭证
    sessionStorage.setItem('rmq_user', data.name)
    sessionStorage.setItem('rmq_pass', form.password)
    sessionStorage.setItem('rmq_auth', credentials)

    // 获取版本信息
    try {
      const ov = await axios.get('/rabbitmq-api/overview', {
        headers: { Authorization: `Basic ${credentials}` }
      })
      version.value = ov.data.rabbitmq_version
    } catch {}

    router.push('/')
  } catch (err) {
    if (err.response?.status === 401) {
      errorMsg.value = '用户名或密码错误'
    } else {
      errorMsg.value = '无法连接到 RabbitMQ，请检查服务是否运行'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(88,166,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(88,166,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
.bg-glow {
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(88,166,255,0.08) 0%, transparent 70%);
}

.login-card {
  position: relative;
  width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.login-header { text-align: center; margin-bottom: 32px; }
.login-logo { font-size: 48px; line-height: 1; margin-bottom: 16px; }
.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.login-subtitle { font-size: 13px; color: var(--text-secondary); }

.login-form :deep(.el-form-item) { margin-bottom: 16px; }
.login-form :deep(.el-input__wrapper) {
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
  padding: 4px 12px !important;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 3px rgba(88,166,255,0.15) !important;
}
.login-form :deep(.el-input__inner) { height: 40px; font-size: 14px; }
.login-form :deep(.el-input__prefix-icon) { color: var(--text-muted); }

.login-error { margin-bottom: 16px; border-radius: 8px; }

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px !important;
  background: linear-gradient(135deg, #1f6feb, #388bfd) !important;
  border: none !important;
  margin-top: 4px;
  letter-spacing: 0.02em;
}
.login-btn:hover { background: linear-gradient(135deg, #388bfd, #58a6ff) !important; }

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
