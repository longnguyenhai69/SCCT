<template>
  <div>
    <div class="page-title">Quản lý tài khoản</div>
    <div class="page-sub">{{ users.length }} tài khoản</div>

    <button class="btn btn-primary" style="margin-bottom:24px" @click="openAdd">+ Thêm tài khoản</button>

    <div v-for="grp in byRole" :key="grp.role" style="max-width:720px; margin-bottom:24px">
      <div class="divider">{{ grp.label }}</div>
      <div v-for="u in grp.users" :key="u.id"
           style="display:flex; align-items:center; gap:14px; padding:12px 16px; background:#fff; border-radius:12px; border:1.5px solid #f1f5f9; margin-bottom:8px; box-shadow:0 1px 3px rgba(15,23,42,.04)">
        <div :style="{ width: '40px', height: '40px', borderRadius: '50%', background: avatarColor(u.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }">
          {{ initials(u.name) }}
        </div>
        <div style="flex:1">
          <div style="font-weight:600; color:#1e293b; font-size:14px">
            {{ u.name }} <span v-if="u.id === me?.id" style="font-size:11px; color:#2563eb">(bạn)</span>
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:1px">{{ u.email }}</div>
        </div>
        <div style="display:flex; gap:6px">
          <button class="btn btn-outline btn-sm" @click="openEdit(u)">Sửa</button>
          <button v-if="u.id !== me?.id" class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5" @click="handleDelete(u)">Xóa</button>
        </div>
      </div>
    </div>

    <el-dialog v-model="modal" :title="editing ? 'Sửa tài khoản' : 'Thêm tài khoản'" width="480px">
      <div style="margin-bottom:10px">
        <label class="form-label">Họ và tên *</label>
        <input class="form-ctrl" v-model="form.name" placeholder="VD: Nguyễn Văn A" />
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Email *</label>
        <input type="email" class="form-ctrl" v-model="form.email" placeholder="VD: nva@scct.vn" />
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">Chức danh</label>
        <select class="form-ctrl" v-model="form.role">
          <option v-for="[v, l] in ROLES" :key="v" :value="v">{{ l }}</option>
        </select>
      </div>
      <label v-if="editing" style="display:flex; align-items:center; gap:8px; font-size:13px; color:#374151; margin-bottom:10px; cursor:pointer">
        <input type="checkbox" v-model="changePw" />
        Đặt lại mật khẩu
      </label>
      <div v-if="!editing || changePw" style="margin-bottom:14px">
        <label class="form-label">{{ editing ? 'Mật khẩu mới' : 'Mật khẩu *' }}</label>
        <input type="password" class="form-ctrl" v-model="form.password" :placeholder="editing ? 'Để trống = giữ nguyên' : 'Mặc định: scct@2026'" />
      </div>
      <div style="display:flex; gap:8px; margin-top:6px">
        <button class="btn btn-primary" @click="handleSave">{{ editing ? 'Lưu thay đổi' : 'Tạo tài khoản' }}</button>
        <button class="btn btn-outline" @click="modal = false">Hủy</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuth } from '../../stores/auth'
import { ROLE_LABEL, initials } from '../../utils'
import api from '../../api'
import type { User } from '../../types'

const ROLES: [string, string][] = [
  ['tech', 'Nhân viên kỹ thuật'], ['specialist', 'Chuyên viên cơ điện'],
  ['deputy_manager', 'Phó phòng kỹ thuật cơ điện'], ['manager', 'Trưởng phòng kỹ thuật'],
  ['director', 'Phó Tổng Giám Đốc'], ['admin', 'Quản trị hệ thống']
]
const EMPTY = { name: '', email: '', role: 'tech', password: '' }
const AVATAR_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#dc2626']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length] || '#64748b'

const auth = useAuth()
const me = computed(() => auth.user)
const users = ref<User[]>([])
const modal = ref(false)
const editing = ref<User | null>(null)
const form = ref({ ...EMPTY })
const changePw = ref(false)

const load = async () => { users.value = (await api.get('/users')).data }
onMounted(load)

const byRole = computed(() => ROLES
  .map(([role, label]) => ({ role, label, users: users.value.filter(u => u.role === role) }))
  .filter(g => g.users.length > 0))

function openAdd() { editing.value = null; form.value = { ...EMPTY }; changePw.value = false; modal.value = true }
function openEdit(u: User) {
  editing.value = u
  form.value = { name: u.name, email: u.email, role: u.role, password: '' }
  changePw.value = false; modal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.email) return ElMessage.info('Họ tên và email là bắt buộc')
  if (!editing.value && !form.value.password) return ElMessage.info('Mật khẩu là bắt buộc khi tạo tài khoản mới')
  try {
    const data: any = { ...form.value }
    if (editing.value && !changePw.value) delete data.password
    if (!data.password) delete data.password
    editing.value ? await api.put(`/users/${editing.value.id}`, data) : await api.post('/users', data)
    ElMessage.success(editing.value ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản mới')
    modal.value = false; load()
  } catch (e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }
}

async function handleDelete(u: User) {
  if (u.id === me.value?.id) return ElMessage.info('Không thể xóa chính mình')
  try {
    await ElMessageBox.confirm(`Xóa tài khoản "${u.name}"?`, 'Xác nhận', { type: 'warning', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
    await api.delete(`/users/${u.id}`); load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.response?.data?.error || 'Lỗi') }
}
</script>
