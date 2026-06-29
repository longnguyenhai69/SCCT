<template>
  <div>
    <div class="page-title">Sự cố thiết bị</div>
    <div class="page-sub">{{ pending.length }} chờ phê duyệt · {{ inProgress.length }} đang thực hiện</div>

    <!-- Form tạo phiếu -->
    <div class="card card-p4" style="max-width:540px; margin-bottom:24px">
      <div class="sec-title" style="margin-bottom:14px">+ Tạo phiếu sự cố mới</div>
      <form @submit.prevent="handleSubmit">
        <div style="margin-bottom:10px">
          <label class="form-label">Thiết bị / Đối tượng *</label>
          <select class="form-ctrl" :value="form.is_other ? '__other__' : form.device_id" @change="onSelectDevice">
            <option value="">-- Chọn thiết bị --</option>
            <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.name }} ({{ d.site_name || 'Chưa có CT' }})</option>
            <option value="__other__">── Khác (không phải thiết bị cụ thể) ──</option>
          </select>
        </div>

        <div v-if="form.is_other" style="margin-bottom:10px">
          <label class="form-label">Mô tả đối tượng *</label>
          <input class="form-ctrl" placeholder="VD: Vật tư, nhân lực, an toàn lao động..." v-model="form.other_label" />
        </div>

        <template v-if="!form.is_other">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
            <div>
              <label class="form-label">Thời gian xảy ra sự cố</label>
              <input type="datetime-local" class="form-ctrl" v-model="form.incident_time" />
            </div>
            <div>
              <label class="form-label">Giờ hoạt động (h)</label>
              <input type="number" class="form-ctrl" min="0" placeholder="VD: 1240" v-model="form.operating_hours" />
            </div>
          </div>
          <div style="margin-bottom:10px">
            <label class="form-label">Người vận hành</label>
            <input class="form-ctrl" placeholder="Họ tên người đang vận hành thiết bị..." v-model="form.operator" />
          </div>
        </template>

        <div style="margin-bottom:10px">
          <label class="form-label">{{ form.is_other ? 'Mô tả công việc *' : 'Mô tả sự cố *' }}</label>
          <textarea class="form-ctrl" rows="3" :placeholder="form.is_other ? 'Mô tả chi tiết công việc cần thực hiện...' : 'Mô tả chi tiết lỗi, triệu chứng...'" v-model="form.description" />
        </div>

        <div v-if="!form.is_other" style="margin-bottom:10px">
          <label class="form-label">Xác định nguyên nhân ban đầu</label>
          <textarea class="form-ctrl" rows="2" placeholder="Nhận định ban đầu về nguyên nhân gây sự cố..." v-model="form.initial_cause" />
        </div>

        <div style="margin-bottom:10px">
          <label class="form-label">Đề xuất phương án</label>
          <textarea class="form-ctrl" rows="2" placeholder="Hướng xử lý dự kiến..." v-model="form.plan" />
        </div>

        <div style="margin-bottom:14px">
          <label class="form-label">Dự kiến ngày hoàn thành</label>
          <input type="date" class="form-ctrl" v-model="form.due_date" />
        </div>

        <button type="submit" class="btn btn-primary">Gửi phiếu sự cố</button>
      </form>
    </div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <template v-else>
      <div class="sec-title" style="margin-bottom:10px; color:#b45309">Chờ phê duyệt ({{ pending.length }})</div>
      <div style="max-width:700px; margin-bottom:24px">
        <div v-if="pending.length === 0" class="empty">Không có phiếu nào đang chờ</div>
        <TicketCard v-for="t in pending" :key="t.id" :ticket="t" mode="view" @refresh="load" />
      </div>

      <div class="sec-title" style="margin-bottom:10px">Đang thực hiện ({{ inProgress.length }})</div>
      <div style="max-width:700px">
        <div v-if="inProgress.length === 0" class="empty">Không có phiếu nào đang thực hiện</div>
        <TicketCard v-for="t in inProgress" :key="t.id" :ticket="t" mode="tech" @refresh="load" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import TicketCard from '../../components/TicketCard.vue'
import api from '../../api'
import type { Ticket, Device } from '../../types'

const EMPTY = { device_id: '', description: '', plan: '', due_date: '', other_label: '', is_other: false, incident_time: '', operating_hours: '', operator: '', initial_cause: '' }

const tickets = ref<Ticket[]>([])
const devices = ref<Device[]>([])
const loading = ref(true)
const form = ref({ ...EMPTY })

const load = async () => {
  loading.value = true
  try {
    const [t, d] = await Promise.all([api.get('/tickets/mine'), api.get('/devices/mine')])
    tickets.value = t.data; devices.value = d.data
  } finally { loading.value = false }
}
onMounted(load)

const pending = computed(() => tickets.value.filter(t => t.status === 'pending'))
const inProgress = computed(() => tickets.value.filter(t => t.status === 'in_progress'))

function onSelectDevice(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  form.value.is_other = v === '__other__'
  form.value.device_id = v === '__other__' ? '' : v
}

async function handleSubmit() {
  const f = form.value
  if (!f.is_other && !f.device_id) return ElMessage.info('Vui lòng chọn thiết bị')
  if (f.is_other && !f.other_label) return ElMessage.info('Vui lòng mô tả đối tượng')
  if (!f.description) return ElMessage.info('Vui lòng mô tả sự cố')
  try {
    const sel = devices.value.find(d => String(d.id) === String(f.device_id))
    await api.post('/tickets', {
      device_id: f.is_other ? null : f.device_id || null,
      site_id: f.is_other ? null : sel?.site_id || null,
      description: f.description,
      plan: f.plan,
      due_date: f.due_date || null,
      other_label: f.is_other ? f.other_label : '',
      incident_time: f.incident_time || null,
      operating_hours: f.operating_hours ? Number(f.operating_hours) : null,
      operator: f.operator,
      initial_cause: f.initial_cause,
    })
    ElMessage.success('Đã gửi phiếu sự cố! Chờ trưởng phòng phê duyệt.')
    form.value = { ...EMPTY }
    setTimeout(load, 600)
  } catch (e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }
}
</script>
