<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';

defineProps<{ wide?: boolean }>();
const open = defineModel<boolean>({ required: true });

onKeyStroke('Escape', () => {
  if (open.value) open.value = false;
});

function backdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) open.value = false;
}
</script>

<template>
  <div v-if="open" class="modal-back" @click="backdrop">
    <div
      class="modal"
      :class="{ wide }"
      role="dialog"
      aria-modal="true"
      v-motion
      :initial="{ opacity: 0, y: 16 }"
      :enter="{ opacity: 1, y: 0 }"
      @click.stop
    >
      <slot />
    </div>
  </div>
</template>
