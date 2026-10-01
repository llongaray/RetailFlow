<script setup lang="ts">
defineProps<{ tone?: 'ok' | 'danger' | 'neutral' }>();
</script>
<template><span class="rf-badge" :class="tone === 'ok' ? 'ok' : tone === 'danger' ? 'danger' : ''"><slot /></span></template>
