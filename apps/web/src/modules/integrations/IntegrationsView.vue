<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import { formatDate, STATUS_LABEL } from '../../utils/format';

type Job = { id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: string };
type Provider = { id: string; code: string; name: string; category: string; available: boolean; enabled?: boolean };

type Shop = {
  mode: string;
  connected: boolean;
  storeName: string | null;
  nuvemshopStoreId: string | null;
  domain: string | null;
  lastSyncAt: string | null;
  localStoreName: string | null;
};
type SideStatus = { mode: string; ready: boolean };

const session = useSession();
const jobs = ref<Job[]>([]);
const providers = ref<Provider[]>([]);
const shop = ref<Shop | null>(null);
const billing = ref<SideStatus | null>(null);
const fiscal = ref<SideStatus | null>(null);
const notice = ref('');
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
        detail: `${provider.available ? 'Disponível' : 'Indisponível'}${provider.enabled ? ' · ligado' : ''}`,
      })),
  })),
);
async function loadShop() {
  const [connection, pay, note, catalog, queue] = await Promise.all([
    api<Shop>('/api/v1/integrations/nuvemshop'),
    api<SideStatus>('/api/v1/billing/status'),
    api<SideStatus>('/api/v1/fiscal/status'),
    api<Provider[]>('/api/v1/integrations/providers'),
    api<Job[]>('/api/v1/integrations/jobs'),
  ]);
  shop.value = connection;
  billing.value = pay;
  fiscal.value = note;
  providers.value = catalog;
  jobs.value = queue;
}

async function connectShop() {
  notice.value = '';
  try {
    const result = await api<{ mode: string; url?: string; connected?: boolean }>('/api/v1/integrations/nuvemshop/connect', { method: 'POST', body: '{}' });
    if (result.url) {
      window.location.assign(result.url);
      return;
    }
    session.notify('Loja de demonstração conectada.');
    await loadShop();
  } catch (cause) {
    notice.value = cause instanceof ApiError ? cause.message : 'Falha ao conectar.';
  }
}

async function syncShop() {
  notice.value = '';
  try {
    const result = await api<{ imported: number; skipped: number }>('/api/v1/integrations/nuvemshop/sync', { method: 'POST', body: '{}' });
    session.notify(result.imported > 0 ? 'Pedidos novos importados.' : 'Nenhum pedido novo.');
    await loadShop();
  } catch (cause) {
    notice.value = cause instanceof ApiError ? cause.message : 'Falha ao sincronizar.';
  }
}

async function disconnectShop() {
  notice.value = '';
  await api('/api/v1/integrations/nuvemshop/disconnect', { method: 'POST', body: '{}' });
  session.notify('Loja desconectada.');
  await loadShop();
}

onMounted(loadShop);
</script>

<template>
  <header class="topbar">
    <div><h1>Integrações</h1><p>A Nuvemshop entra pela loja. Cobrança e fiscal mostram o que o ambiente já permite abrir.</p></div>
  </header>
  <section class="grid">
    <article class="card">
      <h2>Nuvemshop</h2>
      <p v-if="shop?.connected" data-testid="nuvemshop-store">{{ shop.storeName }} · {{ shop.nuvemshopStoreId }} · {{ shop.localStoreName }}</p>
      <p v-else>Nenhuma loja conectada. O modo atual é {{ shop?.mode === 'live' ? 'ao vivo' : 'demonstração' }}.</p>
      <p>{{ shop?.domain || 'Sem domínio' }} · {{ shop?.lastSyncAt ? `Última sincronização ${formatDate(shop.lastSyncAt)}` : 'Ainda não sincronizou' }}</p>
      <p v-if="notice">{{ notice }}</p>
      <div class="row">
        <button v-if="!shop?.connected" class="btn primary" data-testid="nuvemshop-connect" type="button" @click="connectShop">Conectar</button>
        <button v-if="shop?.connected" class="btn" data-testid="nuvemshop-sync" type="button" @click="syncShop">Sincronizar agora</button>
        <button v-if="shop?.connected" class="btn" type="button" @click="disconnectShop">Desconectar</button>
      </div>
    </article>
    <article class="card">
      <h2>Cobrança</h2>
      <p>{{ billing?.ready ? 'Mercado Pago com chaves guardadas.' : 'Mercado Pago em demonstração, sem chave da loja.' }}</p>
      <p>Quem tem financeiro abre a cobrança no cliente.</p>
      <RouterLink to="/customers">Abrir clientes</RouterLink>
    </article>
    <article class="card">
      <h2>Fiscal</h2>
      <p>{{ fiscal?.ready ? 'Perfil fiscal cadastrado.' : 'Perfil fiscal ainda não cadastrado.' }}</p>
      <p>A nota abre na venda. NF-e e NFS-e não se misturam.</p>
      <RouterLink to="/sales">Abrir vendas</RouterLink>
    </article>
    <div class="topbar">
      <h2>Catálogo</h2>
      <ViewSwitch v-model="catalogMode" storage-key="rf-view-providers" />
    </div>
    <KanbanBoard v-if="catalogMode === 'board'" :columns="catalogColumns" readonly />
    <article v-else class="card">
      <table class="table">
        <thead><tr><th>Nome</th><th>Categoria</th><th>Ligação</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.id">
            <td>{{ provider.name }}</td>
            <td>{{ STATUS_LABEL[provider.category] ?? provider.category }}</td>
            <td>{{ provider.available ? 'Disponível' : 'Indisponível' }}</td>
            <td>{{ provider.enabled ? 'Ligado' : 'Desligado' }}</td>
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
