<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../services/http';
import type { Dashboard } from '../../types';
import { formatBRL } from '../../utils/format';

const data = ref<Dashboard | null>(null);
const source = ref('REST');

onMounted(async () => {
  const query = `query { managementDashboard { salesCount salesTotal pendingCredit openTickets lowStock delinquentInstallments stores { name salesTotal salesCount } } }`;
  try {
    const result = await api<{ data?: { managementDashboard: Dashboard } }>('/api/v1/graphql', { method: 'POST', body: JSON.stringify({ query }) });
    if (result.data?.managementDashboard) {
      data.value = result.data.managementDashboard;
      source.value = 'GraphQL';
      return;
    }
  } catch {
    source.value = 'REST';
  }
  data.value = await api<Dashboard>('/api/v1/dashboard');
});
</script>

<template>
  <header class="topbar">
    <div>
      <h1>Painel</h1>
      <p>Consolidado da rede ou da filial. Fonte: {{ source }}.</p>
    </div>
  </header>
  <section v-if="data" class="grid kpis">
    <article class="card kpi"><span>Vendas concluídas</span><strong data-testid="kpi-sales">{{ data.salesCount }}</strong></article>
    <article class="card kpi"><span>Volume</span><strong>{{ formatBRL(data.salesTotal) }}</strong></article>
    <article class="card kpi"><span>Crédito em análise</span><strong>{{ data.pendingCredit }}</strong></article>
    <article class="card kpi"><span>Inadimplência</span><strong>{{ data.delinquentInstallments }}</strong></article>
  </section>
  <section class="card" style="margin-top: 16px">
    <h2>Por loja</h2>
    <table class="table">
      <thead><tr><th>Loja</th><th>Vendas</th><th>Total</th></tr></thead>
      <tbody>
        <tr v-for="store in data?.stores ?? []" :key="store.name">
          <td>{{ store.name }}</td><td>{{ store.salesCount }}</td><td>{{ formatBRL(store.salesTotal) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!data?.stores.length" class="empty">Ainda não há vendas concluídas.</p>
    <p>Estoque baixo: {{ data?.lowStock ?? 0 }} · Atendimentos abertos: {{ data?.openTickets ?? 0 }}</p>
  </section>
</template>
