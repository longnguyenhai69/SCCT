<template>
  <div class="card card-p4" :style="{ marginBottom: '12px', maxWidth: '680px', borderLeft: `4px solid ${borderColor}` }">
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px">
      <div>
        <div style="font-weight:700; font-size:14px; color:#0f172a">
          {{ deviceLabel }}
          <span v-if="isOther" style="font-size:11px; background:#f1f5f9; color:#64748b; padding:1px 8px; border-radius:20px; font-weight:600">Khác</span>
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:2px">
          {{ t.site_name || '—' }} &nbsp;·&nbsp; {{ t.creator_name }} &nbsp;·&nbsp; {{ fmtDate(t.created_at) }}
        </div>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; align-items:center">
        <TicketBadge :status="t.status" />
        <span v-if="overdue" class="badge b-broken">⚠ Quá hạn</span>
        <span v-if="isOther" class="badge b-pending">Khác</span>
        <button v-if="onDelete" title="Xóa phiếu" class="tk-del" @click="confirmDelete">×</button>
      </div>
    </div>

    <!-- Thông tin sự cố -->
    <div v-if="t.incident_time || t.operating_hours != null || t.operator"
         style="display:flex; flex-wrap:wrap; gap:6px 20px; margin-bottom:10px; font-size:12px; color:#64748b">
      <span v-if="t.incident_time">🕐 <b>Thời gian:</b> {{ new Date(t.incident_time).toLocaleString('vi-VN') }}</span>
      <span v-if="t.operating_hours != null">⏱ <b>Giờ HĐ:</b> {{ t.operating_hours }} h</span>
      <span v-if="t.operator">👤 <b>Người VH:</b> {{ t.operator }}</span>
    </div>

    <!-- Mô tả -->
    <div class="note-box" style="margin-bottom:10px">{{ t.description }}</div>

    <!-- Nguyên nhân ban đầu -->
    <div v-if="t.initial_cause" style="margin-bottom:8px">
      <div style="font-size:11px; font-weight:700; color:#b45309; text-transform:uppercase; margin-bottom:4px">Nguyên nhân ban đầu</div>
      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:8px 12px; font-size:13px; color:#9a3412">{{ t.initial_cause }}</div>
    </div>

    <!-- Đề xuất phương án -->
    <div v-if="t.plan" style="margin-bottom:8px">
      <div style="font-size:11px; font-weight:700; color:#a16207; text-transform:uppercase; margin-bottom:4px">Đề xuất phương án</div>
      <div style="background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; font-size:13px; color:#92400e">{{ t.plan }}</div>
    </div>

    <!-- Phương án đã duyệt -->
    <div v-if="t.approved_plan && t.status !== 'pending'" style="margin-bottom:8px">
      <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; margin-bottom:4px">Phương án phê duyệt</div>
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:8px 12px; font-size:13px; color:#1e40af">{{ t.approved_plan }}</div>
    </div>

    <!-- Assignees -->
    <div v-if="t.assignees?.length" style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap">
      <span style="font-size:11px; color:#64748b; font-weight:600">Phân công:</span>
      <span v-for="a in t.assignees" :key="a.id" style="font-size:11px; background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:20px; font-weight:600">{{ a.name }}</span>
    </div>

    <!-- Due date -->
    <div v-if="t.due_date" :style="{ fontSize: '12px', color: overdue ? '#dc2626' : '#7c3aed', marginBottom: '8px' }">
      {{ overdue ? '⚠ Quá hạn: ' : 'Dự kiến: ' }}{{ fmtDate(t.due_date) }}
    </div>

    <!-- Nhật ký tiến độ -->
    <div v-if="t.updates?.length" style="border-top:1px solid #f1f5f9; padding-top:8px; margin-top:8px">
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:6px">Nhật ký tiến độ</div>
      <div v-for="(u, i) in t.updates" :key="i" style="background:#f8fafc; border-radius:6px; padding:6px 10px; margin-bottom:5px; font-size:12px; color:#475569">
        <span style="color:#94a3b8; margin-right:6px">{{ fmtDate(u.created_at) }}</span>{{ u.note }}
      </div>
    </div>

    <!-- Kết quả xử lý -->
    <div v-if="t.status === 'resolved' && t.resolve_note"
         style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:8px 12px; margin-top:8px; font-size:13px; color:#15803d">
      <b>Kết quả:</b> {{ t.resolve_note }} <span style="color:#86efac">— {{ fmtDate(t.resolved_date) }}</span>
    </div>

    <!-- MODE: TECH -->
    <div v-if="mode === 'tech' && t.status === 'in_progress'" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap">
      <template v-if="!showUpdateForm && !showResolveForm">
        <button class="btn btn-outline btn-sm" @click="showUpdateForm = true">+ Cập nhật tiến độ</button>
        <button class="btn btn-primary btn-sm" @click="showResolveForm = true">✓ Đánh dấu hoàn thành</button>
      </template>
      <div v-if="showUpdateForm" style="width:100%; margin-top:6px">
        <textarea class="form-ctrl" rows="2" placeholder="Nhập tiến độ xử lý..." v-model="updateNote" style="margin-bottom:8px" />
        <div style="display:flex; gap:8px">
          <button class="btn btn-primary btn-sm" @click="handleAddUpdate">Gửi</button>
          <button class="btn btn-outline btn-sm" @click="showUpdateForm = false">Hủy</button>
        </div>
      </div>
      <div v-if="showResolveForm" style="width:100%; margin-top:6px">
        <textarea class="form-ctrl" rows="2" placeholder="Mô tả kết quả đã xử lý..." v-model="resolveNote" style="margin-bottom:8px" />
        <div style="display:flex; gap:8px">
          <button class="btn btn-primary btn-sm" @click="handleResolve">Xác nhận hoàn thành</button>
          <button class="btn btn-outline btn-sm" @click="showResolveForm = false">Hủy</button>
        </div>
      </div>
    </div>

    <!-- MODE: MGR-APPROVE -->
    <div v-if="mode === 'mgr-approve' && t.status === 'pending'" style="border-top:1px solid #f1f5f9; margin-top:12px; padding-top:12px">
      <div style="margin-bottom:10px">
        <label class="form-label">Phương án phê duyệt</label>
        <textarea class="form-ctrl" rows="2" v-model="approvedPlan" placeholder="Điều chỉnh hoặc xác nhận phương án..." />
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Phân công nhân viên</label>
        <div style="display:flex; flex-wrap:wrap; gap:8px">
          <label v-for="u in techUsers" :key="u.id" style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:13px">
            <input type="checkbox" :value="u.id" v-model="selectedAssignees" />
            {{ u.name }} <span style="font-size:11px; color:#94a3b8">({{ ROLE_LABEL[u.role]?.split(' ')[0] }})</span>
          </label>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label class="form-label">Hạn hoàn thành</label>
        <input type="date" class="form-ctrl" v-model="dueDate" style="max-width:200px" />
      </div>
      <button class="btn btn-primary" @click="handleApprove">✓ Phê duyệt &amp; Phân công</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import TicketBadge from './TicketBadge.vue'
