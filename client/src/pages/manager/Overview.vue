<template>
  <div>
    <div class="page-title">Tổng quan</div>
    <div class="page-sub">{{ fmtDate(now) }}</div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <template v-else>
      <div class="grid-4" style="margin-bottom:28px">
        <StatCard :val="pct + '%'" label="Hoạt động bình thường" :sub="`${okCount}/${devices.length} thiết bị`" color="#16a34a" />
        <StatCard :val="open.length" label="Sự cố đang mở" sub="chưa giải quyết" color="#ef4444" />
        <StatCard :val="overdue.length" label="Quá hạn" sub="cần chú ý ngay" color="#f59e0b" />
        <StatCard :val="resolved.length" label="Đã khắc phục" sub="tổng cộng" color="#2563eb" />
      </div>

      <div class="sec-title" style="margin-bottom:14px">Tình trạng theo công trường</div>
      <div v-for="s in siteStats" :key="s.id" class="card card-p" style="max-width:600px; margin-bottom:10px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <div>
            <div style="font-weight:700; color:#1e293b; font-size:14px">{{ s.name }}</div>
            <div style="font-size:12px; color:#64748b">{{ s.loc }} · {{ s.count }} thiết bị</div>
          </div>
          <span :style="{ fontSize: '18px', fontWeight: 700, color: s.color }">{{ s.pct }}%</span>
        </div>
        <div class="prog-wrap"><div class="prog-bar" :style="{ width: `${s.pct}%`, background: s.color }" /></div>
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
const overdue = computed(() => tickets.value.filter(t => t.status === 'in_progress' && t.due_date && new Date(t.due_date) < new Date()))
const resolved = computed(() => tickets.value.filter(t => t.status === 'resolved'))
const okCount = computed(() => devices.value.filter(d => !d.has_open_ticket).length)
const pct = computed(() => devices.value.length ? Math.round(okCount.value / devices.value.length * 100) : 0)

const siteStats = computed(() => sites.value.map(s => {
  const sd = devices.value.filter(d => d.site_id === s.id)
  const ok = sd.filter(d => !d.has_open_ticket).length
  const p = sd.length ? Math.round(ok / sd.length * 100) : 100
  return { id: s.id, name: s.name, loc: s.loc, count: sd.length, pct: p, color: p >= 80 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#ef4444' }
}))
</script>
