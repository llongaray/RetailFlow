<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import type { Product } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const products = ref<Product[]>([]);
const mode = ref<'table' | 'board'>('table');
const columns = computed<KanbanColumn[]>(() =>
  ['COM_ESTOQUE', 'SEM_ESTOQUE'].map((column) => ({
    id: column,
    title: STATUS_LABEL[column] ?? column,
    cards: products.value
      .filter((product) => (column === 'COM_ESTOQUE' ? product.networkStock > 0 : product.networkStock <= 0))
      .map((product) => ({ id: product.id, title: product.name, detail: `${product.sku} · rede ${product.networkStock}` })),
  })),
);
onMounted(async () => {
  products.value = await api<Product[]>('/api/v1/products');
});
</script>

<template>
  <header class="topbar">
    <div><h1>Catálogo</h1><p>Estoque pertence à filial, não ao produto.</p></div>
    <ViewSwitch v-model="mode" storage-key="rf-view-catalog" />
  </header>
  <KanbanBoard v-if="mode === 'board'" :columns="columns" readonly />
  <section v-else class="card">
    <table class="table">
      <thead><tr><th>SKU</th><th>Produto</th><th>Preço</th><th>Rede</th><th>Filiais</th></tr></thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.sku }}</td>
          <td>{{ product.name }}</td>
          <td>{{ formatBRL(product.price) }}</td>
          <td>{{ product.networkStock }}</td>
          <td>{{ product.stock.map((item) => `${item.storeName}: ${item.quantity}`).join(' · ') }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
