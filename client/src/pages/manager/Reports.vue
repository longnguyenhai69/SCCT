<template>
  <div>
    <div class="page-title">Báo cáo nhân viên</div>
    <div class="page-sub">Theo dõi tiến độ và báo cáo tháng</div>

    <div class="filter-bar" style="margin-bottom:22px">
      <label class="form-label" style="margin:0; font-size:13px">Chọn tháng:</label>
      <select class="form-ctrl" style="width:auto" v-model="selMonth">
        <option v-for="m in months" :key="m" :value="m">{{ monthLabel(m) }}</option>
      </select>
    </div>

    <div v-if="loading" class="empty">Đang tải...</div>

    <template v-else>
      <div v-for="row in stats" :key="row.user.id" class="card card-p4" style="max-width:700px; margin-bottom:14px">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
          <div>
            <div style="font-size:15px; font-weight:700; color:#0f172a">{{ row.user.name }}</div>
            <div style="font-size:12px; color:#64748b">{{ ROLE_LABEL[row.user.role] }}</div>
          </div>
          <span v-if="row.report" class="badge b-normal">Đã nộp {{ fmtDate(row.report.submitted_at) }}</span>
          <span v-else class="badge b-broken">Chưa nộp</span>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap">
          <div v-for="box in statBoxes(row)" :key="box.l" :style="{ textAlign: 'center', background: box.bg, borderRadius: '10px', padding: '8px 16px', minWidth: '70px' }">
            <div :style="{ fontSize: '20px', fontWeight: 700, color: box.c }">{{ box.v }}</div>
            <div style="font-size:11px; color:#64748b">{{ box.l }}</div>
          </div>
          <div style="flex:1; min-width:140px; display:flex; flex-direction:column; justify-content:center">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px">
              <span style="color:#374151">Hoàn thành</span>
              <span :style="{ fontWeight: 700, color: pctColor(row) }">{{ pctVal(row) }}%</span>
            </div>
            <div class="prog-wrap"><div class="prog-bar" :style="{ width: `${pctVal(row)}%`, background: pctColor(row) }" /></div>
          </div>
        </div>

        <template v-if="row.report">
          <div style="background:#f8fafc; border-radius:8px; padding:10px 12px; margin-bottom:10px">
            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px">Tóm tắt công việc</div>
            <div style="font-size:13px; color:#374151; line-height:1.6">{{ row.report.summary }}</div>
            <template v-if="row.report.self_rate">
              <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin:8px 0 4px">Tự đánh giá</div>
              <div style="font-size:13px; color:#374151">{{ row.report.self_rate }}</div>
            </template>
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end">
            <div style="flex:1">
              <label class="form-label">Nhận xét trưởng phòng</label>
              <textarea class="form-ctrl" rows="2" placeholder="Nhập nhận xét..." v-model="comments[row.user.id]" />
            </div>
            <button class="btn btn-primary btn-sm" style="white-space:nowrap" @click="saveComment(row.report.id, row.user.id)">Lưu</button>
          </div>
        </template>
        <div v-else style="font-size:13px; color:#94a3b8; font-style:italic">Nhân viên chưa nộp báo cáo tháng này.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { currentMonth, monthLabel, fmtDate, ROLE_LABEL } from '../../utils'
import api from '../../api'
import type { ReportStat } from '../../types'

const selMonth = ref(currentMonth())
const stats = ref<ReportStat[]>([])
const loading = ref(true)
const comments = ref<Record<number, string>>({})

const months: string[] = []
for (let i = 0; i < 6; i++) {
  const d = new Date(); d.setMonth(d.getMonth() - i)
  months.push(d.toISOString().slice(0, 7))
}

async function load(month: string) {
  loading.value = true
  try {
    stats.value = (await api.get(`/reports/stats/${month}`)).data
    comments.value = {}
    for (const row of stats.value) if (row.report) comments.value[row.user.id] = row.report.mgr_comment || ''
  } finally { loading.value = false }
}
onMounted(() => load(selMonth.value))
watch(selMonth, m => load(m))

const pctVal = (row: ReportStat) => row.stats.assigned > 0 ? Math.round(row.stats.resolved / row.stats.assigned * 100) : 0
const pctColor = (row: ReportStat) => { const p = pctVal(row); return p >= 80 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#ef4444' }

const statBoxes = (row: ReportStat) => [
  { c: '#2563eb', bg: '#eff6ff', v: row.stats.assigned, l: 'Được giao' },
  { c: '#16a34a', bg: '#f0fdf4', v: row.stats.resolved, l: 'Giải quyết' },
  { c: '#f59e0b', bg: '#fff7ed', v: row.stats.open, l: 'Đang mở' },
]

async function saveComment(reportId: number, userId: number) {
  try {
    await api.put(`/reports/${reportId}/comment`, { mgr_comment: comments.value[userId] || '' })
    ElMessage.success('Đã lưu nhận xét')
    load(selMonth.value)
  } catch { ElMessage.error('Lỗi khi lưu') }
}
</script>
