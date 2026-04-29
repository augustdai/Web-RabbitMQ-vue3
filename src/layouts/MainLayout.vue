<template>
  <el-container class="app-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo-section">
        <div class="logo-icon">🐇</div>
        <div class="logo-text">
          <span class="logo-name">RabbitMQ</span>
          <span class="logo-sub">Console</span>
        </div>
      </div>

      <nav class="nav-section">
        <div class="nav-group-label">监控</div>
        <router-link v-for="item in navItems.slice(0,1)" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>

        <div class="nav-group-label">消息</div>
        <router-link v-for="item in navItems.slice(1,3)" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>

        <div class="nav-group-label">网络</div>
        <router-link v-for="item in navItems.slice(3,4)" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>

        <div class="nav-group-label">管理</div>
        <router-link v-for="item in navItems.slice(4)" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="node-info" v-if="overview">
          <div class="node-dot" :class="{ online: serverRunning }"></div>
          <span class="node-name">{{ overview.node?.replace('rabbit@', '') }}</span>
        </div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="header-breadcrumb">
          <span class="header-page-title">{{ currentPageTitle }}</span>
        </div>
        <div class="header-right">
          <div class="cluster-badge" v-if="overview">
            <span class="cluster-dot"></span>
            <span>{{ overview.cluster_name }}</span>
          </div>
          <div class="version-badge" v-if="overview">v{{ overview.rabbitmq_version }}</div>
          <el-dropdown @command="handleUserCommand">
            <div class="user-menu">
              <div class="user-avatar">{{ currentUser.charAt(0).toUpperCase() }}</div>
              <span class="user-name">{{ currentUser }}</span>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOverview } from '@/api/rabbitmq'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const overview = ref(null)
const serverRunning = ref(false)
const currentUser = computed(() => sessionStorage.getItem('rmq_user') || 'guest')

const navItems = [
  { path: '/',            label: '概览',   icon: 'DataAnalysis' },
  { path: '/queues',      label: '队列',   icon: 'List' },
  { path: '/exchanges',   label: '交换机', icon: 'Share' },
  { path: '/connections', label: '连接',   icon: 'Connection' },
  { path: '/users',       label: '用户',   icon: 'User' },
  { path: '/messages',    label: '消息工具', icon: 'Message' },
]

const pageMap = {
  '/':            '概览 Dashboard',
  '/queues':      '队列管理',
  '/exchanges':   '交换机',
  '/connections': '连接监控',
  '/users':       '用户管理',
  '/messages':    '消息工具',
}
const currentPageTitle = computed(() => pageMap[route.path] || '')

async function handleUserCommand(cmd) {
  if (cmd === 'logout') {
    await ElMessageBox.confirm('确认退出登录？', '退出', { type: 'warning', confirmButtonText: '退出', cancelButtonText: '取消' })
    sessionStorage.removeItem('rmq_user')
    sessionStorage.removeItem('rmq_pass')
    sessionStorage.removeItem('rmq_auth')
    router.push('/login')
  }
}

onMounted(async () => {
  try {
    const { data } = await getOverview()
    overview.value = data
    serverRunning.value = true
  } catch {
    serverRunning.value = false
  }
})
</script>

<style scoped>
.app-container { height: 100vh; }

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface) !important;
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.logo-icon { font-size: 24px; line-height: 1; }
.logo-name { display: block; font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.logo-sub  { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }

.nav-section { flex: 1; padding: 12px 8px; overflow-y: auto; }
.nav-group-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 8px 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  margin-bottom: 1px;
}
.nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.nav-item.active { background: rgba(88,166,255,0.12); color: var(--accent); }
.nav-item .el-icon { font-size: 15px; flex-shrink: 0; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.node-info { display: flex; align-items: center; gap: 8px; }
.node-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.node-dot.online { background: var(--success); box-shadow: 0 0 6px rgba(63,185,80,0.5); }
.node-name { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Header */
.app-header {
  height: 56px !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.header-page-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.header-right { display: flex; align-items: center; gap: 12px; }

.cluster-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
}
.cluster-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 5px rgba(63,185,80,0.5);
}
.version-badge {
  padding: 3px 8px;
  background: rgba(88,166,255,0.1);
  border: 1px solid rgba(88,166,255,0.2);
  border-radius: 4px;
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.user-menu {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.user-menu:hover { background: var(--bg-elevated); }
.user-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1f6feb, #58a6ff);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.user-name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.user-arrow { font-size: 12px; color: var(--text-muted); }
</style>
