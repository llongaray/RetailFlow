<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import type { ColumnDef } from '@tanstack/vue-table';
import { computed, ref } from 'vue';
import DataTable from '../../components/DataTable.vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import SummaryStrip from '../../components/SummaryStrip.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import type { Product } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const mode = ref<'table' | 'board'>('table');
const list = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/api/v1/products') });
const products = computed(() => list.data.value ?? []);
const bands = ['COM_ESTOQUE', 'SEM_ESTOQUE'];

const summary = computed(() => [
  { label: 'Produtos', value: String(products.value.length) },
  { label: 'Com estoque', value: String(products.value.filter((product) => product.networkStock > 0).length) },
  { label: 'Sem estoque', value: String(products.value.filter((product) => product.networkStock <= 0).length) },
  { label: 'Unidades na rede', value: String(products.value.reduce((sum, product) => sum + product.networkStock, 0)) },
]);

const columns: ColumnDef<Product, unknown>[] = [
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'name', header: 'Produto' },
  { id: 'price', header: 'Preço', accessorFn: (row) => row.price, cell: (info) => formatBRL(info.getValue<number>()) },
  { accessorKey: 'networkStock', header: 'Rede' },
  { id: 'stores', header: 'Filiais', accessorFn: (row) => row.stock.map((item) => `${item.storeName}: ${item.quantity}`).join(' · ') },
];

const facet = {
  label: 'Estoque',
  options: bands.map((band) => ({ value: band, label: STATUS_LABEL[band] ?? band })),
  match: (row: Product, value: string) => (value === 'COM_ESTOQUE' ? row.networkStock > 0 : row.networkStock <= 0),
};

const board = computed<KanbanColumn[]>(() =>
  bands.map((column) => ({
    id: column,
    title: STATUS_LABEL[column] ?? column,
    cards: products.value
      .filter((product) => (column === 'COM_ESTOQUE' ? product.networkStock > 0 : product.networkStock <= 0))
      .map((product) => ({ id: product.id, title: product.name, detail: `${product.sku} · rede ${product.networkStock}` })),
  })),
);
</script>

<template>
  <header class="topbar">
    <div><h1>Catálogo</h1><p>Estoque pertence à filial, não ao produto.</p></div>
    <ViewSwitch v-model="mode" storage-key="rf-view-catalog" />
  </header>
  <SummaryStrip :items="summary" />
  <KanbanBoard v-if="mode === 'board'" :columns="board" readonly />
  <DataTable v-else :rows="products" :columns="columns" :facet="facet" :loading="list.isPending.value" filename="catalogo.csv" />
</template>
