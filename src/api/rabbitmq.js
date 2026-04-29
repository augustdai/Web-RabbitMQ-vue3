import axios from 'axios'
import router from '@/router'

const api = axios.create({ baseURL: '' })

// 动态注入 Basic Auth（凭证存在 sessionStorage）
api.interceptors.request.use(config => {
  const auth = sessionStorage.getItem('rmq_auth')
  if (auth) config.headers['Authorization'] = `Basic ${auth}`
  return config
})

// 401 时跳转登录页（用 router.push 避免页面重载死循环）
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && router.currentRoute.value.path !== '/login') {
      sessionStorage.removeItem('rmq_auth')
      sessionStorage.removeItem('rmq_user')
      sessionStorage.removeItem('rmq_pass')
      router.push('/login')
    }
    return Promise.reject(err)
  }
)

const encode = (value) => encodeURIComponent(value)

export const getOverview = () =>
  api.get('/rabbitmq-api/overview')

export const getNodes = () =>
  api.get('/rabbitmq-api/nodes')

export const getQueues = (vhost) =>
  vhost
    ? api.get(`/rabbitmq-api/queues/${encode(vhost)}`)
    : api.get('/rabbitmq-api/queues')

export const getQueue = (vhost, name) =>
  api.get(`/rabbitmq-api/queues/${encode(vhost)}/${encode(name)}`)

export const createQueue = (vhost, name, params) =>
  api.put(`/rabbitmq-api/queues/${encode(vhost)}/${encode(name)}`, params)

export const deleteQueue = (vhost, name) =>
  api.delete(`/rabbitmq-api/queues/${encode(vhost)}/${encode(name)}`)

export const purgeQueue = (vhost, name) =>
  api.delete(`/rabbitmq-api/queues/${encode(vhost)}/${encode(name)}/contents`)

export const getMessages = (vhost, name, count = 10) =>
  api.post(`/rabbitmq-api/queues/${encode(vhost)}/${encode(name)}/get`, {
    count,
    ackmode: 'ack_requeue_true',
    encoding: 'auto',
    truncate: 50000
  })

export const getExchanges = (vhost) =>
  vhost
    ? api.get(`/rabbitmq-api/exchanges/${encode(vhost)}`)
    : api.get('/rabbitmq-api/exchanges')

export const getExchange = (vhost, name) =>
  api.get(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(name)}`)

export const createExchange = (vhost, name, params) =>
  api.put(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(name)}`, params)

export const deleteExchange = (vhost, name) =>
  api.delete(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(name)}`)

export const publishMessage = (vhost, exchange, params) =>
  api.post(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(exchange)}/publish`, params)

export const getBindings = (vhost) =>
  vhost
    ? api.get(`/rabbitmq-api/bindings/${encode(vhost)}`)
    : api.get('/rabbitmq-api/bindings')

export const getQueueBindings = (vhost, queue) =>
  api.get(`/rabbitmq-api/queues/${encode(vhost)}/${encode(queue)}/bindings`)

export const createBinding = (vhost, exchange, queue, params) =>
  api.post(`/rabbitmq-api/bindings/${encode(vhost)}/e/${encode(exchange)}/q/${encode(queue)}`, params)

export const deleteBinding = (vhost, exchange, queue, propsKey) =>
  api.delete(`/rabbitmq-api/bindings/${encode(vhost)}/e/${encode(exchange)}/q/${encode(queue)}/${encode(propsKey)}`)

export const getExchangeBindingsSource = (vhost, exchange) =>
  api.get(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(exchange)}/bindings/source`)

export const getExchangeBindingsDestination = (vhost, exchange) =>
  api.get(`/rabbitmq-api/exchanges/${encode(vhost)}/${encode(exchange)}/bindings/destination`)

export const createE2EBinding = (vhost, source, destination, params) =>
  api.post(`/rabbitmq-api/bindings/${encode(vhost)}/e/${encode(source)}/e/${encode(destination)}`, params)

export const deleteE2EBinding = (vhost, source, destination, propsKey) =>
  api.delete(`/rabbitmq-api/bindings/${encode(vhost)}/e/${encode(source)}/e/${encode(destination)}/${encode(propsKey)}`)

export const getConnections = () =>
  api.get('/rabbitmq-api/connections')

export const closeConnection = (name) =>
  api.delete(`/rabbitmq-api/connections/${encode(name)}`)

export const getChannels = () =>
  api.get('/rabbitmq-api/channels')

export const getVhosts = () =>
  api.get('/rabbitmq-api/vhosts')

export const createVhost = (name) =>
  api.put(`/rabbitmq-api/vhosts/${encode(name)}`)

export const deleteVhost = (name) =>
  api.delete(`/rabbitmq-api/vhosts/${encode(name)}`)

export const getUsers = () =>
  api.get('/rabbitmq-api/users')

export const createUser = (name, params) =>
  api.put(`/rabbitmq-api/users/${encode(name)}`, params)

export const deleteUser = (name) =>
  api.delete(`/rabbitmq-api/users/${encode(name)}`)

export const getPolicies = (vhost) =>
  vhost
    ? api.get(`/rabbitmq-api/policies/${encode(vhost)}`)
    : api.get('/rabbitmq-api/policies')

export const getConsumers = () =>
  api.get('/rabbitmq-api/consumers')
