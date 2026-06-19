import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export const api = axios.create({
  baseURL: BASE,
  timeout: 10000
})
