<template>
  <div class="users-page">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="用户管理" name="users">
        <div style="margin-bottom: 16px">
          <el-button type="primary" @click="showCreateUser = true">创建用户</el-button>
          <el-button :icon="Refresh" @click="loadUsers" :loading="usersLoading">刷新</el-button>
        </div>

        <el-table :data="users" v-loading="usersLoading" stripe border>
          <el-table-column label="用户名" min-width="140">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="200">
            <template #default="{ row }">
              <template v-if="row.tags && parseTags(row.tags).length">
                <el-tag
                  v-for="tag in parseTags(row.tags)"
                  :key="tag"
                  :type="tagType(tag)"
                  size="small"
                  style="margin-right: 4px"
                >{{ tag }}</el-tag>
              </template>
              <el-tag v-else type="info" size="small">无角色</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="密码哈希" min-width="160">
            <template #default="{ row }">
              <span v-if="row.password_hash">{{ row.password_hash.slice(0, 8) }}...</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button :icon="EditPen" size="small" @click="openChangePassword(row)" title="修改密码" />
              <el-button :icon="Setting" size="small" @click="openPermissions(row)" title="设置权限" />
              <el-button
                :icon="Delete"
                size="small"
                type="danger"
                :disabled="row.name === 'guest'"
                @click="handleDeleteUser(row)"
                title="删除"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="Virtual Hosts" name="vhosts">
        <div style="margin-bottom: 16px">
          <el-button type="primary" @click="showCreateVhost = true">创建 VHost</el-button>
          <el-button :icon="Refresh" @click="loadVhosts" :loading="vhostsLoading">刷新</el-button>
        </div>

        <el-table :data="vhosts" v-loading="vhostsLoading" stripe border>
          <el-table-column label="名称" min-width="120">
            <template #default="{ row }">
              <strong v-if="row.name === '/'">{{ row.name }}</strong>
              <span v-else>{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="140" />
          <el-table-column prop="messages" label="消息数" width="100" />
          <el-table-column prop="messages_ready" label="就绪" width="80" />
          <el-table-column prop="messages_unacknowledged" label="未确认" width="80" />
          <el-table-column label="收发流量" width="160">
            <template #default="{ row }">
              <span>收: {{ formatBytes(row.recv_oct) }}</span><br />
              <span>发: {{ formatBytes(row.send_oct) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <template v-if="row.cluster_state">
                <el-tag
                  v-for="(state, node) in row.cluster_state"
                  :key="node"
                  :type="state === 'running' ? 'success' : 'danger'"
                  size="small"
                >{{ state }}</el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button
                :icon="Delete"
                size="small"
                type="danger"
                :disabled="row.name === '/'"
                @click="handleDeleteVhost(row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建用户对话框 -->
    <el-dialog v-model="showCreateUser" title="创建用户" width="480px" destroy-on-close>
      <el-form ref="createUserFormRef" :model="createUserForm" :rules="createUserRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createUserForm.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createUserForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="createUserForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="tags">
          <el-checkbox-group v-model="createUserForm.tags">
            <el-checkbox value="administrator">administrator</el-checkbox>
            <el-checkbox value="monitoring">monitoring</el-checkbox>
            <el-checkbox value="management">management</el-checkbox>
            <el-checkbox value="policymaker">policymaker</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateUser = false">取消</el-button>
        <el-button type="primary" :loading="createUserLoading" @click="handleCreateUser">创建</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="showChangePassword" title="修改密码" width="420px" destroy-on-close>
      <el-form ref="changePasswordFormRef" :model="changePasswordForm" :rules="changePasswordRules" label-width="100px">
        <el-form-item label="用户">
          <el-input :model-value="selectedUser?.name" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="changePasswordForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="changePasswordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePassword = false">取消</el-button>
        <el-button type="primary" :loading="changePasswordLoading" @click="handleChangePassword">确认</el-button>
      </template>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog v-model="showPermissions" title="设置权限" width="500px" destroy-on-close>
      <el-form ref="permissionsFormRef" :model="permissionsForm" :rules="permissionsRules" label-width="120px">
        <el-form-item label="用户">
          <el-input :model-value="selectedUser?.name" disabled />
        </el-form-item>
        <el-form-item label="Virtual Host" prop="vhost">
          <el-select v-model="permissionsForm.vhost" style="width: 100%">
            <el-option v-for="v in vhostOptions" :key="v.name" :label="v.name" :value="v.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Configure" prop="configure">
          <el-input v-model="permissionsForm.configure" placeholder=".*" />
        </el-form-item>
        <el-form-item label="Write" prop="write">
          <el-input v-model="permissionsForm.write" placeholder=".*" />
        </el-form-item>
        <el-form-item label="Read" prop="read">
          <el-input v-model="permissionsForm.read" placeholder=".*" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPermissions = false">取消</el-button>
        <el-button type="primary" :loading="permissionsLoading" @click="handleSetPermissions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 创建 VHost 对话框 -->
    <el-dialog v-model="showCreateVhost" title="创建 Virtual Host" width="420px" destroy-on-close>
      <el-form ref="createVhostFormRef" :model="createVhostForm" :rules="createVhostRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createVhostForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createVhostForm.description" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="createVhostForm.tags" placeholder="逗号分隔" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateVhost = false">取消</el-button>
        <el-button type="primary" :loading="createVhostLoading" @click="handleCreateVhost">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, EditPen, Setting } from '@element-plus/icons-vue'
import { getUsers, createUser, deleteUser, getVhosts, createVhost, deleteVhost } from '@/api/rabbitmq'
import axios from 'axios'

const activeTab = ref('users')

const users = ref([])
const usersLoading = ref(false)
const vhosts = ref([])
const vhostsLoading = ref(false)
const vhostOptions = ref([])

const showCreateUser = ref(false)
const createUserLoading = ref(false)
const createUserFormRef = ref(null)
const createUserForm = ref({ username: '', password: '', confirmPassword: '', tags: [] })

const showChangePassword = ref(false)
const changePasswordLoading = ref(false)
const changePasswordFormRef = ref(null)
const changePasswordForm = ref({ password: '', confirmPassword: '' })

const showPermissions = ref(false)
const permissionsLoading = ref(false)
const permissionsFormRef = ref(null)
const permissionsForm = ref({ vhost: '/', configure: '.*', write: '.*', read: '.*' })

const showCreateVhost = ref(false)
const createVhostLoading = ref(false)
const createVhostFormRef = ref(null)
const createVhostForm = ref({ name: '', description: '', tags: '' })

const selectedUser = ref(null)

const encode = (v) => encodeURIComponent(v)

const parseTags = (tags) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  return tags.split(',').map((t) => t.trim()).filter(Boolean)
}

const tagType = (tag) => {
  const map = { administrator: 'danger', monitoring: 'warning', management: '', policymaker: 'success' }
  return map[tag] ?? 'info'
}

const formatBytes = (bytes) => {
  if (bytes == null) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

const validateConfirmPassword = (form) => (rule, value, callback) => {
  if (value !== form.value.password) {
    callback(new Error('两次密码不一致'))
  } else {
    callback()
  }
}

const createUserRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword(createUserForm), trigger: 'blur' }
  ]
}

