<template>
  <span class="badge" :class="cls">{{ TICKET_STATUS_LABEL[status] || status }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TICKET_STATUS_LABEL } from '../utils'

const props = defineProps<{ status: string }>()
const cls = computed(() => ({
  pending: 'b-maintain', in_progress: 'b-broken', resolved: 'b-normal'
} as Record<string, string>)[props.status] || 'b-normal')
</script>
