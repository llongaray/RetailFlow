<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

const open = defineModel<boolean>({ required: true });

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false;
}

function backdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) open.value = false;
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div v-if="open" class="modal-back" @click="backdrop">
    <div class="modal" role="dialog" aria-modal="true" @click.stop>
      <slot />
    </div>
  </div>
</template>
