<template>
  <div class="messages-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header><strong>发布消息</strong></template>
          <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="110px">
            <el-form-item label="Virtual Host" prop="vhost">
              <el-select v-model="publishForm.vhost" style="width: 100%" @change="onPublishVhostChange">
                <el-option v-for="v in vhostList" :key="v.name" :label="v.name" :value="v.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="交换机" prop="exchange">
              <el-select v-model="publishForm.exchange" style="width: 100%" :loading="exchangesLoading" filterable>
                <el-option v-for="e in exchanges" :key="e.name" :label="e.name || '(default)'" :value="e.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="Routing Key" prop="routingKey">
              <el-input v-model="publishForm.routingKey" />
            </el-form-item>
            <el-form-item label="Content Type">
              <el-select v-model="publishForm.contentType" style="width: 100%">
                <el-option label="application/json" value="application/json" />
                <el-option label="text/plain" value="text/plain" />
              </el-select>
            </el-form-item>
            <el-form-item label="Delivery Mode">
              <el-radio-group v-model="publishForm.deliveryMode">
                <el-radio :value="1">非持久</el-radio>
                <el-radio :value="2">持久</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="Headers">
              <el-input v-model="publishForm.headers" type="textarea" :rows="2" placeholder='JSON 格式，如 {"key": "value"}' />
            </el-form-item>
            <el-form-item label="消息体" prop="payload">
              <el-input v-model="publishForm.payload" type="textarea" :rows="6" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" style="width: 100%" :loading="publishing" @click="handlePublish">
                发布消息
              </el-button>
            </el-form-item>
          </el-form>
          <el-alert v-if="publishResult" :type="publishResult.type" :title="publishResult.message" show-icon :closable="true" @close="publishResult = null" />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header><strong>获取消息</strong></template>
          <el-form :model="getForm" label-width="110px">
            <el-form-item label="Virtual Host">
              <el-select v-model="getForm.vhost" style="width: 100%" @change="onGetVhostChange">
                <el-option v-for="v in vhostList" :key="v.name" :label="v.name" :value="v.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="队列">
              <el-select v-model="getForm.queue" style="width: 100%" :loading="queuesLoading" filterable>
                <el-option v-for="q in queues" :key="q.name" :label="q.name" :value="q.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="获取数量">
              <el-input-number v-model="getForm.count" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="确认模式">
              <el-radio-group v-model="getForm.ackmode">
                <el-radio value="ack_requeue_true">查看后重新入队</el-radio>
                <el-radio value="ack_requeue_false">消费并确认</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" style="width: 100%" :loading="fetching" @click="handleGetMessages" :disabled="!getForm.queue">
                获取消息
              </el-button>
            </el-form-item>
          </el-form>

          <template v-if="fetchedMessages.length">
            <el-divider />
            <div style="margin-bottom: 8px; color: #909399">共获取 {{ fetchedMessages.length }} 条消息</div>
            <div v-for="(msg, idx) in fetchedMessages" :key="idx" style="margin-bottom: 12px">
              <el-card shadow="never">
                <template #header>
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <el-badge :value="idx + 1" type="primary" />
                    <el-button size="small" @click="copyPayload(msg)">复制</el-button>
                  </div>
                </template>
                <pre class="message-body">{{ formatPayload(msg.payload) }}</pre>
                <el-collapse>
                  <el-collapse-item title="属性">
                    <p><strong>routing_key:</strong> {{ msg.routing_key }}</p>
                    <p><strong>exchange:</strong> {{ msg.exchange || '(default)' }}</p>
                    <p><strong>redelivered:</strong> {{ msg.redelivered }}</p>
                    <template v-if="msg.properties">
                      <p v-for="(val, key) in msg.properties" :key="key">
                        <strong>{{ key }}:</strong> {{ val }}
                      </p>
                    </template>
                  </el-collapse-item>
                </el-collapse>
              </el-card>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getVhosts, getExchanges, getQueues, publishMessage } from '@/api/rabbitmq'
