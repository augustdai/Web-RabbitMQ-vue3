<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h2>Dashboard 概览</h2>
      <div class="header-actions">
        <span class="last-update">上次更新: {{ lastUpdateTime }}</span>
        <el-button :icon="Refresh" circle @click="refreshAll" :loading="loading" />
      </div>
    </div>

    <!-- 整体 12 列 Grid，所有 card 都在同一个容器里 -->
    <div class="dashboard-grid">

      <!-- 4 个统计卡片，各占 3 列 -->
      <div class="stat-card card-stat-1" :style="{ '--card-color': statCards[0]?.color }">
        <div class="stat-icon-wrap"><el-icon :size="22"><component :is="statCards[0]?.icon" /></el-icon></div>
        <div class="stat-body">
          <div class="stat-value">{{ statCards[0]?.value }}</div>
          <div class="stat-label">{{ statCards[0]?.label }}</div>
        </div>
      </div>
      <div class="stat-card card-stat-2" :style="{ '--card-color': statCards[1]?.color }">
        <div class="stat-icon-wrap"><el-icon :size="22"><component :is="statCards[1]?.icon" /></el-icon></div>
        <div class="stat-body">
          <div class="stat-value">{{ statCards[1]?.value }}</div>
          <div class="stat-label">{{ statCards[1]?.label }}</div>
        </div>
      </div>
      <div class="stat-card card-stat-3" :style="{ '--card-color': statCards[2]?.color }">
        <div class="stat-icon-wrap"><el-icon :size="22"><component :is="statCards[2]?.icon" /></el-icon></div>
        <div class="stat-body">
          <div class="stat-value">{{ statCards[2]?.value }}</div>
          <div class="stat-label">{{ statCards[2]?.label }}</div>
        </div>
      </div>
      <div class="stat-card card-stat-4" :style="{ '--card-color': statCards[3]?.color }">
        <div class="stat-icon-wrap"><el-icon :size="22"><component :is="statCards[3]?.icon" /></el-icon></div>
        <div class="stat-body">
          <div class="stat-value">{{ statCards[3]?.value }}</div>
          <div class="stat-label">{{ statCards[3]?.label }}</div>
        </div>
      </div>

      <!-- 节点信息：col 1-5，row 2-4 -->
      <el-card header="节点信息" class="card-node">
        <div v-if="nodeInfo" class="node-detail">
          <div class="node-meta">
            <span class="node-name">{{ nodeInfo.name }}</span>
            <el-tag :type="nodeInfo.running ? 'success' : 'danger'" size="small">
              {{ nodeInfo.running ? 'running' : 'stopped' }}
            </el-tag>
            <span class="node-type">{{ nodeInfo.type || 'disc' }}</span>
          </div>
          <div class="node-item">
            <span class="node-item-label">内存</span>
            <el-progress :percentage="nodeInfo.memPercent" :color="nodeInfo.memPercent > 80 ? 'var(--danger)' : 'var(--accent)'" />
            <span class="node-item-detail">{{ nodeInfo.memUsedFmt }} / {{ nodeInfo.memLimitFmt }}</span>
          </div>
          <div class="node-item">
            <span class="node-item-label">文件描述符</span>
            <el-progress :percentage="nodeInfo.fdPercent" :color="nodeInfo.fdPercent > 80 ? 'var(--danger)' : 'var(--success)'" />
            <span class="node-item-detail">{{ nodeInfo.fdUsed }} / {{ nodeInfo.fdTotal }}</span>
          </div>
          <div class="node-item">
            <span class="node-item-label">进程数</span>
            <el-progress :percentage="nodeInfo.procPercent" :color="nodeInfo.procPercent > 80 ? 'var(--danger)' : 'var(--warning)'" />
            <span class="node-item-detail">{{ nodeInfo.procUsed }} / {{ nodeInfo.procTotal }}</span>
          </div>
          <div class="node-item">
            <span class="node-item-label">运行时间</span>
            <span class="node-item-detail">{{ nodeInfo.uptimeFmt }}</span>
          </div>
          <div class="node-item">
            <span class="node-item-label">Erlang</span>
            <span class="node-item-detail">{{ erlangVersion }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无节点数据" />
      </el-card>

      <!-- 消息速率：col 6-12，row 2-4（高） -->
      <el-card header="消息速率" class="card-chart">
        <v-chart class="rate-chart" :option="rateChartOption" autoresize />
      </el-card>

      <!-- Top 队列：col 1-8，row 5-7 -->
      <el-card header="Top 队列" class="card-queues">
        <el-table :data="queues" stripe size="small" max-height="260">
          <el-table-column prop="name" label="队列名" min-width="160">
            <template #default="{ row }">
              <el-link type="primary" @click="$router.push('/queues')">{{ row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="vhost" label="VHost" width="90" />
          <el-table-column prop="messages" label="消息数" width="80" sortable />
          <el-table-column prop="consumers" label="消费者" width="75" />
          <el-table-column prop="state" label="状态" width="85">
            <template #default="{ row }">
              <el-tag :type="row.state === 'running' ? 'success' : 'info'" size="small">{{ row.state }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 监听器：col 9-12，row 5-7 -->
      <el-card header="监听器" class="card-listeners">
        <el-table :data="listeners" stripe size="small" max-height="260">
          <el-table-column prop="protocol" label="协议" min-width="90" />
          <el-table-column prop="port" label="端口" width="70" />
          <el-table-column label="IP" prop="ip_address" min-width="100" />
        </el-table>
      </el-card>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, List, ChatDotRound, Connection, User } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getOverview, getNodes, getQueues } from '@/api/rabbitmq'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const lastUpdateTime = ref('--')
const overview = ref(null)
const nodes = ref([])
const queues = ref([])

const publishRateHistory = ref([])
const deliverRateHistory = ref([])
const timeLabels = ref([])
const MAX_POINTS = 60

let timer = null

function formatBytes(bytes) {
  if (bytes == null) return '--'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatUptime(ms) {
  if (!ms) return '--'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  return `${days}天 ${hours}小时 ${mins}分`
}

function formatTime(date) {
  const d = date || new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}
const statCards = computed(() => {
  const ov = overview.value
  const totals = ov?.object_totals || {}
  const queueTotals = ov?.queue_totals || {}
  return [
    { label: '队列数量', value: totals.queues ?? 0, icon: List, color: '#409eff' },
    { label: '消息总数', value: queueTotals.messages ?? 0, icon: ChatDotRound, color: '#e6a23c' },
    { label: '连接数', value: totals.connections ?? 0, icon: Connection, color: '#67c23a' },
    { label: '消费者数', value: totals.consumers ?? 0, icon: User, color: '#9b59b6' },
  ]
})

const erlangVersion = computed(() => overview.value?.erlang_version || '--')

const listeners = computed(() => {
  const raw = overview.value?.listeners || []
  return raw.map((l) => ({
    protocol: l.protocol,
    port: l.port,
    ip_address: l.ip_address || l.node,
  }))
})

const nodeInfo = computed(() => {
  const node = nodes.value[0]
  if (!node) return null
  const memUsed = node.mem_used || 0
  const memLimit = node.mem_limit || 1
  const fdUsed = node.fd_used || 0
  const fdTotal = node.fd_total || 1
  const procUsed = node.proc_used || 0
  const procTotal = node.proc_total || 1
  return {
    name: node.name,
    type: node.type || 'disc',
    running: node.running,
    memPercent: Math.min(100, Math.round((memUsed / memLimit) * 100)),
    memUsedFmt: formatBytes(memUsed),
    memLimitFmt: formatBytes(memLimit),
    fdPercent: Math.min(100, Math.round((fdUsed / fdTotal) * 100)),
    fdUsed,
    fdTotal,
    procPercent: Math.min(100, Math.round((procUsed / procTotal) * 100)),
    procUsed,
    procTotal,
    uptimeFmt: formatUptime(node.uptime),
  }
})
const rateChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['发布速率', '投递速率'], bottom: 0 },
  grid: { top: 10, right: 20, bottom: 30, left: 50 },
  xAxis: { type: 'category', data: timeLabels.value, boundaryGap: false },
  yAxis: { type: 'value', name: '条/秒', minInterval: 1 },
  series: [
    {
      name: '发布速率',
      type: 'line',
      smooth: true,
      data: publishRateHistory.value,
      itemStyle: { color: '#409eff' },
      areaStyle: { color: 'rgba(64,158,255,0.1)' },
    },
    {
      name: '投递速率',
      type: 'line',
      smooth: true,
      data: deliverRateHistory.value,
      itemStyle: { color: '#67c23a' },
      areaStyle: { color: 'rgba(103,194,58,0.1)' },
    },
  ],
}))

