import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api' // 设置你的后端 API 的基本 URL
  // 这里可以设置其他的 Axios 配置，例如 headers、timeout 等
})

export function getUsers () {
  return apiClient.get('/users')
}

export function getData () {
  return apiClient.get('/users')
}

export function getPositions () {
  return apiClient.get('/positions')
}

export function getLog () {
  return apiClient.get('/log')
}