import axios from 'axios'

const encode = (v) => encodeURIComponent(v)

const vhostList = ref([])
const exchanges = ref([])
const exchangesLoading = ref(false)
const queues = ref([])
const queuesLoading = ref(false)

const publishForm = ref({
  vhost: '/',
  exchange: '',
  routingKey: '',
  contentType: 'application/json',
  deliveryMode: 2,
  headers: '',
  payload: ''
})
const publishing = ref(false)
const publishResult = ref(null)
const publishFormRef = ref(null)

const publishRules = {
  vhost: [{ required: true, message: '请选择 Virtual Host', trigger: 'change' }],
  exchange: [{ required: true, message: '请选择交换机', trigger: 'change' }],
  payload: [{ required: true, message: '请输入消息体', trigger: 'blur' }]
}

const getForm = ref({
  vhost: '/',
  queue: '',
  count: 10,
  ackmode: 'ack_requeue_true'
})
const fetching = ref(false)
const fetchedMessages = ref([])

const loadVhosts = async () => {
  try {
    const { data } = await getVhosts()
    vhostList.value = data
  } catch (e) {
    ElMessage.error('加载 VHost 失败: ' + (e.response?.data?.reason || e.message))
  }
}

const loadExchanges = async (vhost) => {
  exchangesLoading.value = true
  try {
    const { data } = await getExchanges(vhost)
    exchanges.value = data
  } catch (e) {
    ElMessage.error('加载交换机失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    exchangesLoading.value = false
  }
}

const loadQueues = async (vhost) => {
  queuesLoading.value = true
  try {
    const { data } = await getQueues(vhost)
    queues.value = data
  } catch (e) {
    ElMessage.error('加载队列失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    queuesLoading.value = false
  }
}

const onPublishVhostChange = (vhost) => {
  publishForm.value.exchange = ''
  loadExchanges(vhost)
}

const onGetVhostChange = (vhost) => {
  getForm.value.queue = ''
  loadQueues(vhost)
}

const handlePublish = async () => {
  const valid = await publishFormRef.value.validate().catch(() => false)
  if (!valid) return
  publishing.value = true
  publishResult.value = null
  try {
    let headers = {}
    if (publishForm.value.headers.trim()) {
      headers = JSON.parse(publishForm.value.headers)
    }
    const { data } = await publishMessage(publishForm.value.vhost, publishForm.value.exchange, {
      routing_key: publishForm.value.routingKey,
      payload: publishForm.value.payload,
      payload_encoding: 'string',
      properties: {
        content_type: publishForm.value.contentType,
        delivery_mode: publishForm.value.deliveryMode,
        headers
      }
    })
    const routed = data.routed ? '1' : '0'
    publishResult.value = { type: 'success', message: `消息已发布，路由到 ${routed} 个队列` }
  } catch (e) {
    publishResult.value = { type: 'error', message: '发布失败: ' + (e.response?.data?.reason || e.message) }
  } finally {
    publishing.value = false
  }
}

const handleGetMessages = async () => {
  fetching.value = true
  fetchedMessages.value = []
  try {
    const { vhost, queue, count, ackmode } = getForm.value
    const { data } = await axios.post(
      `/rabbitmq-api/queues/${encode(vhost)}/${encode(queue)}/get`,
      { count, ackmode, encoding: 'auto', truncate: 50000 }
    )
    fetchedMessages.value = data || []
    if (!data.length) {
      ElMessage.info('队列中没有消息')
    }
  } catch (e) {
    ElMessage.error('获取消息失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    fetching.value = false
  }
}

const formatPayload = (payload) => {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

const copyPayload = async (msg) => {
  try {
    await navigator.clipboard.writeText(msg.payload)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

onMounted(() => {
  loadVhosts()
  loadExchanges('/')
  loadQueues('/')
})
</script>

<style scoped>
.messages-page {
  padding: 0;
}
.message-body {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  max-height: 300px;
  overflow: auto;
}
</style>
