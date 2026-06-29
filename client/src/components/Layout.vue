<template>
  <div id="app-shell">
    <aside class="sidebar">
      <div class="sb-logo">
        <div class="sb-logo-icon">SC</div>
        <div>
          <div class="sb-logo-text">SCCT</div>
          <div class="sb-logo-sub">Quản lý cơ điện</div>
        </div>
      </div>

      <nav class="sb-nav">
        <RouterLink v-for="t in tabs" :key="t.to" :to="`/app/${t.to}`" active-class="active">
          <span class="nav-icon">{{ t.icon }}</span>
          {{ t.label }}
        </RouterLink>
      </nav>

      <div class="sb-footer">
        <div class="sb-avatar">{{ initials(user?.name) }}</div>
        <div style="flex:1; min-width:0">
          <div class="sb-user-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ user?.name }}</div>
          <div class="sb-user-role">{{ ROLE_LABEL[user?.role || ''] || user?.role }}</div>
        </div>
        <button class="sb-logout" title="Đăng xuất" @click="handleLogout">⎋</button>
      </div>
    </aside>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { ROLE_LABEL, isTechRole, isManagerRole, initials } from '../utils'

const auth = useAuth()
const router = useRouter()
const user = computed(() => auth.user)

const TABS: Record<string, { to: string; label: string; icon: string }[]> = {
  tech: [
    { to: 'my-devices', label: 'Thiết bị của tôi', icon: '🖥' },
    { to: 'issues',     label: 'Sự cố',            icon: '🔧' },
    { to: 'history',    label: 'Lịch sử',          icon: '📋' },
    { to: 'monthly',    label: 'Báo cáo tháng',    icon: '📊' },
  ],
  manager: [
    { to: 'overview',  label: 'Tổng quan',    icon: '📈' },
    { to: 'sites',     label: 'Công trường',  icon: '🏗' },
    { to: 'mdevices',  label: 'Thiết bị',     icon: '🖥' },
    { to: 'mtickets',  label: 'Sự cố',        icon: '🔧' },
    { to: 'mreports',  label: 'BC Nhân viên', icon: '📊' },
  ],
  director: [
    { to: 'dashboard', label: 'Dashboard', icon: '📈' },
    { to: 'dtickets',  label: 'Sự cố',     icon: '🔧' },
  ],
  admin: [
    { to: 'accounts', label: 'Quản lý tài khoản', icon: '👥' },
  ],
}

const tabs = computed(() => {
  const role = user.value?.role || ''
  const key = isTechRole(role) ? 'tech' : isManagerRole(role) ? 'manager' : role
  return TABS[key] || []
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
