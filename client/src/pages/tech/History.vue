<template>
  <div>
    <div class="page-title">Lịch sử sự cố</div>
    <div class="page-sub">{{ tickets.length }} phiếu đã khắc phục</div>
    <div v-if="loading" class="empty">Đang tải...</div>
    <div v-else style="max-width:700px">
      <div v-if="tickets.length === 0" class="empty">Chưa có sự cố nào được khắc phục</div>
      <TicketCard v-for="t in tickets" :key="t.id" :ticket="t" mode="view" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TicketCard from '../../components/TicketCard.vue'
import api from '../../api'
import type { Ticket } from '../../types'

const tickets = ref<Ticket[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const r = await api.get('/tickets/mine')
    tickets.value = r.data.filter((t: Ticket) => t.status === 'resolved')
  } finally { loading.value = false }
})
</script>
