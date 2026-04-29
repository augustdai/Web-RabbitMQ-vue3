import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '',           name: 'Dashboard',   component: () => import('@/views/Dashboard.vue') },
      { path: 'queues',     name: 'Queues',      component: () => import('@/views/Queues.vue') },
      { path: 'exchanges',  name: 'Exchanges',   component: () => import('@/views/Exchanges.vue') },
      { path: 'connections',name: 'Connections', component: () => import('@/views/Connections.vue') },
      { path: 'users',      name: 'Users',       component: () => import('@/views/Users.vue') },
      { path: 'messages',   name: 'Messages',    component: () => import('@/views/Messages.vue') },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const isLoggedIn = !!sessionStorage.getItem('rmq_auth')
  if (to.path !== '/login' && !isLoggedIn) return '/login'
  if (to.path === '/login' && isLoggedIn) return '/'
})

export default router
