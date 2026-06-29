<template>
  <div>
    <div class="page-title">Công trường</div>
    <div class="page-sub">{{ sites.length }} công trường đang quản lý</div>

    <button class="btn btn-primary" style="margin-bottom:20px" @click="openAdd">+ Thêm công trường</button>

    <div style="max-width:680px">
      <div v-for="s in sites" :key="s.id" class="card card-p4" style="margin-bottom:12px">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <div style="font-weight:700; font-size:14px; color:#0f172a; margin-bottom:4px">{{ s.name }}</div>
            <div style="font-size:12px; color:#64748b">{{ s.loc }}</div>
            <span v-if="s.type" style="font-size:11px; background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:20px; font-weight:600; display:inline-block; margin-top:6px">{{ s.type }}</span>
            <div v-if="s.reg_no" style="font-size:12px; color:#374151; margin-top:6px">Số ĐK: <b>{{ s.reg_no }}</b></div>
            <div v-if="s.inspect_expiry" style="margin-top:6px"><InspectBadge :date="s.inspect_expiry" /></div>
          </div>
          <div style="display:flex; gap:6px">
            <button class="btn btn-outline btn-sm" @click="openEdit(s)">Sửa</button>
            <button class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5" @click="handleDelete(s)">Xóa</button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="modal" :title="editing ? 'Sửa công trường' : 'Thêm công trường'" width="460px">
      <div style="margin-bottom:10px">
        <label class="form-label">Tên công trường *</label>
        <input class="form-ctrl" v-model="form.name" placeholder="VD: Cảng Sài Gòn" />
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Địa điểm</label>
        <input class="form-ctrl" v-model="form.loc" placeholder="VD: Quận 4, TP.HCM" />
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Loại công trường</label>
        <select class="form-ctrl" v-model="form.type">
          <option value="">-- Chọn loại --</option>
          <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <template v-if="form.type === 'Phương tiện thủy'">
        <div style="margin-bottom:10px">
          <label class="form-label">Số đăng ký</label>
          <input class="form-ctrl" v-model="form.reg_no" />
        </div>
        <div style="margin-bottom:10px">
          <label class="form-label">Hạn đăng kiểm</label>
          <input type="date" class="form-ctrl" v-model="form.inspect_expiry" />
        </div>
      </template>
      <div style="display:flex; gap:8px; margin-top:16px">
        <button class="btn btn-primary" @click="handleSave">{{ editing ? 'Lưu thay đổi' : 'Thêm' }}</button>
        <button class="btn btn-outline" @click="modal = false">Hủy</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import InspectBadge from '../../components/InspectBadge.vue'
import api from '../../api'
import type { Site } from '../../types'

const EMPTY = { name: '', loc: '', type: '', reg_no: '', inspect_expiry: '' }
const TYPES = ['Phương tiện thủy', 'Bốc xúc']

const sites = ref<Site[]>([])
const modal = ref(false)
const editing = ref<Site | null>(null)
const form = ref({ ...EMPTY })

const load = async () => { sites.value = (await api.get('/sites')).data }
onMounted(load)

function openAdd() { editing.value = null; form.value = { ...EMPTY }; modal.value = true }
function openEdit(s: Site) {
  editing.value = s
  form.value = { name: s.name, loc: s.loc || '', type: s.type || '', reg_no: s.reg_no || '', inspect_expiry: s.inspect_expiry?.slice(0, 10) || '' }
  modal.value = true
}

async function handleSave() {
  if (!form.value.name) return ElMessage.info('Vui lòng nhập tên công trường')
  try {
    const isThuy = form.value.type === 'Phương tiện thủy'
    const data = { ...form.value, reg_no: isThuy ? form.value.reg_no : null, inspect_expiry: isThuy ? form.value.inspect_expiry || null : null }
    editing.value ? await api.put(`/sites/${editing.value.id}`, data) : await api.post('/sites', data)
    ElMessage.success(editing.value ? 'Đã cập nhật' : 'Đã thêm công trường')
    modal.value = false; load()
  } catch (e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }
}

async function handleDelete(s: Site) {
  try {
    await ElMessageBox.confirm(`Xóa công trường "${s.name}"?`, 'Xác nhận', { type: 'warning', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
    await api.delete(`/sites/${s.id}`); load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.response?.data?.error || 'Lỗi') }
}
</script>
