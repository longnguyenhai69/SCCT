<template>
  <div>
    <div class="page-title">Báo cáo tháng</div>
    <div class="page-sub">{{ monthLabel(ym) }} · {{ user?.name }}</div>

    <div class="grid-4" style="max-width:640px; margin-bottom:22px">
      <StatCard :val="stats.assigned" label="Được giao" sub="phiếu sự cố" color="#2563eb" />
      <StatCard :val="stats.resolved" label="Đã giải quyết" sub="trong tháng" color="#16a34a" />
      <StatCard :val="stats.open" label="Đang mở" sub="chưa xử lý" color="#f59e0b" />
      <StatCard :val="`${stats.pct}%`" label="Hoàn thành" sub="tỉ lệ" color="#8b5cf6" />
    </div>

    <div v-if="loading" class="empty">Đang tải...</div>

    <!-- Form / View báo cáo tháng hiện tại -->
    <div v-else-if="!myRep || editing" class="card card-p4" style="max-width:640px; margin-bottom:20px">
      <div class="sec-title" style="margin-bottom:14px">Báo cáo {{ monthLabel(ym) }}</div>
      <form @submit.prevent="handleSubmit">
        <div style="margin-bottom:10px">
          <label class="form-label">Tóm tắt công việc trong tháng *</label>
          <textarea class="form-ctrl" rows="4" placeholder="Mô tả các công việc đã thực hiện..." v-model="form.summary" />
        </div>
        <div style="margin-bottom:14px">
          <label class="form-label">Tự đánh giá kết quả</label>
          <textarea class="form-ctrl" rows="2" placeholder="Đánh giá mức độ hoàn thành..." v-model="form.self_rate" />
        </div>
        <div style="display:flex; gap:8px">
          <button type="submit" class="btn btn-primary">Gửi báo cáo</button>
          <button v-if="editing" type="button" class="btn btn-outline" @click="editing = false">Hủy</button>
        </div>
      </form>
    </div>

    <div v-else class="card card-p4" style="max-width:640px; margin-bottom:20px; border-left:4px solid #16a34a">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
        <div class="sec-title" style="color:#16a34a">✓ Đã gửi báo cáo {{ monthLabel(ym) }}</div>
        <span style="font-size:11px; color:#94a3b8">{{ fmtDate(myRep.submitted_at) }}</span>
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Tóm tắt công việc</label>
        <div class="note-box">{{ myRep.summary || '(Không có)' }}</div>
      </div>
      <div v-if="myRep.self_rate" style="margin-bottom:10px">
        <label class="form-label">Tự đánh giá</label>
        <div class="note-box">{{ myRep.self_rate }}</div>
      </div>
      <div v-if="myRep.mgr_comment" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-top:8px">
        <div style="font-size:11px; font-weight:700; color:#1d4ed8; margin-bottom:4px">Nhận xét trưởng phòng</div>
        <div style="font-size:13px; color:#1e40af">{{ myRep.mgr_comment }}</div>
      </div>
      <button class="btn btn-outline" style="margin-top:12px; font-size:12px" @click="startEdit">Chỉnh sửa lại</button>
    </div>

    <!-- Lịch sử tháng trước -->
    <template v-if="history.length > 0">
      <div class="sec-title" style="margin-bottom:10px">Báo cáo các tháng trước</div>
      <details v-for="r in history" :key="r.id" class="card card-p" style="max-width:640px; margin-bottom:8px">
        <summary style="cursor:pointer; font-weight:600; color:#1e293b; display:flex; justify-content:space-between; align-items:center; user-select:none">
          <span>{{ monthLabel(r.month) }}</span>
          <span style="font-size:12px; color:#64748b; font-weight:400">Giao: {{ monthStats(r.month).assigned }} · Giải quyết: {{ monthStats(r.month).resolved }} · {{ monthStats(r.month).pct }}%</span>
        </summary>
        <div style="margin-top:10px; border-top:1px solid #f1f5f9; padding-top:10px">
          <div class="note-box" style="margin-bottom:8px">{{ r.summary }}</div>
          <div v-if="r.self_rate" class="note-box" style="margin-bottom:8px">{{ r.self_rate }}</div>
          <div v-if="r.mgr_comment" style="background:#eff6ff; border-radius:8px; padding:8px 12px; font-size:13px; color:#1e40af">{{ r.mgr_comment }}</div>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import StatCard from '../../components/StatCard.vue'
import { useAuth } from '../../stores/auth'
import { currentMonth, monthLabel, fmtDate } from '../../utils'
import api from '../../api'
import type { Report, Ticket } from '../../types'

const auth = useAuth()
const user = computed(() => auth.user)
const ym = currentMonth()

const reports = ref<Report[]>([])
const tickets = ref<Ticket[]>([])
const editing = ref(false)
const loading = ref(true)
const form = ref({ summary: '', self_rate: '' })

onMounted(async () => {
  try {
    const [r, t] = await Promise.all([api.get('/reports'), api.get('/tickets/mine')])
    reports.value = r.data; tickets.value = t.data
  } finally { loading.value = false }
})

const myRep = computed(() => reports.value.find(r => r.user_id === user.value?.id && r.month === ym))
const history = computed(() => reports.value.filter(r => r.user_id === user.value?.id && r.month !== ym).sort((a, b) => b.month.localeCompare(a.month)))

function monthStats(month: string) {
  const assigned = tickets.value.filter(t => t.approved_date?.slice(0, 7) === month || t.created_at?.slice(0, 7) === month).length
  const resolved = tickets.value.filter(t => t.status === 'resolved' && t.resolved_date?.slice(0, 7) === month).length
  const open = tickets.value.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  const pct = assigned > 0 ? Math.round(resolved / assigned * 100) : 0
  return { assigned, resolved, open, pct }
}
const stats = computed(() => monthStats(ym))

function startEdit() {
  form.value = { summary: myRep.value?.summary || '', self_rate: myRep.value?.self_rate || '' }
  editing.value = true
}

async function handleSubmit() {
  if (!form.value.summary.trim()) return ElMessage.info('Vui lòng nhập tóm tắt công việc')
  try {
    await api.post('/reports', { month: ym, ...form.value })
    ElMessage.success('Đã gửi báo cáo tháng!')
    editing.value = false
    reports.value = (await api.get('/reports')).data
  } catch (e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }
}
</script>
