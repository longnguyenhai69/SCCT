<template>
  <div>
    <div class="page-title">Thiết bị của tôi</div>
    <div class="page-sub">Được phân công quản lý {{ devices.length }} thiết bị</div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <template v-else>
      <div v-if="devices.length === 0" class="empty">Chưa được phân công thiết bị nào</div>

      <div v-for="g in groups" :key="g.key" style="max-width:640px; margin-bottom:8px">
        <div @click="toggle(g.key)" class="grp-hdr"
             :style="{ borderRadius: isOpen(g.key) ? '12px 12px 0 0' : '12px' }">
          <div style="display:flex; align-items:center; gap:10px">
            <span style="font-size:14px; font-weight:700">{{ g.name }}</span>
            <span v-if="g.loc" style="font-size:12px; opacity:.65">{{ g.loc }}</span>
            <span v-if="g.type" style="font-size:11px; background:rgba(59,130,246,.35); padding:2px 8px; border-radius:20px; font-weight:600">{{ g.type }}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:12px; opacity:.7">{{ g.devices.length }} thiết bị</span>
            <span v-if="g.broken > 0" style="font-size:11px; background:#ef4444; padding:2px 8px; border-radius:20px; font-weight:700">{{ g.broken }} sự cố</span>
            <span style="font-size:16px; opacity:.8; display:inline-block; transition:transform .2s" :style="{ transform: isOpen(g.key) ? 'rotate(180deg)' : 'rotate(0)' }">▾</span>
          </div>
        </div>

        <div v-if="isOpen(g.key)" style="border:1.5px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px; overflow:hidden">
          <div v-for="(d, idx) in g.devices" :key="d.id" :style="{ padding: '14px 18px', background: '#fff', borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px">
              <div>
                <div style="font-size:14px; font-weight:700; color:#0f172a">{{ d.name }}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px">{{ d.type }}</div>
                <div v-if="d.reg_no" style="font-size:12px; color:#374151; margin-top:2px">Số đăng ký: <b>{{ d.reg_no }}</b></div>
              </div>
              <StatusBadge :device="d" />
            </div>
            <div v-if="d.description" style="background:#f8fafc; border-radius:8px; padding:7px 10px; font-size:12px; color:#475569; margin-bottom:8px; line-height:1.5">{{ d.description }}</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px" :style="{ marginBottom: d.inspect_expiry ? '6px' : '0' }">
              <span v-if="(d.open_ticket_count || 0) > 0" style="font-size:11px; padding:2px 8px; border-radius:20px; background:#fee2e2; color:#dc2626; font-weight:600">{{ d.open_ticket_count }} sự cố đang mở</span>
            </div>
            <InspectBadge v-if="d.inspect_expiry" :date="d.inspect_expiry" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBadge from '../../components/StatusBadge.vue'
import InspectBadge from '../../components/InspectBadge.vue'
import api from '../../api'
import type { Device } from '../../types'

const devices = ref<Device[]>([])
const loading = ref(true)
const collapsed = ref<Record<string, boolean>>({})

onMounted(async () => {
  try { devices.value = (await api.get('/devices/mine')).data } finally { loading.value = false }
})

const groups = computed(() => {
  const acc: Record<string, { key: string; name: string; loc: string; type: string | null; devices: Device[]; broken: number }> = {}
  for (const d of devices.value) {
    const key = String(d.site_id || '__none__')
    if (!acc[key]) acc[key] = { key, name: d.site_name || 'Chưa có công trường', loc: d.site_loc || '', type: d.site_type || null, devices: [], broken: 0 }
    acc[key].devices.push(d)
  }
  return Object.values(acc).map(g => ({ ...g, broken: g.devices.filter(d => (d.open_ticket_count || 0) > 0).length }))
})

const isOpen = (key: string) => !collapsed.value[key]
const toggle = (key: string) => { collapsed.value[key] = !collapsed.value[key] }
</script>

<style scoped>
.grp-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #1e3a5f; color: #fff; cursor: pointer;
  user-select: none; transition: border-radius .15s;
}
</style>
