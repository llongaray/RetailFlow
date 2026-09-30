<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../services/http';
import { formatDate } from '../../utils/format';

type Row = { id: string; action: string; entity: string; entityId: string; oldValue: string | null; newValue: string | null; userName: string; createdAt: string };
const rows = ref<Row[]>([]);
onMounted(async () => {
  rows.value = await api<Row[]>('/api/v1/audit');
});
</script>

<template>
  <header class="topbar"><div><h1>Auditoria</h1><p>Alterações sensíveis ficam com autor, valor anterior e novo.</p></div></header>
  <section class="card">
    <table class="table">
      <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Depois</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ formatDate(row.createdAt) }}</td>
          <td>{{ row.userName }}</td>
          <td>{{ row.action }} · {{ row.entity }}</td>
          <td>{{ row.newValue }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!rows.length" class="empty">Nenhum evento auditado ainda.</p>
  </section>
</template>
