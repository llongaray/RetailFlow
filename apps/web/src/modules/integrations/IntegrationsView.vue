<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import { STATUS_LABEL } from '../../utils/format';

type Job = { id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: string };
const jobs = ref<Job[]>([]);
const mode = ref<'table' | 'board'>('table');
const statuses = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'];
const columns = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: jobs.value
      .filter((job) => job.status === status)
      .map((job) => ({ id: job.id, title: job.type, detail: job.lastError || `${job.attempts} tentativas` })),
  })),
);
onMounted(async () => {
  jobs.value = await api<Job[]>('/api/v1/integrations/jobs');
});
</script>

<template>
  <header class="topbar">
    <div><h1>Integrações</h1><p>Fila de saída para o legado Oracle. O mock registra o evento sem segurar a venda.</p></div>
    <ViewSwitch v-model="mode" storage-key="rf-view-integrations" />
  </header>
  <KanbanBoard v-if="mode === 'board'" :columns="columns" readonly />
  <section v-else class="card">
    <table class="table">
      <thead><tr><th>Tipo</th><th>Status</th><th>Tentativas</th><th>Erro</th></tr></thead>
      <tbody>
        <tr v-for="job in jobs" :key="job.id">
          <td>{{ job.type }}</td>
          <td><span class="pill" :data-status="job.status">{{ STATUS_LABEL[job.status] ?? job.status }}</span></td>
          <td>{{ job.attempts }}</td>
          <td>{{ job.lastError }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!jobs.length" class="empty">Nenhuma pendência. Uma venda nova gera um job.</p>
  </section>
</template>
