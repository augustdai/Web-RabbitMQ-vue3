<template>
  <div class="exchanges-page">
    <div class="toolbar">
      <h2 class="page-title">交换机管理</h2>
      <div class="toolbar-actions">
        <el-select
          v-model="selectedVhost"
          placeholder="选择 Virtual Host"
          clearable
          style="width: 200px"
          @change="fetchExchanges"
        >
          <el-option v-for="v in vhosts" :key="v.name" :label="v.name" :value="v.name" />
        </el-select>
        <el-select
          v-model="selectedType"
          placeholder="类型过滤"
          clearable
          style="width: 150px"
        >
          <el-option label="全部" value="" />
          <el-option label="direct" value="direct" />
          <el-option label="fanout" value="fanout" />
          <el-option label="topic" value="topic" />
          <el-option label="headers" value="headers" />
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索交换机名..."
          clearable
          style="width: 220px"
          :prefix-icon="Search"
        />
        <el-button :icon="Refresh" @click="fetchExchanges" :loading="loading">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">创建交换机</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedExchanges"
      row-key="tableKey"
      stripe
      :row-class-name="rowClassName"
    >
      <el-table-column label="名称" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.name || '(default)' }}
        </template>
      </el-table-column>
      <el-table-column label="Virtual Host" prop="vhost" width="140">
        <template #default="{ row }">
          <el-tag size="small">{{ row.vhost }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="exchangeTypeTag(row.type)">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="持久化" width="80" align="center">
        <template #default="{ row }">{{ row.durable ? '✓' : '✗' }}</template>
      </el-table-column>
      <el-table-column label="自动删除" width="90" align="center">
        <template #default="{ row }">{{ row.auto_delete ? '✓' : '✗' }}</template>
      </el-table-column>
      <el-table-column label="内置" width="70" align="center">
        <template #default="{ row }">{{ row.internal ? '✓' : '✗' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openBindingDrawer(row)">绑定</el-button>
          <el-button
            v-if="!row.internal"
            link
            type="success"
            @click="openPublishDialog(row)"
          >发布</el-button>
          <el-popconfirm
            title="确定删除此交换机？此操作不可恢复。"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" :disabled="isBuiltIn(row)">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredExchanges.length"
        layout="total, prev, pager, next"
        background
      />
    </div>
    <!-- 创建交换机对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建交换机" width="560px" destroy-on-close>
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="140px">
        <el-form-item label="Virtual Host" prop="vhost">
          <el-select v-model="createForm.vhost" placeholder="选择 VHost" style="width: 100%">
            <el-option v-for="v in vhosts" :key="v.name" :label="v.name" :value="v.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" placeholder="输入交换机名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="direct" value="direct" />
            <el-option label="fanout" value="fanout" />
            <el-option label="topic" value="topic" />
            <el-option label="headers" value="headers" />
          </el-select>
        </el-form-item>
        <el-form-item label="持久化">
          <el-switch v-model="createForm.durable" />
        </el-form-item>
        <el-form-item label="自动删除">
          <el-switch v-model="createForm.autoDelete" />
        </el-form-item>
        <el-form-item label="内置">
          <el-switch v-model="createForm.internal" />
        </el-form-item>
        <el-divider content-position="left">可选参数</el-divider>
        <el-form-item label="Alternate Exchange">
          <el-input v-model="createForm.alternateExchange" placeholder="alternate-exchange（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
    <!-- 绑定管理抽屉 -->
    <el-drawer
      v-model="showBindingDrawer"
      :title="`绑定管理 - ${currentExchange?.name || '(default)'}`"
      direction="rtl"
      size="60%"
      destroy-on-close
    >
      <el-tabs v-model="bindingTab">
        <el-tab-pane label="绑定到队列 (E→Q)" name="e2q">
          <el-table v-loading="bindingsLoading" :data="queueBindings" stripe size="small">
            <el-table-column label="目标队列" prop="destination" min-width="180" show-overflow-tooltip />
            <el-table-column label="Routing Key" prop="routing_key" min-width="160" show-overflow-tooltip />
            <el-table-column label="参数" min-width="120">
              <template #default="{ row }">
                {{ formatArgs(row.arguments) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-popconfirm title="确定删除此绑定？" @confirm="handleDeleteBinding(row, 'e2q')">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-divider content-position="left">添加绑定</el-divider>
          <el-form :inline="false" label-width="100px" class="binding-form">
            <el-form-item label="目标队列">
              <el-select v-model="newE2QBinding.queue" filterable placeholder="选择队列" style="width: 100%">
                <el-option v-for="q in availableQueues" :key="q" :label="q" :value="q" />
              </el-select>
            </el-form-item>
            <el-form-item label="Routing Key">
              <el-input v-model="newE2QBinding.routingKey" placeholder="路由键" />
            </el-form-item>
            <el-form-item label="参数 (JSON)">
              <el-input v-model="newE2QBinding.arguments" type="textarea" :rows="2" placeholder='{"key": "value"}（可选）' />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="bindingCreating" @click="handleCreateE2QBinding">添加绑定</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="绑定到交换机 (E→E)" name="e2e">
          <el-table v-loading="bindingsLoading" :data="exchangeBindings" stripe size="small">
            <el-table-column label="目标交换机" prop="destination" min-width="180" show-overflow-tooltip />
            <el-table-column label="Routing Key" prop="routing_key" min-width="160" show-overflow-tooltip />
            <el-table-column label="参数" min-width="120">
              <template #default="{ row }">
                {{ formatArgs(row.arguments) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-popconfirm title="确定删除此绑定？" @confirm="handleDeleteBinding(row, 'e2e')">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-divider content-position="left">添加绑定</el-divider>
          <el-form :inline="false" label-width="120px" class="binding-form">
            <el-form-item label="目标交换机">
              <el-select v-model="newE2EBinding.destination" filterable placeholder="选择交换机" style="width: 100%">
                <el-option
                  v-for="e in availableExchanges"
                  :key="e.name"
                  :label="e.name || '(default)'"
                  :value="e.name"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Routing Key">
              <el-input v-model="newE2EBinding.routingKey" placeholder="路由键" />
            </el-form-item>
            <el-form-item label="参数 (JSON)">
              <el-input v-model="newE2EBinding.arguments" type="textarea" :rows="2" placeholder='{"key": "value"}（可选）' />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="bindingCreating" @click="handleCreateE2EBinding">添加绑定</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
    <!-- 发布消息对话框 -->
    <el-dialog v-model="showPublishDialog" title="发布消息" width="560px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="交换机">
          <el-input :model-value="publishForm.exchange" disabled />
        </el-form-item>
        <el-form-item label="Routing Key">
          <el-input v-model="publishForm.routingKey" placeholder="输入路由键" />
        </el-form-item>
        <el-form-item v-if="publishForm.exchangeType === 'headers'" label="Headers">
          <el-input
            v-model="publishForm.headers"
            type="textarea"
            :rows="3"
            placeholder='{"key": "value"}'
          />
        </el-form-item>
        <el-form-item label="Payload">
          <el-input v-model="publishForm.payload" type="textarea" :rows="4" placeholder="消息内容" />
        </el-form-item>
        <el-form-item label="Content Type">
          <el-select v-model="publishForm.contentType" style="width: 100%">
            <el-option label="application/json" value="application/json" />
            <el-option label="text/plain" value="text/plain" />
            <el-option label="application/xml" value="application/xml" />
          </el-select>
        </el-form-item>
        <el-form-item label="Delivery Mode">
          <el-radio-group v-model="publishForm.deliveryMode">
            <el-radio :value="1">Non-persistent</el-radio>
            <el-radio :value="2">Persistent</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="handlePublish">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getExchanges,
  createExchange,
  deleteExchange,
  publishMessage,
  getVhosts,
  getQueues,
  getExchangeBindingsSource,
  createBinding,
  deleteBinding,
  createE2EBinding,
  deleteE2EBinding
} from '@/api/rabbitmq'

const loading = ref(false)
const creating = ref(false)
const publishing = ref(false)
const bindingsLoading = ref(false)
const bindingCreating = ref(false)

const exchanges = ref([])
const vhosts = ref([])
const selectedVhost = ref('')
const selectedType = ref('')
const searchText = ref('')
const currentPage = ref(1)
const pageSize = 20

const showCreateDialog = ref(false)
const showBindingDrawer = ref(false)
const showPublishDialog = ref(false)
const currentExchange = ref(null)
const bindingTab = ref('e2q')

const queueBindings = ref([])
const exchangeBindings = ref([])
const availableQueues = ref([])
const availableExchanges = ref([])

const createFormRef = ref(null)
const createForm = reactive({
  vhost: '',
  name: '',
  type: 'direct',
  durable: true,
  autoDelete: false,
  internal: false,
  alternateExchange: ''
})
const createRules = {
  vhost: [{ required: true, message: '请选择 Virtual Host', trigger: 'change' }],
  name: [{ required: true, message: '请输入交换机名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const newE2QBinding = reactive({ queue: '', routingKey: '', arguments: '' })
const newE2EBinding = reactive({ destination: '', routingKey: '', arguments: '' })

const publishForm = reactive({
  exchange: '',
  exchangeType: '',
  vhost: '',
  routingKey: '',
  headers: '',
  payload: '',
  contentType: 'application/json',
  deliveryMode: 2
})

const filteredExchanges = computed(() => {
  let list = exchanges.value
  if (selectedType.value) {
    list = list.filter((e) => e.type === selectedType.value)
  }
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter((e) => (e.name || '').toLowerCase().includes(keyword))
  }
  return list
})

const paginatedExchanges = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredExchanges.value.slice(start, start + pageSize)
})
const isBuiltIn = (row) => row.name === '' || row.name.startsWith('amq.')

const exchangeTypeTag = (type) => {
  const map = { direct: '', fanout: 'success', topic: 'warning', headers: 'info' }
  return map[type] || 'info'
}

const rowClassName = ({ row }) => (isBuiltIn(row) ? 'built-in-row' : '')

const formatArgs = (args) => {
  if (!args || Object.keys(args).length === 0) return '-'
  return JSON.stringify(args)
}

const fetchVhosts = async () => {
  try {
    const { data } = await getVhosts()
    vhosts.value = data
  } catch {
    ElMessage.error('获取 Virtual Host 列表失败')
  }
}

const fetchExchanges = async () => {
  loading.value = true
  try {
    const { data } = await getExchanges(selectedVhost.value || undefined)
    exchanges.value = data.map((e, i) => ({ ...e, tableKey: `${e.vhost}/${e.name || '__default__'}/${i}` }))
  } catch {
    ElMessage.error('获取交换机列表失败')
  } finally {
    loading.value = false
  }
}
const handleCreate = async () => {
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const args = {}
    if (createForm.alternateExchange) {
      args['alternate-exchange'] = createForm.alternateExchange
    }
    await createExchange(createForm.vhost, createForm.name, {
      type: createForm.type,
      durable: createForm.durable,
      auto_delete: createForm.autoDelete,
      internal: createForm.internal,
      arguments: args
    })
    ElMessage.success('交换机创建成功')
    showCreateDialog.value = false
    Object.assign(createForm, { vhost: '', name: '', type: 'direct', durable: true, autoDelete: false, internal: false, alternateExchange: '' })
    await fetchExchanges()
  } catch (err) {
    ElMessage.error('创建失败: ' + (err.response?.data?.reason || err.message))
  } finally {
    creating.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await deleteExchange(row.vhost, row.name)
    ElMessage.success('交换机已删除')
    await fetchExchanges()
  } catch (err) {
    ElMessage.error('删除失败: ' + (err.response?.data?.reason || err.message))
  }
}
const openBindingDrawer = async (row) => {
  currentExchange.value = row
  showBindingDrawer.value = true
  bindingTab.value = 'e2q'
  await fetchBindings(row)
  await fetchAvailableTargets(row.vhost)
}

const fetchBindings = async (exchange) => {
  bindingsLoading.value = true
  try {
    const { data } = await getExchangeBindingsSource(exchange.vhost, exchange.name)
    queueBindings.value = data.filter((b) => b.destination_type === 'queue')
    exchangeBindings.value = data.filter((b) => b.destination_type === 'exchange')
  } catch {
    ElMessage.error('获取绑定列表失败')
  } finally {
    bindingsLoading.value = false
  }
}

const fetchAvailableTargets = async (vhost) => {
  try {
    const [queuesRes, exchangesRes] = await Promise.all([
      getQueues(vhost),
      getExchanges(vhost)
    ])
    availableQueues.value = queuesRes.data.map((q) => q.name)
    availableExchanges.value = exchangesRes.data.filter((e) => e.name !== currentExchange.value?.name)
  } catch {
    ElMessage.error('获取目标列表失败')
  }
}
const parseJsonArgs = (str) => {
  if (!str || !str.trim()) return {}
  try {
    return JSON.parse(str)
  } catch {
    ElMessage.warning('参数 JSON 格式不正确')
    return null
  }
}

const handleCreateE2QBinding = async () => {
  if (!newE2QBinding.queue) {
    ElMessage.warning('请选择目标队列')
    return
  }
  const args = parseJsonArgs(newE2QBinding.arguments)
  if (args === null) return
  bindingCreating.value = true
  try {
    await createBinding(currentExchange.value.vhost, currentExchange.value.name, newE2QBinding.queue, {
      routing_key: newE2QBinding.routingKey,
      arguments: args
    })
    ElMessage.success('绑定创建成功')
    Object.assign(newE2QBinding, { queue: '', routingKey: '', arguments: '' })
    await fetchBindings(currentExchange.value)
  } catch (err) {
    ElMessage.error('创建绑定失败: ' + (err.response?.data?.reason || err.message))
  } finally {
    bindingCreating.value = false
  }
}

const handleCreateE2EBinding = async () => {
  if (!newE2EBinding.destination) {
    ElMessage.warning('请选择目标交换机')
    return
  }
  const args = parseJsonArgs(newE2EBinding.arguments)
  if (args === null) return
  bindingCreating.value = true
  try {
    await createE2EBinding(currentExchange.value.vhost, currentExchange.value.name, newE2EBinding.destination, {
      routing_key: newE2EBinding.routingKey,
      arguments: args
    })
    ElMessage.success('绑定创建成功')
    Object.assign(newE2EBinding, { destination: '', routingKey: '', arguments: '' })
    await fetchBindings(currentExchange.value)
  } catch (err) {
    ElMessage.error('创建绑定失败: ' + (err.response?.data?.reason || err.message))
  } finally {
    bindingCreating.value = false
  }
}
const handleDeleteBinding = async (row, type) => {
  try {
    if (type === 'e2q') {
      await deleteBinding(row.vhost, row.source, row.destination, row.properties_key)
    } else {
      await deleteE2EBinding(row.vhost, row.source, row.destination, row.properties_key)
    }
    ElMessage.success('绑定已删除')
    await fetchBindings(currentExchange.value)
  } catch (err) {
    ElMessage.error('删除绑定失败: ' + (err.response?.data?.reason || err.message))
  }
}

const openPublishDialog = (row) => {
  Object.assign(publishForm, {
    exchange: row.name,
    exchangeType: row.type,
    vhost: row.vhost,
    routingKey: '',
    headers: '',
    payload: '',
    contentType: 'application/json',
    deliveryMode: 2
  })
  showPublishDialog.value = true
}

const handlePublish = async () => {
  publishing.value = true
  try {
    const properties = {
      delivery_mode: publishForm.deliveryMode,
      content_type: publishForm.contentType
    }
    if (publishForm.exchangeType === 'headers' && publishForm.headers) {
      const headers = parseJsonArgs(publishForm.headers)
      if (headers === null) { publishing.value = false; return }
      properties.headers = headers
    }
    const { data } = await publishMessage(publishForm.vhost, publishForm.exchange, {
      routing_key: publishForm.routingKey,
      payload: publishForm.payload,
      payload_encoding: 'string',
      properties
    })
    if (data.routed) {
      ElMessage.success('消息已发布并路由成功')
    } else {
      ElMessage.warning('消息已发布，但未路由到任何队列')
    }
    showPublishDialog.value = false
  } catch (err) {
    ElMessage.error('发布失败: ' + (err.response?.data?.reason || err.message))
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  await fetchVhosts()
  await fetchExchanges()
})
</script>
<style scoped>
.exchanges-page {
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

.binding-form {
  margin-top: 12px;
}

:deep(.built-in-row) {
  background-color: var(--bg-elevated) !important;
}
</style>