async function fetchOverview() {
  const { data } = await getOverview()
  overview.value = data
  const now = new Date()
  const pubRate = data?.message_stats?.publish_details?.rate ?? 0
  const delRate = data?.message_stats?.deliver_get_details?.rate ?? 0
  publishRateHistory.value = [...publishRateHistory.value, pubRate].slice(-MAX_POINTS)
  deliverRateHistory.value = [...deliverRateHistory.value, delRate].slice(-MAX_POINTS)
  timeLabels.value = [...timeLabels.value, formatTime(now)].slice(-MAX_POINTS)
}

async function fetchNodes() {
  const { data } = await getNodes()
  nodes.value = data
}

async function fetchQueues() {
  const { data } = await getQueues()
  queues.value = (data || []).slice(0, 20)
}
async function refreshAll() {
  loading.value = true
  try {
    await Promise.all([fetchOverview(), fetchNodes(), fetchQueues()])
    lastUpdateTime.value = formatTime()
  } catch (e) {
    ElMessage.error('数据加载失败: ' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshAll()
  timer = setInterval(refreshAll, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dashboard-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.last-update {
  font-size: 13px;
  color: var(--text-muted);
}

/* ── 主 Grid：12列 ── */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto auto;
  gap: 16px;
}

/* 行1：4 个统计卡片，各占 3 列 */
.card-stat-1 { grid-column: 1 / 4;  grid-row: 1; }
.card-stat-2 { grid-column: 4 / 7;  grid-row: 1; }
.card-stat-3 { grid-column: 7 / 10; grid-row: 1; }
.card-stat-4 { grid-column: 10 / 13; grid-row: 1; }

/* 行2：节点信息占 5 列，消息速率占 7 列 */
.card-node  { grid-column: 1 / 6;  grid-row: 2; }
.card-chart { grid-column: 6 / 13; grid-row: 2; }

/* 行3：Top 队列占 8 列，监听器占 4 列 */
.card-queues    { grid-column: 1 / 9;  grid-row: 3; }
.card-listeners { grid-column: 9 / 13; grid-row: 3; }

/* stat-card 样式 */
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 3px solid var(--card-color, var(--accent));
}
.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--card-color, var(--accent)) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-color, var(--accent));
  flex-shrink: 0;
}
.stat-body { min-width: 0; }
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* 响应式 */
@media (max-width: 1100px) {
  .card-stat-1, .card-stat-2 { grid-column: span 6; }
  .card-stat-3, .card-stat-4 { grid-column: span 6; }
  .card-node, .card-chart     { grid-column: 1 / 13; grid-row: auto; }
  .card-queues, .card-listeners { grid-column: 1 / 13; }
}

/* 节点信息内容 */
.node-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.node-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.node-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}
.node-type {
  font-size: 12px;
  color: var(--text-muted);
}
.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.node-item-label {
  width: 72px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.node-item .el-progress { flex: 1; }
.node-item-detail {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

/* 速率图 */
.rate-chart {
  height: 280px;
  width: 100%;
}

</style>
