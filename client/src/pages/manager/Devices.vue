<template>
  <div>
    <div class="page-title">Quản lý thiết bị</div>
    <div class="page-sub">{{ devices.length }} thiết bị</div>

    <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap">
      <button class="btn btn-primary" @click="openAdd">+ Thêm thiết bị</button>
      <button class="btn btn-outline" @click="fileRef?.click()">Nhập từ Excel</button>
      <button class="btn btn-outline" @click="downloadTemplate">Tải mẫu</button>
      <input ref="fileRef" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="handleFile" />
      <input class="form-ctrl" style="max-width:280px" placeholder="Tìm kiếm..." v-model="search" />
    </div>

    <div v-for="g in groups" :key="g.key" style="margin-bottom:10px; max-width:720px">
      <div @click="toggle(g.key)" class="grp-hdr" :style="{ borderRadius: isOpen(g.key) ? '12px 12px 0 0' : '12px' }">
        <div style="display:flex; align-items:center; gap:10px">
          <span style="font-size:14px; font-weight:700">{{ g.name }}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px">
          <span style="font-size:12px; opacity:.7">{{ g.devices.length }} thiết bị</span>
          <span v-if="g.broken > 0" style="font-size:11px; background:#ef4444; padding:2px 8px; border-radius:20px; font-weight:700">{{ g.broken }} sự cố</span>
          <span style="font-size:16px; opacity:.8; display:inline-block; transition:transform .2s" :style="{ transform: isOpen(g.key) ? 'rotate(180deg)' : 'rotate(0)' }">▾</span>
        </div>
      </div>

      <div v-if="isOpen(g.key)" style="border:1.5px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px; overflow:hidden">
        <div v-for="(d, idx) in g.devices" :key="d.id" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }">
          <div style="flex:1">
            <div style="font-weight:600; font-size:13px; color:#1e293b">{{ d.name }} <span v-if="d.reg_no" style="font-size:11px; color:#64748b; font-weight:400">({{ d.reg_no }})</span></div>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px">{{ d.type }} · {{ d.assigned_name || 'Chưa phân công' }}</div>
            <div v-if="d.description" style="font-size:11px; color:#64748b; margin-top:3px">{{ d.description }}</div>
            <div v-if="d.inspect_expiry" style="margin-top:4px"><InspectBadge :date="d.inspect_expiry" /></div>
          </div>
          <div style="display:flex; align-items:center; gap:10px">
            <StatusBadge :device="d" />
            <button class="btn btn-outline btn-sm" @click="openEdit(d)">Sửa</button>
            <button class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5" @click="handleDelete(d)">Xóa</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal thêm/sửa -->
    <el-dialog v-model="modal" :title="editing ? 'Sửa thiết bị' : 'Thêm thiết bị'" width="500px">
      <div style="margin-bottom:10px">
        <label class="form-label">Tên thiết bị *</label>
        <input class="form-ctrl" v-model="form.name" />
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
        <div>
          <label class="form-label">Loại thiết bị</label>
          <input class="form-ctrl" v-model="form.type" placeholder="VD: Máy khoan" />
        </div>
        <div>
          <label class="form-label">Trạng thái</label>
          <select class="form-ctrl" v-model="form.status">
            <option v-for="[v, l] in STATUS_OPTS" :key="v" :value="v">{{ l }}</option>
          </select>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
        <div>
          <label class="form-label">Công trường</label>
          <select class="form-ctrl" v-model="form.site_id">
            <option value="">-- Chưa có --</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Phân công cho</label>
          <select class="form-ctrl" v-model="form.assigned_to">
            <option value="">-- Chưa phân công --</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>
      <div v-if="!isThuy" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
        <div>
          <label class="form-label">Số đăng ký</label>
          <input class="form-ctrl" v-model="form.reg_no" />
        </div>
        <div>
          <label class="form-label">Hạn đăng kiểm</label>
          <input type="date" class="form-ctrl" v-model="form.inspect_expiry" />
        </div>
      </div>
      <div style="margin-bottom:16px">
        <label class="form-label">Mô tả / Đặc điểm</label>
        <textarea class="form-ctrl" rows="2" v-model="form.description" placeholder="VD: Công suất 200kVA..." />
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn btn-primary" @click="handleSave">{{ editing ? 'Lưu thay đổi' : 'Thêm thiết bị' }}</button>
        <button class="btn btn-outline" @click="modal = false">Hủy</button>
      </div>
    </el-dialog>

    <!-- Modal xem trước nhập Excel -->
    <el-dialog v-model="showImport" title="Xem trước nhập từ Excel" width="760px">
      <div v-if="importRows">
        <div style="margin-bottom:12px; font-size:13px">
          Tổng <b>{{ importRows.length }}</b> dòng — <span style="color:#16a34a">{{ okCount }} hợp lệ</span>
          <span v-if="errCount > 0" style="color:#dc2626"> · {{ errCount }} lỗi</span>
        </div>
        <div style="max-height:50vh; overflow:auto; border:1px solid #e2e8f0; border-radius:8px">
          <table style="width:100%; border-collapse:collapse; font-size:12px">
            <thead>
              <tr style="background:#f1f5f9">
                <th :style="thStyle">Dòng</th><th :style="thStyle">Tên</th><th :style="thStyle">Công trường</th>
                <th :style="thStyle">Phân công</th><th :style="thStyle">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in importRows" :key="i" :style="{ background: r.errors.length === 0 ? '#fff' : '#fef2f2' }">
                <td :style="tdStyle">{{ r.excelRow }}</td>
                <td :style="tdStyle"><span v-if="r.name">{{ r.name }}</span><i v-else style="color:#dc2626">(trống)</i></td>
                <td :style="tdStyle">{{ r.siteName || '—' }}</td>
                <td :style="tdStyle">{{ r.assignName || '—' }}</td>
                <td :style="{ ...tdStyle, color: r.errors.length === 0 ? '#16a34a' : '#dc2626' }">{{ r.errors.length === 0 ? '✓ OK' : r.errors.join('; ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display:flex; gap:8px; margin-top:16px; align-items:center; flex-wrap:wrap">
          <button class="btn btn-primary" :disabled="errCount > 0 || importing" @click="handleImport">
            {{ importing ? 'Đang nhập...' : `Nhập ${okCount} thiết bị` }}
          </button>
          <button class="btn btn-outline" @click="showImport = false">Hủy</button>
          <span v-if="errCount > 0" style="font-size:12px; color:#dc2626">Sửa {{ errCount }} dòng lỗi trong file rồi tải lên lại</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusBadge from '../../components/StatusBadge.vue'
import InspectBadge from '../../components/InspectBadge.vue'
import api from '../../api'
import type { Device, Site, User } from '../../types'

const EMPTY = { name: '', type: '', status: 'normal', site_id: '', assigned_to: '', reg_no: '', inspect_expiry: '', description: '' }
const STATUS_OPTS: [string, string][] = [['normal', 'Bình thường'], ['maintain', 'Đang bảo trì'], ['pending', 'Chờ linh kiện']]

const HEADER_MATCHERS: [string, (h: string) => boolean][] = [
  ['name',    h => h.includes('tên')],
  ['type',    h => h.includes('loại')],
  ['site',    h => h.includes('công trường')],
  ['assign',  h => h.includes('phân công')],
  ['reg_no',  h => h.includes('đăng ký')],
  ['inspect', h => h.includes('đăng kiểm')],
  ['desc',    h => h.includes('mô tả')],
]
const norm = (s: any) => String(s ?? '').trim()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const thStyle = { textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' } as const
const tdStyle = { padding: '7px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' } as const

interface ImportRow {
  excelRow: number; name: string; siteName: string; assignName: string; errors: string[]
  resolved: any
}

const devices = ref<Device[]>([])
const sites = ref<Site[]>([])
const users = ref<User[]>([])
const modal = ref(false)
const editing = ref<Device | null>(null)
const form = ref<any>({ ...EMPTY })
const search = ref('')
const collapsed = ref<Record<string, boolean>>({})
const fileRef = ref<HTMLInputElement | null>(null)

const importRows = ref<ImportRow[] | null>(null)
const showImport = ref(false)
const importing = ref(false)

const load = async () => {
  const [d, s, u] = await Promise.all([api.get('/devices'), api.get('/sites'), api.get('/users/tech')])
  devices.value = d.data; sites.value = s.data; users.value = u.data
}
onMounted(load)

const isThuy = computed(() => sites.value.find(s => String(s.id) === String(form.value.site_id))?.type === 'Phương tiện thủy')

function openAdd() { editing.value = null; form.value = { ...EMPTY }; modal.value = true }
function openEdit(d: Device) {
  editing.value = d
  form.value = { name: d.name, type: d.type || '', status: d.status || 'normal', site_id: d.site_id || '', assigned_to: d.assigned_to || '', reg_no: d.reg_no || '', inspect_expiry: d.inspect_expiry?.slice(0, 10) || '', description: d.description || '' }
  modal.value = true
}

async function handleSave() {
  if (!form.value.name) return ElMessage.info('Vui lòng nhập tên thiết bị')
  try {
    const data = { ...form.value, reg_no: isThuy.value ? null : form.value.reg_no || null, inspect_expiry: isThuy.value ? null : form.value.inspect_expiry || null }
    editing.value ? await api.put(`/devices/${editing.value.id}`, data) : await api.post('/devices', data)
    ElMessage.success(editing.value ? 'Đã cập nhật' : 'Đã thêm thiết bị')
    modal.value = false; load()
  } catch (e: any) { ElMessage.error(e.response?.data?.error || 'Lỗi') }
}

async function handleDelete(d: Device) {
  try {
    await ElMessageBox.confirm(`Xóa thiết bị "${d.name}"?`, 'Xác nhận', { type: 'warning', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
    await api.delete(`/devices/${d.id}`); load()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.response?.data?.error || 'Lỗi') }
}

// ── Nhập từ Excel ──
function buildColMap(headerRow: any[]) {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell).toLowerCase()
    for (const [key, test] of HEADER_MATCHERS) {
      if (map[key] === undefined && test(h)) { map[key] = idx; break }
    }
  })
  return map
}

async function handleFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: false }) as any[][]
    if (aoa.length < 2) return ElMessage.info('File không có dữ liệu')

    const col = buildColMap(aoa[0])
    if (col.name === undefined) return ElMessage.info('Không tìm thấy cột "Tên thiết bị" trong file')

    const siteByName = new Map(sites.value.map(s => [norm(s.name).toLowerCase(), s]))
    const userByName = new Map(users.value.map(u => [norm(u.name).toLowerCase(), u]))

    const rows: ImportRow[] = []
    for (let r = 1; r < aoa.length; r++) {
      const get = (k: string) => col[k] === undefined ? '' : norm(aoa[r][col[k]])
      const name = get('name'), siteName = get('site'), assignName = get('assign')
      if (![name, get('type'), siteName, assignName, get('reg_no'), get('inspect'), get('desc')].some(v => v)) continue

      const errors: string[] = []
      let site_id: number | null = null, siteType: string | null = null, assigned_to: number | null = null
      if (!name) errors.push('Thiếu tên thiết bị')
      if (siteName) {
        const s = siteByName.get(siteName.toLowerCase())
        if (!s) errors.push(`Công trường "${siteName}" không tồn tại`)
        else { site_id = s.id; siteType = s.type }
      }
      if (assignName) {
        const u = userByName.get(assignName.toLowerCase())
        if (!u) errors.push(`Không tìm thấy người "${assignName}"`)
        else assigned_to = u.id
      }
      const thuy = siteType === 'Phương tiện thủy'
      const reg_no = thuy ? '' : get('reg_no')
      const inspect = thuy ? '' : get('inspect')
      if (inspect && (!DATE_RE.test(inspect) || isNaN(Date.parse(inspect))))
        errors.push('Hạn đăng kiểm phải dạng YYYY-MM-DD hợp lệ')

      rows.push({
        excelRow: r + 1, name, siteName, assignName, errors,
        resolved: { name, type: get('type'), status: 'normal', site_id, assigned_to, reg_no: reg_no || null, inspect_expiry: inspect || null, description: get('desc') },
      })
    }
    if (rows.length === 0) return ElMessage.info('File không có dòng dữ liệu nào')
    importRows.value = rows
    showImport.value = true
  } catch (err: any) {
    ElMessage.error('Không đọc được file: ' + err.message)
  } finally {
    input.value = ''
  }
}

