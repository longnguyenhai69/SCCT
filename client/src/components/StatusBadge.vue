<template>
  <span class="badge" :class="cls">{{ STATUS_LABEL[s] || s }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDeviceStatus, STATUS_LABEL } from '../utils'
import type { Device } from '../types'

const props = defineProps<{ device: Device }>()
const s = computed(() => getDeviceStatus(props.device))
const cls = computed(() => ({
  normal: 'b-normal', broken: 'b-broken', maintain: 'b-maintain', pending: 'b-pending'
} as Record<string, string>)[s.value] || 'b-normal')
</script>
