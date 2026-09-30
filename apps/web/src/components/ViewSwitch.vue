<script setup lang="ts">
import { onMounted, watch } from 'vue';

const props = defineProps<{ storageKey: string }>();
const mode = defineModel<'table' | 'board'>({ required: true });

onMounted(() => {
  const saved = localStorage.getItem(props.storageKey);
  if (saved === 'table' || saved === 'board') mode.value = saved;
});

watch(mode, (value) => localStorage.setItem(props.storageKey, value));
</script>

<template>
  <div class="view-switch" role="group" aria-label="Modo de visualização">
    <button class="btn" type="button" :aria-pressed="mode === 'table'" @click="mode = 'table'" title="Tabela">Lista</button>
    <button class="btn" type="button" :aria-pressed="mode === 'board'" @click="mode = 'board'" title="Quadro">Quadro</button>
  </div>
</template>
