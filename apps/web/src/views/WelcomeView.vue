<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../services/http';

const company = ref<{ name: string; logoSquare: string | null } | null>(null);

onMounted(async () => {
  try {
    company.value = await api('/api/v1/company');
  } catch {
    company.value = null;
  }
});
</script>

<template>
  <header class="topbar">
    <div>
      <h1>Boas-vindas</h1>
      <p>Atalho fora das categorias do menu.</p>
    </div>
  </header>
  <section class="card welcome">
    <img v-if="company?.logoSquare" :src="company.logoSquare" alt="Logo da empresa" />
    <h2>{{ company?.name || 'RetailFlow' }}</h2>
    <p>Venda, crédito e estoque na mesma filial.</p>
  </section>
</template>
