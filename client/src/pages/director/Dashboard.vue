<template>
  <div>
    <div class="page-title">Bảng điều hành</div>
    <div class="page-sub">{{ fmtDate(now) }} · Tổng quan toàn bộ hệ thống</div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <template v-else>
      <div class="grid-4" style="margin-bottom:32px">
        <StatCard :val="sites.length" label="Công trường" sub="đang hoạt động" color="#2563eb" />
        <StatCard :val="devices.length" label="Thiết bị" sub="đang quản lý" color="#0891b2" />
        <StatCard :val="pct + '%'" label="Hoạt động ổn" :sub="`${okCount}/${devices.length} thiết bị`" color="#16a34a" />
        <StatCard :val="open.length" label="Sự cố mở" sub="cần xử lý" color="#ef4444" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:860px">
        <div>
          <div class="sec-title" style="margin-bottom:12px">Tình trạng công trường</div>
          <div v-for="s in siteStats" :key="s.id" class="card card-p" style="margin-bottom:10px">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px">
              <div style="font-weight:600; font-size:13px; color:#1e293b">{{ s.name }}</div>
              <span :style="{ fontWeight: 700, color: s.color, fontSize: '13px' }">{{ s.pct }}%</span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:6px">{{ s.loc }} · {{ s.count }} thiết bị</div>
            <div class="prog-wrap"><div class="prog-bar" :style="{ width: `${s.pct}%`, background: s.color }" /></div>
          </div>
        </div>

        <div>
          <div class="sec-title" style="margin-bottom:12px">Sự cố gần đây</div>
          <div v-for="t in tickets.slice(0, 8)" :key="t.id" class="card card-p" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
            <div>
              <div style="font-size:13px; font-weight:600; color:#1e293b">{{ t.device_name || t.other_label || 'Khác' }}</div>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px">{{ t.site_name || '' }} · {{ fmtDate(t.created_at) }}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px">{{ (t.description || '').slice(0, 60) }}{{ (t.description || '').length > 60 ? '...' : '' }}</div>
            </div>
            <span class="badge" :class="t.status === 'resolved' ? 'b-normal' : t.status === 'in_progress' ? 'b-maintain' : 'b-broken'" style="flex-shrink:0; margin-left:8px">
              {{ t.status === 'resolved' ? 'Xong' : t.status === 'in_progress' ? 'Đang làm' : 'Chờ' }}
            </span>
          </div>
          <div style="display:flex; gap:16px; margin-top:14px">
            <div style="text-align:center; flex:1; background:#f0fdf4; border-radius:10px; padding:10px 0">
              <div style="font-size:22px; font-weight:700; color:#16a34a">{{ resolved.length }}</div>
              <div style="font-size:11px; color:#64748b">Đã giải quyết</div>
            </div>
            <div style="text-align:center; flex:1; background:#fff7ed; border-radius:10px; padding:10px 0">
              <div style="font-size:22px; font-weight:700; color:#f59e0b">{{ overdue.length }}</div>
              <div style="font-size:11px; color:#64748b">Quá hạn</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatCard from '../../components/StatCard.vue'
import { fmtDate } from '../../utils'
import api from '../../api'
import type { Device, Ticket, Site } from '../../types'

const devices = ref<Device[]>([])
const tickets = ref<Ticket[]>([])
const sites = ref<Site[]>([])
const loading = ref(true)
const now = new Date().toISOString()

onMounted(async () => {
  try {
    const [d, t, s] = await Promise.all([api.get('/devices'), api.get('/tickets'), api.get('/sites')])
    devices.value = d.data; tickets.value = t.data; sites.value = s.data
  } finally { loading.value = false }
})

const open = computed(() => tickets.value.filter(t => t.status !== 'resolved'))
const resolved = computed(() => tickets.value.filter(t => t.status === 'resolved'))
const overdue = computed(() => tickets.value.filter(t => t.status === 'in_progress' && t.due_date && new Date(t.due_date) < new Date()))
const okCount = computed(() => devices.value.filter(d => !d.has_open_ticket).length)
const pct = computed(() => devices.value.length ? Math.round(okCount.value / devices.value.length * 100) : 0)

const siteStats = computed(() => sites.value.map(s => {
  const sd = devices.value.filter(d => d.site_id === s.id)
  const ok = sd.filter(d => !d.has_open_ticket).length
  const p = sd.length ? Math.round(ok / sd.length * 100) : 100
  return { id: s.id, name: s.name, loc: s.loc, count: sd.length, pct: p, color: p >= 80 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#ef4444' }
}))
</script>
