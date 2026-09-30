<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import type { ColumnDef } from '@tanstack/vue-table';
import { computed, h, ref } from 'vue';
import { RouterLink } from 'vue-router';
import DataTable from '../../components/DataTable.vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import SummaryStrip from '../../components/SummaryStrip.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import type { Sale } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const mode = ref<'table' | 'board'>('table');
const statuses = ['PENDING_CREDIT', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'];
const list = useQuery({ queryKey: ['sales'], queryFn: () => api<Sale[]>('/api/v1/sales') });
const sales = computed(() => list.data.value ?? []);

const summary = computed(() => [
  { label: 'Vendas', value: String(sales.value.length) },
  { label: 'Volume', value: formatBRL(sales.value.reduce((sum, sale) => sum + sale.total, 0)) },
  { label: 'Aguardando crédito', value: String(sales.value.filter((sale) => sale.status === 'PENDING_CREDIT').length) },
  { label: 'Concluídas', value: String(sales.value.filter((sale) => sale.status === 'COMPLETED').length) },
]);

const columns: ColumnDef<Sale, unknown>[] = [
  {
    id: 'number',
    header: 'Número',
    accessorFn: (row) => row.number,
    cell: ({ row }) => h(RouterLink, { to: `/sales/${row.original.id}` }, () => `#${row.original.number}`),
  },
  { id: 'customer', header: 'Cliente', accessorFn: (row) => row.customer.name },
  { id: 'store', header: 'Loja', accessorFn: (row) => row.store.name },
  { id: 'channel', header: 'Canal', accessorFn: (row) => STATUS_LABEL[row.channel] ?? row.channel },
  { id: 'items', header: 'Itens', accessorFn: (row) => row.items.map((item) => `${item.quantity}× ${item.name}`).join(', ') },
  { id: 'total', header: 'Total', accessorFn: (row) => row.total, cell: (info) => formatBRL(info.getValue<number>()) },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => STATUS_LABEL[row.status] ?? row.status,
    cell: ({ row }) => h('span', { class: 'pill', 'data-status': row.original.status }, STATUS_LABEL[row.original.status] ?? row.original.status),
  },
];

const facet = {
  label: 'Status',
  options: statuses.map((status) => ({ value: status, label: STATUS_LABEL[status] ?? status })),
  match: (row: Sale, value: string) => row.status === value,
};

const board = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: sales.value
      .filter((sale) => sale.status === status)
      .map((sale) => ({
        id: sale.id,
        title: `#${sale.number} · ${sale.customer.name}`,
        detail: `${sale.store.name} · ${sale.items.map((item) => item.name).join(', ') || 'sem itens'} · ${formatBRL(sale.total)}`,
        href: `/sales/${sale.id}`,
      })),
  })),
);
</script>

<template>
  <header class="topbar">
    <div><h1>Vendas</h1><p>À vista, PIX, cartão ou financiadas, sempre ligadas à filial.</p></div>
    <div class="row">
      <ViewSwitch v-model="mode" storage-key="rf-view-sales" />
      <RouterLink class="btn primary" to="/sales/new">Nova venda</RouterLink>
    </div>
  </header>
  <SummaryStrip :items="summary" />
  <KanbanBoard v-if="mode === 'board'" :columns="board" readonly />
  <DataTable v-else :rows="sales" :columns="columns" :facet="facet" :loading="list.isPending.value" filename="vendas.csv" />
</template>
