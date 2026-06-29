<template>
  <div>
    <div class="page-title">Quản lý sự cố</div>
    <div class="page-sub">{{ openCount }} sự cố đang mở</div>

    <div class="filter-bar" style="margin-bottom:18px">
      <button v-for="[v, l] in FILTERS" :key="v" class="btn btn-sm" :class="filter === v ? 'btn-primary' : 'btn-outline'" @click="filter = v">{{ l }}</button>
    </div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <div v-else style="max-width:720px">
      <div v-if="filtered.length === 0" class="empty">Không có phiếu nào</div>
      <TicketCard
        v-for="t in filtered" :key="t.id" :ticket="t"
        :mode="t.status === 'pending' ? 'mgr-approve' : 'view'"
        :tech-users="techUsers"
        :on-delete="handleDelete"
        @refresh="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import TicketCard from '../../components/TicketCard.vue'
import api from '../../api'
import type { Ticket, User } from '../../types'

const FILTERS: [string, string][] = [['open', 'Đang mở'], ['pending', 'Chờ duyệt'], ['resolved', 'Đã xử lý'], ['all', 'Tất cả']]
const tickets = ref<Ticket[]>([])
const techUsers = ref<User[]>([])
const filter = ref('open')
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    const [t, u] = await Promise.all([api.get('/tickets'), api.get('/users/tech')])
    tickets.value = t.data; techUsers.value = u.data
  } finally { loading.value = false }
}
onMounted(load)

const openCount = computed(() => tickets.value.filter(t => t.status !== 'resolved').length)
const filtered = computed(() => tickets.value.filter(t =>
  filter.value === 'open' ? t.status !== 'resolved' :
  filter.value === 'pending' ? t.status === 'pending' :
  filter.value === 'resolved' ? t.status === 'resolved' : true
))

function handleDelete(id: number) {
  api.delete(`/tickets/${id}`).then(load).catch(e => ElMessage.error(e.response?.data?.error || 'Lỗi xóa'))
}
</script>
