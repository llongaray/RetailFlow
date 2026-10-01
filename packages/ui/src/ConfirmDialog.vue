<script setup lang="ts">
import Modal from './Modal.vue';
defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>
<template>
  <Modal :open="open" :title="title" @close="emit('close')">
    <slot />
    <div class="rf-row">
      <button class="rf-button" type="button" @click="emit('close')">Cancelar</button>
      <button class="rf-button primary" type="button" @click="emit('confirm')">Confirmar</button>
    </div>
  </Modal>
</template>
