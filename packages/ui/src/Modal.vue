<script setup lang="ts">
defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="rf-modal" @click.self="emit('close')">
      <div class="rf-dialog" role="dialog" :aria-label="title">
        <h2>{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