import { fmtDate, ROLE_LABEL } from '../utils'
import api from '../api'
import type { Ticket, User } from '../types'

const props = withDefaults(defineProps<{
  ticket: Ticket
  mode?: string
  techUsers?: User[]
  onDelete?: ((id: number) => void) | null
}>(), { mode: 'view', techUsers: () => [], onDelete: null })

const emit = defineEmits<{ refresh: [] }>()

const t = computed(() => props.ticket)

const updateNote = ref('')
const resolveNote = ref('')
const approvedPlan = ref(props.ticket.approved_plan || '')
const selectedAssignees = ref<number[]>(props.ticket.assignees?.map(a => a.id) || [])
const dueDate = ref(props.ticket.due_date?.slice(0, 10) || '')
const showUpdateForm = ref(false)
const showResolveForm = ref(false)

const isOther = computed(() => !t.value.device_id)
const overdue = computed(() => !!t.value.due_date && new Date(t.value.due_date) < new Date() && t.value.status === 'in_progress')
const deviceLabel = computed(() => isOther.value ? (t.value.other_label || 'Khác') : (t.value.device_name || '—'))
const borderColor = computed(() => (({ pending: '#f59e0b', in_progress: '#ef4444', resolved: '#16a34a' } as Record<string, string>)[t.value.status]) || '#e5e7eb')

function err(e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }

async function handleApprove() {
  try {
    await api.put(`/tickets/${t.value.id}/approve`, { approved_plan: approvedPlan.value, assignee_ids: selectedAssignees.value, due_date: dueDate.value })
    emit('refresh')
  } catch (e) { err(e) }
}

async function handleAddUpdate() {
  if (!updateNote.value.trim()) return
  try {
    await api.post(`/tickets/${t.value.id}/updates`, { note: updateNote.value })
    updateNote.value = ''; showUpdateForm.value = false; emit('refresh')
  } catch (e) { err(e) }
}

async function handleResolve() {
  try {
    await api.put(`/tickets/${t.value.id}/resolve`, { resolve_note: resolveNote.value })
    showResolveForm.value = false; emit('refresh')
  } catch (e) { err(e) }
}

async function confirmDelete() {
  try {
    await ElMessageBox.confirm('Xóa phiếu sự cố này?', 'Xác nhận', { type: 'warning', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
    props.onDelete?.(t.value.id)
  } catch { /* hủy */ }
}
</script>

<style scoped>
.tk-del {
  background: none; border: none; cursor: pointer; color: #94a3b8;
  font-size: 18px; line-height: 1; padding: 0 2px; margin-left: 4px;
}
.tk-del:hover { color: #ef4444; }
</style>
