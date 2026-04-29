<template>
  <div class="queue-detail-expand">
    <el-row :gutter="20">
      <el-col :span="12">
        <h4>绑定关系</h4>
        <el-table
          v-loading="bindingsLoading"
          :data="bindings || []"
          size="small"
          border
          empty-text="暂无绑定"
        >
          <el-table-column label="交换机" prop="source">
            <template #default="{ row }">
              {{ row.source || '(default)' }}
            </template>
          </el-table-column>
          <el-table-column label="路由键" prop="routing_key" />
          <el-table-column label="参数" prop="arguments">
            <template #default="{ row }">
              {{ Object.keys(row.arguments || {}).length ? JSON.stringify(row.arguments) : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-col>
      <el-col :span="12">
        <h4>详细统计</h4>
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="投递速率">
            {{ rate(queue.message_stats, 'deliver_details') }} msg/s
          </el-descriptions-item>
          <el-descriptions-item label="确认速率">
            {{ rate(queue.message_stats, 'ack_details') }} msg/s
          </el-descriptions-item>
          <el-descriptions-item label="发布速率">
            {{ rate(queue.message_stats, 'publish_details') }} msg/s
          </el-descriptions-item>
          <el-descriptions-item label="内存使用">
            {{ formatBytes(queue.memory || 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="消息占用">
            {{ formatBytes(queue.message_bytes || 0) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
defineProps({
  queue: { type: Object, required: true },
  bindings: { type: Array, default: () => [] },
  bindingsLoading: { type: Boolean, default: false }
})

function rate(stats, key) {
  if (!stats || !stats[key]) return '0.00'
  return (stats[key].rate || 0).toFixed(2)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}
</script>

<style scoped>
.queue-detail-expand {
  padding: 12px 20px;
}
.queue-detail-expand h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--el-text-color-regular, #606266);
}
</style>
