<script setup lang="ts">
defineProps<{ page: number; pages: number }>();
const emit = defineEmits<{ 'update:page': [number] }>();
</script>
<template>
  <div class="rf-row">
    <button class="rf-button" type="button" :disabled="page <= 1" @click="emit('update:page', page - 1)">Anterior</button>
    <span>{{ page }} / {{ pages }}</span>
    <button class="rf-button" type="button" :disabled="page >= pages" @click="emit('update:page', page + 1)">Próxima</button>
  </div>
</template>
