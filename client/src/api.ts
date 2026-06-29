import axios from 'axios'

// Same-origin: backend phục vụ luôn frontend → gọi thẳng /api
const api = axios.create({ baseURL: '/api' })

const token = localStorage.getItem('scct_token')
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('scct_token')
      localStorage.removeItem('scct_user')
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
