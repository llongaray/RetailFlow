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
    <button class="btn icon" type="button" :aria-pressed="mode === 'table'" aria-label="Lista" title="Lista" @click="mode = 'table'">
      <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <button class="btn icon" type="button" :aria-pressed="mode === 'board'" aria-label="Quadro" title="Quadro" @click="mode = 'board'">
      <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="5" height="16" rx="1.2" />
        <rect x="10" y="4" width="5" height="10" rx="1.2" />
        <rect x="17" y="4" width="4" height="13" rx="1.2" />
      </svg>
    </button>
  </div>
</template>
