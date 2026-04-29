<template>
  <div class="queues-page">
    <div class="toolbar">
      <h2 class="page-title">队列管理</h2>
      <div class="toolbar-actions">
        <el-select
          v-model="selectedVhost"
          placeholder="选择 Virtual Host"
          clearable
          style="width: 200px"
          @change="fetchQueues"
        >
          <el-option
            v-for="v in vhosts"
            :key="v.name"
            :label="v.name"
            :value="v.name"
          />
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索队列名..."
          clearable
          style="width: 220px"
          :prefix-icon="Search"
        />
        <el-button :icon="Refresh" @click="fetchQueues" :loading="loading">
          刷新
        </el-button>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          创建队列
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedQueues"
      row-key="name"
      stripe
      @expand-change="handleExpandChange"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <queue-detail-expand
            :queue="row"
            :bindings="bindingsMap[`${row.vhost}/${row.name}`]"
            :bindings-loading="bindingsLoadingMap[`${row.vhost}/${row.name}`]"
          />
        </template>
      </el-table-column>
      <el-table-column label="队列名称" prop="name" min-width="200" show-overflow-tooltip />
      <el-table-column label="Virtual Host" prop="vhost" width="140">
        <template #default="{ row }">
          <el-tag size="small">{{ row.vhost }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="queueTypeTag(row.type || 'classic')"
          >
            {{ row.type || 'classic' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="消息数" prop="messages" width="90" sortable>
        <template #default="{ row }">
          <span :class="{ 'text-orange': row.messages > 0 }">
            {{ row.messages ?? 0 }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="就绪" prop="messages_ready" width="80" sortable />
      <el-table-column label="未确认" width="90" sortable prop="messages_unacknowledged">
        <template #default="{ row }">
          <span :class="{ 'text-red': row.messages_unacknowledged > 0 }">
            {{ row.messages_unacknowledged ?? 0 }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="消费者" prop="consumers" width="80" sortable />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="stateTagType(row.state)"
          >
            {{ row.state || 'unknown' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="持久化" width="70" align="center">
        <template #default="{ row }">
          {{ row.durable ? '✓' : '✗' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :icon="View"
            @click="openMessageDrawer(row)"
          />
          <el-popconfirm
            title="确定清空此队列的所有消息？"
            @confirm="handlePurge(row)"
          >
            <template #reference>
              <el-button link type="warning" :icon="Delete" />
            </template>
          </el-popconfirm>
          <el-popconfirm
            title="确定删除此队列？此操作不可恢复。"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" :icon="Close" />
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredQueues.length"
        layout="total, prev, pager, next"
        background
      />
    </div>
    <el-dialog v-model="showCreateDialog" title="创建队列" width="560px" destroy-on-close>
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="140px">
        <el-form-item label="队列名称" prop="name">
          <el-input v-model="createForm.name" placeholder="输入队列名称" />
        </el-form-item>
        <el-form-item label="Virtual Host" prop="vhost">
          <el-select v-model="createForm.vhost" placeholder="选择 VHost" style="width: 100%">
            <el-option v-for="v in vhosts" :key="v.name" :label="v.name" :value="v.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="classic" value="classic" />
            <el-option label="quorum" value="quorum" />
            <el-option label="stream" value="stream" />
          </el-select>
        </el-form-item>
        <el-form-item label="持久化">
          <el-switch v-model="createForm.durable" />
        </el-form-item>
        <el-form-item label="自动删除">
          <el-switch v-model="createForm.autoDelete" />
        </el-form-item>
        <el-divider content-position="left">高级参数</el-divider>
        <el-form-item label="消息 TTL (ms)">
          <el-input-number v-model="createForm.messageTtl" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大消息数">
          <el-input-number v-model="createForm.maxLength" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="死信交换机">
          <el-input v-model="createForm.dlx" placeholder="x-dead-letter-exchange" />
        </el-form-item>
        <el-form-item label="死信路由键">
          <el-input v-model="createForm.dlrk" placeholder="x-dead-letter-routing-key" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
    <el-drawer
      v-model="showMessageDrawer"
      :title="`消息预览 - ${drawerQueue?.name || ''}`"
      direction="rtl"
      size="60%"
      destroy-on-close
    >
      <div class="drawer-toolbar">
        <el-input-number
          v-model="messageCount"
          :min="1"
          :max="100"
          controls-position="right"
          style="width: 140px"
        />
        <el-button type="primary" :loading="messagesLoading" @click="fetchMessages">
          获取消息
        </el-button>
      </div>
      <div v-if="messages.length === 0 && !messagesLoading" class="empty-messages">
        <el-empty description="暂无消息" />
      </div>
      <div v-for="(msg, idx) in paginatedMessages" :key="idx" class="message-card">
        <div class="message-header">
          <span class="message-index">#{{ (messagePage - 1) * messagePageSize + idx + 1 }}</span>
          <el-tag v-if="msg.redelivered" size="small" type="warning">redelivered</el-tag>
          <span class="message-meta">exchange: {{ msg.exchange || '(default)' }}</span>
          <span class="message-meta">routing_key: {{ msg.routing_key }}</span>
        </div>
        <div v-if="msg.properties && Object.keys(msg.properties).length" class="message-props">
          <span v-for="(val, key) in msg.properties" :key="key" class="prop-item">
            <el-tag size="small" type="info">{{ key }}: {{ val }}</el-tag>
          </span>
        </div>
        <pre class="message-payload">{{ formatPayload(msg.payload) }}</pre>
      </div>
      <div v-if="messages.length > messagePageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="messagePage"
          :page-size="messagePageSize"
          :total="messages.length"
          layout="prev, pager, next"
          small
          background
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Search, Refresh, Plus, View, Delete, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getQueues,
  createQueue,
  deleteQueue,
  purgeQueue,
  getMessages
} from '@/api/rabbitmq.js'
import QueueDetailExpand from '@/components/QueueDetailExpand.vue'

const loading = ref(false)
const queues = ref([])
const vhosts = ref([])
const selectedVhost = ref('')
const searchText = ref('')
const currentPage = ref(1)
const pageSize = 20

const filteredQueues = computed(() => {
  const keyword = searchText.value.toLowerCase()
  return queues.value.filter(q =>
    !keyword || q.name.toLowerCase().includes(keyword)
  )
})

const paginatedQueues = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredQueues.value.slice(start, start + pageSize)
})

async function fetchQueues() {
  loading.value = true
  try {
    const { data } = await getQueues(selectedVhost.value || undefined)
    queues.value = data
    const vhostSet = new Set(data.map(q => q.vhost))
    vhosts.value = [...vhostSet].map(name => ({ name }))
    currentPage.value = 1
  } catch (e) {
    ElMessage.error('加载队列列表失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    loading.value = false
  }
}

// --- Queue type / state helpers ---
function queueTypeTag(type) {
  const map = { classic: '', quorum: 'warning', stream: 'success' }
  return map[type] || 'info'
}

function stateTagType(state) {
  const map = { running: 'success', idle: 'info', stopped: 'danger' }
  return map[state] || 'info'
}
// --- Create queue ---
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  name: '',
  vhost: '/',
  type: 'classic',
  durable: true,
  autoDelete: false,
  messageTtl: undefined,
  maxLength: undefined,
  dlx: '',
  dlrk: ''
})
const createRules = {
  name: [{ required: true, message: '请输入队列名称', trigger: 'blur' }],
  vhost: [{ required: true, message: '请选择 Virtual Host', trigger: 'change' }]
}

async function handleCreate() {
  const form = createFormRef.value
  if (!form) return
  const valid = await form.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    const args = {}
    if (createForm.messageTtl > 0) args['x-message-ttl'] = createForm.messageTtl
    if (createForm.maxLength > 0) args['x-max-length'] = createForm.maxLength
    if (createForm.dlx) args['x-dead-letter-exchange'] = createForm.dlx
    if (createForm.dlrk) args['x-dead-letter-routing-key'] = createForm.dlrk
    if (createForm.type === 'quorum') args['x-queue-type'] = 'quorum'
    if (createForm.type === 'stream') args['x-queue-type'] = 'stream'

    await createQueue(createForm.vhost, createForm.name, {
      durable: createForm.durable,
      auto_delete: createForm.autoDelete,
      arguments: args
    })
    ElMessage.success('队列创建成功')
    showCreateDialog.value = false
    form.resetFields()
    await fetchQueues()
  } catch (e) {
    ElMessage.error('创建失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    creating.value = false
  }
}

// --- Delete / Purge ---
async function handleDelete(row) {
  try {
    await deleteQueue(row.vhost, row.name)
    ElMessage.success(`队列 "${row.name}" 已删除`)
    await fetchQueues()
  } catch (e) {
    ElMessage.error('删除失败: ' + (e.response?.data?.reason || e.message))
  }
}

async function handlePurge(row) {
  try {
    await purgeQueue(row.vhost, row.name)
    ElMessage.success(`队列 "${row.name}" 已清空`)
    await fetchQueues()
  } catch (e) {
    ElMessage.error('清空失败: ' + (e.response?.data?.reason || e.message))
  }
}
// --- Message drawer ---
const showMessageDrawer = ref(false)
const drawerQueue = ref(null)
const messageCount = ref(10)
const messages = ref([])
const messagesLoading = ref(false)
const messagePage = ref(1)
const messagePageSize = 10

const paginatedMessages = computed(() => {
  const start = (messagePage.value - 1) * messagePageSize
  return messages.value.slice(start, start + messagePageSize)
})

function openMessageDrawer(row) {
  drawerQueue.value = row
  messages.value = []
  messagePage.value = 1
  showMessageDrawer.value = true
}

async function fetchMessages() {
  if (!drawerQueue.value) return
  messagesLoading.value = true
  try {
    const { vhost, name } = drawerQueue.value
    const { data } = await getMessages(vhost, name, messageCount.value)
    messages.value = data || []
    messagePage.value = 1
  } catch (e) {
    ElMessage.error('获取消息失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    messagesLoading.value = false
  }
}

function formatPayload(payload) {
  if (!payload) return ''
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

// --- Expand row: bindings ---
const bindingsMap = reactive({})
const bindingsLoadingMap = reactive({})

async function handleExpandChange(row, expandedRows) {
  const key = `${row.vhost}/${row.name}`
  if (!expandedRows.includes(row)) return
  if (bindingsMap[key]) return

  bindingsLoadingMap[key] = true
  try {
    const { data } = await import('@/api/rabbitmq.js').then(m =>
      m.getQueueBindings
        ? m.getQueueBindings(row.vhost, row.name)
        : Promise.resolve({ data: [] })
    )
    bindingsMap[key] = data
  } catch {
    bindingsMap[key] = []
  } finally {
    bindingsLoadingMap[key] = false
  }
}

onMounted(fetchQueues)
</script>

<style scoped>
.queues-page {
  padding: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  margin: 0;
  font-size: 20px;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.text-orange {
  color: #e6a23c;
  font-weight: 600;
}
.text-red {
  color: #f56c6c;
  font-weight: 600;
}
.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.empty-messages {
  padding: 40px 0;
}
.message-card {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.message-index {
  font-weight: 600;
  color: var(--el-color-primary);
}
.message-meta {
  color: var(--el-text-color-secondary, #909399);
}
.message-props {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.message-payload {
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  padding: 10px;
  margin: 0;
  font-size: 13px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
