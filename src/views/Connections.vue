<template>
  <div class="connections-page">
    <div class="page-header">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="连接" name="connections" />
        <el-tab-pane label="信道" name="channels" />
      </el-tabs>
      <div class="header-actions">
        <span class="last-refresh">上次刷新：{{ lastRefreshTime }}</span>
        <el-input
          v-model="searchText"
          placeholder="搜索..."
          clearable
          style="width: 220px"
          :prefix-icon="Search"
        />
        <el-button :icon="Refresh" :loading="loading" @click="refreshData">
          刷新
        </el-button>
        <el-popconfirm
          v-if="activeTab === 'connections'"
          title="确定要断开所有连接吗？此操作不可撤销。"
          confirm-button-text="确定"
          cancel-button-text="取消"
          @confirm="closeAllConnections"
        >
          <template #reference>
            <el-button type="danger" :disabled="filteredConnections.length === 0">
              断开全部
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>

    <!-- 连接 Tab -->
    <div v-if="activeTab === 'connections'">
      <div class="stats-row">
        <el-card v-for="stat in connectionStats" :key="stat.label" class="stat-card" shadow="hover">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredConnections"
        row-key="name"
        stripe
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-detail">
              <el-descriptions title="客户端属性" :column="2" border size="small">
                <el-descriptions-item label="平台">{{ row.client_properties?.platform || '-' }}</el-descriptions-item>
                <el-descriptions-item label="产品">{{ row.client_properties?.product || '-' }}</el-descriptions-item>
                <el-descriptions-item label="版本">{{ row.client_properties?.version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Capabilities">
                  {{ formatCapabilities(row.client_properties?.capabilities) }}
                </el-descriptions-item>
              </el-descriptions>
              <el-descriptions title="网络信息" :column="2" border size="small" style="margin-top: 12px">
                <el-descriptions-item label="Peer Host">{{ row.peer_host || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Peer Port">{{ row.peer_port || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Host">{{ row.host || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Port">{{ row.port || '-' }}</el-descriptions-item>
                <el-descriptions-item label="SSL">{{ row.ssl ? '是' : '否' }}</el-descriptions-item>
                <el-descriptions-item v-if="row.ssl" label="SSL 协议">{{ row.ssl_protocol || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="连接名称" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="copyable" @click="copyText(row.name)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="node" label="节点" min-width="160" show-overflow-tooltip />
        <el-table-column prop="protocol" label="协议" width="120" />
        <el-table-column label="客户端" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatClient(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="user" label="用户" width="100" />
        <el-table-column prop="vhost" label="Virtual Host" width="120" />
        <el-table-column label="信道数" width="80" align="center">
          <template #default="{ row }">{{ row.channels ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="connectionStateType(row.state)" size="small">
              {{ row.state }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收发流量" width="160">
          <template #default="{ row }">
            <span>↓ {{ formatBytes(row.recv_oct) }}</span>
            <span style="margin-left: 8px">↑ {{ formatBytes(row.send_oct) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="连接时间" width="170">
          <template #default="{ row }">{{ formatTime(row.connected_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-popconfirm
              title="确定要断开此连接吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleCloseConnection(row.name)"
            >
              <template #reference>
                <el-button type="danger" link size="small">断开</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && filteredConnections.length === 0" description="当前没有活跃连接" />
    </div>

    <!-- 信道 Tab -->
    <div v-if="activeTab === 'channels'">
      <el-table v-loading="channelLoading" :data="filteredChannels" stripe>
        <el-table-column label="信道名称" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.name }} ({{ row.number }})
          </template>
        </el-table-column>
        <el-table-column label="连接" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.connection_details?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="user" label="用户" width="100" />
        <el-table-column prop="node" label="节点" min-width="160" show-overflow-tooltip />
        <el-table-column label="模式" width="100">
          <template #default="{ row }">
            {{ channelMode(row) }}
          </template>
        </el-table-column>
        <el-table-column label="消费者数" width="90" align="center">
          <template #default="{ row }">{{ row.consumer_count ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="未确认" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.messages_unacknowledged > 0 }">
              {{ row.messages_unacknowledged ?? 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Prefetch" width="90" align="center">
          <template #default="{ row }">
            {{ row.prefetch_count === 0 ? '无限制' : row.prefetch_count }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="channelStateType(row.state)" size="small">
              {{ row.state }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!channelLoading && filteredChannels.length === 0" description="当前没有活跃信道" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getConnections, closeConnection, getChannels } from '@/api/rabbitmq'

const activeTab = ref('connections')
const searchText = ref('')
const loading = ref(false)
const channelLoading = ref(false)
const connections = ref([])
const channels = ref([])
const lastRefreshTime = ref('-')
let timer = null
const connectionStats = computed(() => {
  const total = connections.value.length
  const running = connections.value.filter(c => c.state === 'running').length
  const blocking = connections.value.filter(c => c.state === 'blocking' || c.state === 'blocked').length
  const closing = connections.value.filter(c => c.state === 'closing').length
  return [
    { label: '总连接数', value: total },
    { label: '运行中', value: running },
    { label: '阻塞中', value: blocking },
    { label: '关闭中', value: closing },
  ]
})

const filteredConnections = computed(() => {
  const keyword = searchText.value.toLowerCase()
  if (!keyword) return connections.value
  return connections.value.filter(c =>
    (c.name || '').toLowerCase().includes(keyword) ||
    (c.user || '').toLowerCase().includes(keyword) ||
    (c.vhost || '').toLowerCase().includes(keyword) ||
    (c.node || '').toLowerCase().includes(keyword)
  )
})

const filteredChannels = computed(() => {
  const keyword = searchText.value.toLowerCase()
  if (!keyword) return channels.value
  return channels.value.filter(c =>
    (c.name || '').toLowerCase().includes(keyword) ||
    (c.user || '').toLowerCase().includes(keyword) ||
    (c.node || '').toLowerCase().includes(keyword) ||
    (c.connection_details?.name || '').toLowerCase().includes(keyword)
  )
})

function connectionStateType(state) {
  const map = { running: 'success', blocking: 'warning', blocked: 'danger', closing: 'info' }
  return map[state] || 'info'
}

function channelStateType(state) {
  const map = { running: 'success', flow: 'warning', blocking: 'warning', blocked: 'danger' }
  return map[state] || 'info'
}

function channelMode(row) {
  if (row.confirm) return 'confirm'
  if (row.transactional) return 'transactional'
  return ''
}
function formatClient(row) {
  const product = row.client_properties?.product || ''
  const version = row.client_properties?.version || ''
  return [product, version].filter(Boolean).join(' ') || '-'
}

function formatBytes(bytes) {
  if (bytes == null) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function formatCapabilities(caps) {
  if (!caps || typeof caps !== 'object') return '-'
  return Object.entries(caps)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ') || '-'
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  })
}

function updateRefreshTime() {
  const now = new Date()
  lastRefreshTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

async function fetchConnections() {
  loading.value = true
  try {
    const { data } = await getConnections()
    connections.value = data
    updateRefreshTime()
  } catch {
    ElMessage.error('获取连接列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchChannels() {
  channelLoading.value = true
  try {
    const { data } = await getChannels()
    channels.value = data
    updateRefreshTime()
  } catch {
    ElMessage.error('获取信道列表失败')
  } finally {
    channelLoading.value = false
  }
}
function refreshData() {
  if (activeTab.value === 'connections') {
    fetchConnections()
  } else {
    fetchChannels()
  }
}

function handleTabChange(tab) {
  searchText.value = ''
  if (tab === 'connections') {
    fetchConnections()
  } else {
    fetchChannels()
  }
  resetTimer()
}

function handleExpandChange() {}

async function handleCloseConnection(name) {
  try {
    await closeConnection(name)
    ElMessage.success('连接已断开')
    fetchConnections()
  } catch {
    ElMessage.error('断开连接失败')
  }
}

async function closeAllConnections() {
  try {
    await Promise.all(connections.value.map(c => closeConnection(c.name)))
    ElMessage.success('所有连接已断开')
    fetchConnections()
  } catch {
    ElMessage.error('断开连接失败')
  }
}

function resetTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(refreshData, 10000)
}

onMounted(() => {
  fetchConnections()
  resetTimer()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.connections-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.page-header .el-tabs {
  margin-bottom: 0;
  flex: 1;
}

.page-header :deep(.el-tabs__header) {
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.last-refresh {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  text-align: center;
}

.stat-card :deep(.el-card__body) {
  padding: 12px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.copyable {
  cursor: pointer;
  color: #409eff;
}

.copyable:hover {
  text-decoration: underline;
}

.text-danger {
  color: #f56c6c;
  font-weight: 600;
}

.expand-detail {
  padding: 12px 24px;
}
</style>