const errCount = computed(() => importRows.value?.filter(r => r.errors.length).length || 0)
const okCount = computed(() => (importRows.value?.length || 0) - errCount.value)

async function handleImport() {
  if (!importRows.value) return
  const valid = importRows.value.filter(r => r.errors.length === 0)
  importing.value = true
  try {
    await api.post('/devices/bulk', { devices: valid.map(r => r.resolved) })
    ElMessage.success(`Đã nhập ${valid.length} thiết bị`)
    showImport.value = false; importRows.value = null; load()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || 'Lỗi khi nhập')
  } finally { importing.value = false }
}

function downloadTemplate() {
  const headers = ['Tên thiết bị', 'Loại thiết bị', 'Công trường', 'Phân công cho', 'Số đăng ký', 'Hạn đăng kiểm (YYYY-MM-DD)', 'Mô tả']
  const sample = ['Máy phát điện 1', 'Máy phát', sites.value[0]?.name || '', users.value[0]?.name || '', '', '', 'Công suất 200kVA']
  const csv = '﻿' + [headers, sample].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'mau_nhap_thiet_bi.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── List grouping ──
const filtered = computed(() => devices.value.filter(d =>
  !search.value || d.name.toLowerCase().includes(search.value.toLowerCase()) || d.site_name?.toLowerCase().includes(search.value.toLowerCase())
))
const groups = computed(() => {
  const acc: Record<string, { key: string; name: string; devices: Device[]; broken: number }> = {}
  for (const d of filtered.value) {
    const k = String(d.site_id || '__none__')
    if (!acc[k]) acc[k] = { key: k, name: d.site_name || 'Chưa có công trường', devices: [], broken: 0 }
    acc[k].devices.push(d)
  }
  return Object.values(acc).map(g => ({ ...g, broken: g.devices.filter(d => d.has_open_ticket).length }))
})
const isOpen = (key: string) => !collapsed.value[key]
const toggle = (key: string) => { collapsed.value[key] = !collapsed.value[key] }
</script>

<style scoped>
.grp-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #1e3a5f; color: #fff; cursor: pointer; user-select: none;
}
</style>
