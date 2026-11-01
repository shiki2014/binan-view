import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api' // 设置你的后端 API 的基本 URL
  // 这里可以设置其他的 Axios 配置，例如 headers、timeout 等
})

function encodeHeaderText (value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return encodeURIComponent(text)
}

apiClient.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = String(window.localStorage.getItem('api_token') || '').trim()
    const operator = window.localStorage.getItem('operator_name')
    const riskToken = window.localStorage.getItem('risk_token')
    if (!token) {
      const error = new Error('TOKEN_REQUIRED')
      error.code = 'TOKEN_REQUIRED'
      return Promise.reject(error)
    }
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
    if (operator) {
      config.headers['X-Operator'] = encodeHeaderText(operator)
    }
    if (riskToken) {
      config.headers['X-Risk-Token'] = riskToken
    }
  }
  return config
})

function buildConfig (reason = '', extraHeaders = {}) {
  const headers = {}
  if (reason) {
    headers['X-Operation-Reason'] = encodeHeaderText(reason)
  }
  Object.keys(extraHeaders || {}).forEach(key => {
    if (extraHeaders[key] !== undefined && extraHeaders[key] !== null && extraHeaders[key] !== '') {
      if (key === 'X-Operator' || key === 'x-operator' || key === 'X-Actor' || key === 'x-actor') {
        headers[key] = encodeHeaderText(extraHeaders[key])
      } else {
        headers[key] = extraHeaders[key]
      }
    }
  })
  return Object.keys(headers).length ? { headers } : undefined
}

export function getUsers () {
  return apiClient.get('/users')
}

export function getData () {
  return apiClient.get('/users')
}

export function getPositions () {
  return apiClient.get('/positions')
}

export function getOpenOrders () {
  return apiClient.get('/orders/open')
}

export function getSymbolKlines (symbol, interval = '1d', limit = 240, options = {}) {
  const params = { interval, limit }
  if (options && Number.isFinite(Number(options.startTime)) && Number(options.startTime) > 0) {
    params.startTime = Math.floor(Number(options.startTime))
  }
  if (options && Number.isFinite(Number(options.endTime)) && Number(options.endTime) > 0) {
    params.endTime = Math.floor(Number(options.endTime))
  }
  return apiClient.get(`/klines/${symbol}`, {
    params
  })
}

export function getErrorLog (options = {}) {
  const params = {}
  if (options && options.source) {
    params.source = options.source
  }
  if (options && Number.isFinite(Number(options.lineLimit)) && Number(options.lineLimit) > 0) {
    params.lineLimit = Math.floor(Number(options.lineLimit))
  }
  if (options && options.level) {
    params.level = options.level
  }
  if (options && options.keyword) {
    params.keyword = options.keyword
  }
  if (options && options.startDate) {
    params.startDate = options.startDate
  }
  if (options && options.endDate) {
    params.endDate = options.endDate
  }
  return apiClient.get('/errorLog', { params })
}

export function getAppLog (options = {}) {
  const params = {}
  if (options && options.source) {
    params.source = options.source
  }
  if (options && Number.isFinite(Number(options.lineLimit)) && Number(options.lineLimit) > 0) {
    params.lineLimit = Math.floor(Number(options.lineLimit))
  }
  if (options && options.level) {
    params.level = options.level
  }
  if (options && options.keyword) {
    params.keyword = options.keyword
  }
  if (options && options.startDate) {
    params.startDate = options.startDate
  }
  if (options && options.endDate) {
    params.endDate = options.endDate
  }
  return apiClient.get('/appLog', { params })
}

export function getSystemOverview () {
  return apiClient.get('/system/overview')
}

export function getSystemSettings () {
  return apiClient.get('/system/settings')
}

export function updateSystemSettings (payload, reason = '') {
  const config = buildConfig(reason)
  return apiClient.post('/system/settings', payload, config)
}

export function getTradingParams () {
  return apiClient.get('/system/trading-params')
}

export function updateTradingParams (payload, reason = '') {
  const config = buildConfig(reason)
  return apiClient.post('/system/trading-params', payload, config)
}

export function getSystemEvents (limit = 100) {
  return apiClient.get('/system/events', { params: { limit } })
}

export function getSystemSnapshots (limit = 50, options = {}) {
  const params = {}
  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    params.limit = Math.floor(Number(limit))
  }
  Object.keys(options || {}).forEach(key => {
    const value = options[key]
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value
    }
  })
  return apiClient.get('/system/snapshots', { params })
}

export function getSystemAudits (limit = 100) {
  return apiClient.get('/system/audits', { params: { limit } })
}

export function sendTestAlert (level = 'warn', reason = '') {
  const config = buildConfig(reason)
  return apiClient.post('/system/alerts/test', { level }, config)
}

export function runSystemReconciliation (reason = '') {
  const config = buildConfig(reason)
  return apiClient.post('/system/reconciliation/run', {}, config)
}

export function runSystemMaintenance (reason = '', extraHeaders = {}) {
  const config = buildConfig(reason, extraHeaders)
  return apiClient.post('/system/maintenance/run', {}, config)
}

export function createChangeRequest (payload, reason = '') {
  const config = buildConfig(reason)
  return apiClient.post('/system/change-requests', payload, config)
}

export function getChangeRequests (limit = 100, status = '') {
  const params = { limit }
  if (status) params.status = status
  return apiClient.get('/system/change-requests', { params })
}

export function approveChangeRequest (id, comment = '', extraHeaders = {}) {
  return apiClient.post(`/system/change-requests/${id}/approve`, { comment }, buildConfig('', extraHeaders))
}

export function rejectChangeRequest (id, comment = '', extraHeaders = {}) {
  return apiClient.post(`/system/change-requests/${id}/reject`, { comment }, buildConfig('', extraHeaders))
}

export function setApiToken (token) {
  if (typeof window === 'undefined') return
  if (!token) return
  window.localStorage.setItem('api_token', token)
}

export function clearApiToken () {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('api_token')
}

export function setOperatorName (name) {
  if (typeof window === 'undefined') return
  if (!name) return
  window.localStorage.setItem('operator_name', name)
}

export function clearOperatorName () {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('operator_name')
}

export function setRiskToken (token) {
  if (typeof window === 'undefined') return
  if (!token) return
  window.localStorage.setItem('risk_token', token)
}

export function clearRiskToken () {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('risk_token')
}
