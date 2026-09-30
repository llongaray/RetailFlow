<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import type { Sale } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const sales = ref<Sale[]>([]);
const mode = ref<'table' | 'board'>('table');
const statuses = ['PENDING_CREDIT', 'COMPLETED', 'CANCELLED'];
const columns = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: sales.value
      .filter((sale) => sale.status === status)
      .map((sale) => ({
        id: sale.id,
        title: `#${sale.number} · ${sale.customer.name}`,
        detail: formatBRL(sale.total),
        href: `/sales/${sale.id}`,
      })),
  })),
);
onMounted(async () => {
  sales.value = await api<Sale[]>('/api/v1/sales');
});
</script>

<template>
  <header class="topbar">
    <div><h1>Vendas</h1><p>À vista ou financiadas, sempre ligadas à filial.</p></div>
    <div class="row">
      <ViewSwitch v-model="mode" storage-key="rf-view-sales" />
      <RouterLink class="btn primary" to="/sales/new">Nova venda</RouterLink>
    </div>
  </header>
  <KanbanBoard v-if="mode === 'board'" :columns="columns" readonly />
  <section v-else class="card">
    <table class="table">
      <thead><tr><th>Número</th><th>Cliente</th><th>Loja</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        <tr v-for="sale in sales" :key="sale.id">
          <td><RouterLink :to="`/sales/${sale.id}`">#{{ sale.number }}</RouterLink></td>
          <td>{{ sale.customer.name }}</td>
          <td>{{ sale.store.name }}</td>
          <td>{{ formatBRL(sale.total) }}</td>
          <td><span class="pill" :data-status="sale.status">{{ STATUS_LABEL[sale.status] ?? sale.status }}</span></td>
        </tr>
      </tbody>
    </table>
    <p v-if="!sales.length" class="empty">Nenhuma venda registrada.</p>
  </section>
</template>
