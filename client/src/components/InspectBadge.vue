<template>
  <span v-if="info" :style="style">{{ info.label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { inspectStatus } from '../utils'

const props = defineProps<{ date?: string | null }>()
const info = computed(() => inspectStatus(props.date))
const PALETTE: Record<string, any> = {
  red:    { background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' },
  yellow: { background: '#fef9c3', color: '#a16207', border: '1px solid rgba(161,98,7,.2)' },
  green:  { background: '#dcfce7', color: '#15803d', border: '1px solid rgba(21,128,61,.2)' },
}
const style = computed(() => ({
  ...PALETTE[info.value!.color],
  fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', display: 'inline-block'
}))
</script>
