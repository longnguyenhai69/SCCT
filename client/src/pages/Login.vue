<template>
  <div id="login-screen">
    <div class="login-box">
      <div class="login-logo">SC</div>
      <div class="login-title">SCCT Quản lý thiết bị</div>
      <div class="login-sub">Hệ thống quản lý thiết bị cơ điện</div>

      <form @submit.prevent="handleSubmit" style="margin-top:24px">
        <div v-if="error" class="alert-info" style="margin-bottom:14px">⚠ {{ error }}</div>
        <div style="margin-bottom:12px">
          <label class="form-label">Email</label>
          <input class="form-ctrl" type="email" autofocus placeholder="example@scct.vn" v-model="email" required />
        </div>
        <div style="margin-bottom:20px">
          <label class="form-label">Mật khẩu</label>
          <input class="form-ctrl" type="password" placeholder="••••••••" v-model="password" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; padding:12px; font-size:14px" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
        <div style="text-align:center; margin-top:14px; font-size:12px; color:#94a3b8">
          Mật khẩu mặc định: <b>scct@2026</b>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { isTechRole, isManagerRole } from '../utils'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const auth = useAuth()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const user = await auth.login(email.value, password.value)
    if (isTechRole(user.role)) router.push('/app/my-devices')
    else if (isManagerRole(user.role)) router.push('/app/overview')
    else if (user.role === 'director') router.push('/app/dashboard')
    else router.push('/app/accounts')
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Đăng nhập thất bại'
  } finally {
    loading.value = false
  }
}
</script>
