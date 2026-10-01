<script setup lang="ts">
defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
  <Teleport to="body">
    <aside v-if="open" class="rf-drawer" :aria-label="title">
      <header class="rf-row"><h2>{{ title }}</h2><button class="rf-button" type="button" @click="emit('close')">Fechar</button></header>
      <slot />
    </aside>
  </Teleport>
</template>
