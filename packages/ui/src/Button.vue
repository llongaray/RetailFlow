<script setup lang="ts">
defineProps<{ kind?: 'primary' | 'danger' | 'neutral' }>();
</script>
<template>
  <button class="rf-button" :class="kind === 'danger' ? 'danger' : kind === 'neutral' ? '' : 'primary'" type="button"><slot /></button>
</template>
