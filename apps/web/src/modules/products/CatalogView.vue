<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../services/http';
import type { Product } from '../../types';
import { formatBRL } from '../../utils/format';

const products = ref<Product[]>([]);
onMounted(async () => {
  products.value = await api<Product[]>('/api/v1/products');
});
</script>

<template>
  <header class="topbar"><div><h1>Catálogo</h1><p>Estoque pertence à filial, não ao produto.</p></div></header>
  <section class="card">
    <table class="table">
      <thead><tr><th>SKU</th><th>Produto</th><th>Preço</th><th>Filiais</th></tr></thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.sku }}</td>
          <td>{{ product.name }}</td>
          <td>{{ formatBRL(product.price) }}</td>
          <td>{{ product.stock.map((item) => `${item.storeName}: ${item.quantity}`).join(' · ') }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
