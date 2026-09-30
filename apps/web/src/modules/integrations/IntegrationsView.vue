<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import { STATUS_LABEL } from '../../utils/format';

type Job = { id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: string };
type Provider = { id: string; code: string; name: string; category: string; available: boolean };

const jobs = ref<Job[]>([]);
const providers = ref<Provider[]>([]);
const mode = ref<'table' | 'board'>('table');
const catalogMode = ref<'table' | 'board'>('table');
const statuses = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'];
const categories = ['ADS', 'IA', 'LEGADO', 'PAGAMENTO', 'FORNECEDOR'];
const columns = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: jobs.value
      .filter((job) => job.status === status)
      .map((job) => ({ id: job.id, title: job.type, detail: job.lastError || `${job.attempts} tentativas` })),
  })),
);
const catalogColumns = computed<KanbanColumn[]>(() =>
  categories.map((category) => ({
    id: category,
    title: STATUS_LABEL[category] ?? category,
    cards: providers.value
      .filter((provider) => provider.category === category)
      .map((provider) => ({
        id: provider.id,
        title: provider.name,
        detail: provider.available ? 'Disponível para ligar' : 'Indisponível',
      })),
  })),
);
onMounted(async () => {
  const [catalog, queue] = await Promise.all([
    api<Provider[]>('/api/v1/integrations/providers'),
    api<Job[]>('/api/v1/integrations/jobs'),
  ]);
  providers.value = catalog;
  jobs.value = queue;
});
</script>

<template>
  <header class="topbar">
    <div><h1>Integrações</h1><p>Catálogo de conectores e a fila que já sai para o legado. Ligar o conector fica no admin.</p></div>
  </header>
  <section class="grid">
    <div class="topbar">
      <h2>Catálogo</h2>
      <ViewSwitch v-model="catalogMode" storage-key="rf-view-providers" />
    </div>
    <KanbanBoard v-if="catalogMode === 'board'" :columns="catalogColumns" readonly />
    <article v-else class="card">
      <table class="table">
        <thead><tr><th>Nome</th><th>Categoria</th><th>Ligação</th></tr></thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.id">
            <td>{{ provider.name }}</td>
            <td>{{ STATUS_LABEL[provider.category] ?? provider.category }}</td>
            <td>{{ provider.available ? 'Disponível' : 'Indisponível' }}</td>
          </tr>
        </tbody>
      </table>
    </article>
    <div class="topbar">
      <h2>Fila</h2>
      <ViewSwitch v-model="mode" storage-key="rf-view-integrations" />
    </div>
    <KanbanBoard v-if="mode === 'board'" :columns="columns" readonly />
    <article v-else class="card">
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
    </article>
  </section>
</template>
