<template>
  <div class="stat-card" :style="{ borderLeftColor: color }">
    <div class="stat-val">{{ val }}</div>
    <div class="stat-lbl">{{ label }}</div>
    <div class="stat-sub">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ val: string | number; label: string; sub?: string; color: string }>()
</script>
