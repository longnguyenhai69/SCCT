<template>
  <div>
    <div class="page-title">Sự cố toàn hệ thống</div>
    <div class="page-sub">{{ openCount }} sự cố đang mở</div>

    <div class="filter-bar" style="margin-bottom:18px">
      <button v-for="[v, l] in FILTERS" :key="v" class="btn btn-sm" :class="filter === v ? 'btn-primary' : 'btn-outline'" @click="filter = v">{{ l }}</button>
    </div>

    <div v-if="loading" class="empty">Đang tải...</div>
    <div v-else style="max-width:720px">
      <div v-if="filtered.length === 0" class="empty">Không có phiếu nào</div>
      <TicketCard v-for="t in filtered" :key="t.id" :ticket="t" mode="view" @refresh="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TicketCard from '../../components/TicketCard.vue'
import api from '../../api'
import type { Ticket } from '../../types'

const FILTERS: [string, string][] = [['open', 'Đang mở'], ['resolved', 'Đã xử lý'], ['all', 'Tất cả']]
const tickets = ref<Ticket[]>([])
const filter = ref('open')
const loading = ref(true)

const load = async () => {
  loading.value = true
  try { tickets.value = (await api.get('/tickets')).data } finally { loading.value = false }
}
onMounted(load)

const openCount = computed(() => tickets.value.filter(t => t.status !== 'resolved').length)
const filtered = computed(() => tickets.value.filter(t =>
  filter.value === 'open' ? t.status !== 'resolved' :
  filter.value === 'resolved' ? t.status === 'resolved' : true
))
</script>