const changePasswordRules = {
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword(changePasswordForm), trigger: 'blur' }
  ]
}

const permissionsRules = {
  vhost: [{ required: true, message: '请选择 Virtual Host', trigger: 'change' }]
}

const createVhostRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

const loadUsers = async () => {
  usersLoading.value = true
  try {
    const { data } = await getUsers()
    users.value = data
  } catch (e) {
    ElMessage.error('加载用户失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    usersLoading.value = false
  }
}

const loadVhosts = async () => {
  vhostsLoading.value = true
  try {
    const { data } = await getVhosts()
    vhosts.value = data
    vhostOptions.value = data
  } catch (e) {
    ElMessage.error('加载 VHost 失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    vhostsLoading.value = false
  }
}

const handleCreateUser = async () => {
  const valid = await createUserFormRef.value.validate().catch(() => false)
  if (!valid) return
  createUserLoading.value = true
  try {
    await createUser(createUserForm.value.username, {
      password: createUserForm.value.password,
      tags: createUserForm.value.tags.join(',')
    })
    ElMessage.success('用户创建成功')
    showCreateUser.value = false
    createUserForm.value = { username: '', password: '', confirmPassword: '', tags: [] }
    await loadUsers()
  } catch (e) {
    ElMessage.error('创建用户失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    createUserLoading.value = false
  }
}

const openChangePassword = (row) => {
  selectedUser.value = row
  changePasswordForm.value = { password: '', confirmPassword: '' }
  showChangePassword.value = true
}

const handleChangePassword = async () => {
  const valid = await changePasswordFormRef.value.validate().catch(() => false)
  if (!valid) return
  changePasswordLoading.value = true
  try {
    await createUser(selectedUser.value.name, {
      password: changePasswordForm.value.password,
      tags: selectedUser.value.tags || ''
    })
    ElMessage.success('密码修改成功')
    showChangePassword.value = false
  } catch (e) {
    ElMessage.error('修改密码失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    changePasswordLoading.value = false
  }
}

const openPermissions = (row) => {
  selectedUser.value = row
  permissionsForm.value = { vhost: '/', configure: '.*', write: '.*', read: '.*' }
  showPermissions.value = true
  if (!vhostOptions.value.length) loadVhosts()
}

const handleSetPermissions = async () => {
  const valid = await permissionsFormRef.value.validate().catch(() => false)
  if (!valid) return
  permissionsLoading.value = true
  try {
    const { vhost, configure, write, read } = permissionsForm.value
    await axios.put(
      `/rabbitmq-api/permissions/${encode(vhost)}/${encode(selectedUser.value.name)}`,
      { configure, write, read }
    )
    ElMessage.success('权限设置成功')
    showPermissions.value = false
  } catch (e) {
    ElMessage.error('设置权限失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    permissionsLoading.value = false
  }
}

const handleDeleteUser = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除用户 "${row.name}" 吗？`, '确认删除', { type: 'warning' })
  } catch { return }
  try {
    await deleteUser(row.name)
    ElMessage.success('用户已删除')
    await loadUsers()
  } catch (e) {
    ElMessage.error('删除用户失败: ' + (e.response?.data?.reason || e.message))
  }
}

const handleCreateVhost = async () => {
  const valid = await createVhostFormRef.value.validate().catch(() => false)
  if (!valid) return
  createVhostLoading.value = true
  try {
    await createVhost(createVhostForm.value.name)
    ElMessage.success('VHost 创建成功')
    showCreateVhost.value = false
    createVhostForm.value = { name: '', description: '', tags: '' }
    await loadVhosts()
  } catch (e) {
    ElMessage.error('创建 VHost 失败: ' + (e.response?.data?.reason || e.message))
  } finally {
    createVhostLoading.value = false
  }
}

const handleDeleteVhost = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 VHost "${row.name}" 吗？此操作不可恢复。`, '确认删除', { type: 'warning' })
  } catch { return }
  try {
    await deleteVhost(row.name)
    ElMessage.success('VHost 已删除')
    await loadVhosts()
  } catch (e) {
    ElMessage.error('删除 VHost 失败: ' + (e.response?.data?.reason || e.message))
  }
}

onMounted(() => {
  loadUsers()
  loadVhosts()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}
</style>
