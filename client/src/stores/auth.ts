import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'
import type { User } from '../types'

export const useAuth = defineStore('auth', () => {
  const saved = localStorage.getItem('scct_user')
  const user  = ref<User | null>(saved ? JSON.parse(saved) : null)
  const token = ref<string | null>(localStorage.getItem('scct_token'))

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('scct_token', data.token)
    localStorage.setItem('scct_user', JSON.stringify(data.user))
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    token.value = data.token
    user.value = data.user
    return data.user as User
  }

  function logout() {
    localStorage.removeItem('scct_token')
    localStorage.removeItem('scct_user')
    delete api.defaults.headers.common['Authorization']
    token.value = null
    user.value = null
  }

  return { user, token, login, logout }
})
