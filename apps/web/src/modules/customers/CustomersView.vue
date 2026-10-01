<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { ColumnDef } from '@tanstack/vue-table';
import { toTypedSchema } from '@vee-validate/zod';
import { Eye } from 'lucide-vue-next';
import { useForm } from 'vee-validate';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import DataTable from '../../components/DataTable.vue';
import ExtensionSlot from '../../components/ExtensionSlot.vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import Modal from '../../components/Modal.vue';
import SummaryStrip from '../../components/SummaryStrip.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer } from '../../types';
import { formatBRL, formatCpf, formatDate, STATUS_LABEL } from '../../utils/format';

type CustomerSale = { id: string; number: number; status: string; channel: string; externalOrderId: string | null; total: number; storeName: string; createdAt: string };
type CustomerFile = Customer & {
  tickets: { id: string; subject: string; status: string; createdAt: string }[];
  sales: CustomerSale[];
  externalOrders: CustomerSale[];
  charges: { id: string; amount: number; method: string; status: string; copyPaste: string | null; createdAt: string }[];
};

const session = useSession();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const draft = ref(typeof route.query.q === 'string' ? route.query.q : '');
const term = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''));
const list = useQuery({
  queryKey: computed(() => ['customers', term.value]),
  queryFn: () => api<Customer[]>(`/api/v1/customers${term.value ? `?q=${encodeURIComponent(term.value)}` : ''}`),
});
const customers = computed(() => list.data.value ?? []);
const mode = ref<'table' | 'board'>('table');
const createOpen = ref(false);
const detailOpen = ref(false);
const chargeOpen = ref(false);
const chargeAmount = ref(0);
const chargeCopy = ref('');
const detail = ref<CustomerFile | null>(null);
const error = ref('');
const stages = ['LEAD', 'ATIVO', 'INADIMPLENTE', 'INATIVO'];

const summary = computed(() => {
  const now = new Date();
  const fresh = customers.value.filter((customer) => {
    const created = new Date(customer.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;
  return [
    { label: 'Total', value: String(customers.value.length) },
    { label: 'Ativos', value: String(customers.value.filter((customer) => customer.stage === 'ATIVO').length) },
    { label: 'Inadimplentes', value: String(customers.value.filter((customer) => customer.stage === 'INADIMPLENTE').length) },
    { label: 'Limite somado', value: formatBRL(customers.value.reduce((sum, customer) => sum + customer.creditLimit, 0)) },
    { label: 'Novos no mês', value: String(fresh) },
  ];
});

const columns: ColumnDef<Customer, unknown>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { id: 'cpf', header: 'CPF', accessorFn: (row) => formatCpf(row.cpf) },
  { id: 'source', header: 'Origem', accessorFn: (row) => STATUS_LABEL[row.source] ?? row.source },
  { id: 'stage', header: 'Etapa', accessorFn: (row) => STATUS_LABEL[row.stage] ?? row.stage },
  { id: 'creditLimit', header: 'Limite', accessorFn: (row) => row.creditLimit, cell: (info) => formatBRL(info.getValue<number>()) },
  {
    id: 'lastPurchase',
    header: 'Última compra',
    accessorFn: (row) => (row.lastPurchase ? `#${row.lastPurchase.number} · ${formatBRL(row.lastPurchase.total)}` : '—'),
  },
  { id: 'proposalCount', header: 'Propostas', accessorFn: (row) => row.proposalCount ?? 0 },
  { id: 'openTickets', header: 'Tickets', accessorFn: (row) => row.openTickets ?? 0 },
];

const facet = {
  label: 'Etapa',
  options: stages.map((stage) => ({ value: stage, label: STATUS_LABEL[stage] ?? stage })),
  match: (row: Customer, value: string) => (row.stage || 'ATIVO') === value,
};

const columnsBoard = computed<KanbanColumn[]>(() =>
  stages.map((stage) => ({
    id: stage,
    title: STATUS_LABEL[stage] ?? stage,
    cards: customers.value
      .filter((customer) => (customer.stage || 'ATIVO') === stage)
      .map((customer) => ({
        id: customer.id,
        title: customer.name,
        detail: `${formatCpf(customer.cpf)} · ${customer.openTickets ?? 0} tickets · ${customer.lastPurchase ? `compra #${customer.lastPurchase.number}` : 'sem compra'}`,
      })),
  })),
);

const schema = toTypedSchema(
  z.object({
    name: z.string().trim().min(1, 'Informe o nome.'),
    cpf: z.string().trim().min(11, 'Informe o CPF.'),
    phone: z.string(),
  }),
);
const { handleSubmit, errors, defineField, resetForm } = useForm({
  validationSchema: schema,
  initialValues: { name: '', cpf: '', phone: '' },
});
const [name, nameAttrs] = defineField('name');
const [cpf, cpfAttrs] = defineField('cpf');
const [phone, phoneAttrs] = defineField('phone');

function search() {
  const next = draft.value.trim();
  if (next === term.value) {
    list.refetch();
    return;
  }
  router.push({ path: '/customers', query: next ? { q: next } : {} });
}

async function move(payload: { id: string; to: string }) {
  try {
    await api(`/api/v1/customers/${payload.id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage: payload.to }) });
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  } catch (cause) {
    session.notify(cause instanceof ApiError ? cause.message : 'Não foi possível mover o cliente.', 'error');
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  }
}

async function openDetail(id: string) {
  detail.value = await queryClient.fetchQuery({
    queryKey: ['customer', id],
    queryFn: () => api<CustomerFile>(`/api/v1/customers/${id}`),
  });
  detailOpen.value = true;
}

function openCharge() {
  const waiting = detail.value?.sales.find((sale) => sale.status === 'AWAITING_PAYMENT');
  chargeAmount.value = waiting?.total ?? 0;
  chargeCopy.value = '';
  error.value = '';
  chargeOpen.value = true;
}

async function createCharge() {
  if (!detail.value) return;
  error.value = '';
  try {
    const waiting = detail.value.sales.find((sale) => sale.status === 'AWAITING_PAYMENT');
    const charge = await api<{ copyPaste: string | null }>('/api/v1/charges', {
      method: 'POST',
      body: JSON.stringify({
        customerId: detail.value.id,
        saleId: waiting?.id,
        amount: chargeAmount.value,
        method: 'PIX',
      }),
    });
    chargeCopy.value = charge.copyPaste ?? '';
    session.notify('Cobrança PIX gerada.');
    await queryClient.invalidateQueries({ queryKey: ['customer', detail.value.id] });
    detail.value = await api<CustomerFile>(`/api/v1/customers/${detail.value.id}`);
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao gerar a cobrança.';
  }
}

const create = handleSubmit(async (values) => {
  error.value = '';
  try {
    await api('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify({ name: values.name, cpf: values.cpf, phone: values.phone }),
    });
    resetForm();
    createOpen.value = false;
    session.notify('Cliente cadastrado.');
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao cadastrar.';
  }
});

watch(createOpen, (open) => {
  if (open) {
    error.value = '';
    resetForm();
  }
});
</script>

<template>
  <header class="topbar">
    <div><h1>Clientes</h1><p>O CPF identifica um único cliente.</p></div>
    <div class="row">
      <ViewSwitch v-model="mode" storage-key="rf-view-customers" />
      <button v-if="session.can('customer.create')" class="btn primary" type="button" @click="createOpen = true">Novo cliente</button>
    </div>
  </header>
  <ExtensionSlot name="customer.details.tabs" />
  <SummaryStrip :items="summary" />
  <KanbanBoard v-if="mode === 'board'" :columns="columnsBoard" @move="move" />
  <template v-else>
    <form class="row" style="margin-bottom: 16px" @submit.prevent="search">
      <label class="field">Buscar por nome ou CPF<input v-model="draft" data-testid="customer-search" /></label>
      <button class="btn" type="submit">Buscar</button>
    </form>
    <DataTable :rows="customers" :columns="columns" :facet="facet" :loading="list.isPending.value" filename="clientes.csv">
      <template #actions="{ row }">
        <button class="btn icon" type="button" aria-label="Ver cliente" title="Ver cliente" @click="openDetail(row.id)">
          <Eye class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </template>
    </DataTable>
  </template>
  <Modal v-model="createOpen">
    <form class="grid" @submit.prevent="create">
      <h2>Novo cliente</h2>
      <label class="field">Nome
        <input v-model="name" v-bind="nameAttrs" />
        <small v-if="errors.name" class="hint">{{ errors.name }}</small>
      </label>
      <label class="field">CPF
        <input v-model="cpf" v-bind="cpfAttrs" data-testid="customer-cpf" />
        <small v-if="errors.cpf" class="hint">{{ errors.cpf }}</small>
      </label>
      <label class="field">Telefone
        <input v-model="phone" v-bind="phoneAttrs" />
      </label>
      <p v-if="error" class="hint">{{ error }}</p>
      <div class="row">
        <button class="btn" type="button" @click="createOpen = false">Voltar</button>
        <button class="btn primary" type="submit">Cadastrar</button>
      </div>
    </form>
  </Modal>
  <Modal v-model="chargeOpen">
    <form class="grid" @submit.prevent="createCharge">
      <h2>Nova cobrança</h2>
      <label class="field">Valor PIX<input v-model.number="chargeAmount" type="number" min="0.01" step="0.01" required /></label>
      <p v-if="chargeCopy">Copia-e-cola: {{ chargeCopy }}</p>
      <p v-if="error && chargeOpen">{{ error }}</p>
      <div class="row">
        <button class="btn" type="button" @click="chargeOpen = false">Voltar</button>
        <button class="btn primary" type="submit">Gerar PIX</button>
      </div>
    </form>
  </Modal>
  <Modal v-model="detailOpen" wide>
    <div v-if="detail" class="grid">
      <h2>{{ detail.name }}</h2>
      <p>{{ formatCpf(detail.cpf) }} · {{ STATUS_LABEL[detail.source] ?? detail.source }} · {{ STATUS_LABEL[detail.stage] ?? detail.stage }} · limite {{ formatBRL(detail.creditLimit) }}</p>
      <div v-if="session.can('payment.create')" class="row">
        <button class="btn" type="button" @click="openCharge">Nova cobrança</button>
      </div>
      <section>
        <h2>Pedidos externos</h2>
        <p v-if="!detail.externalOrders.length" class="empty">Nenhum pedido de canal externo.</p>
        <table v-else class="table">
          <thead><tr><th>Número</th><th>Pedido</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="sale in detail.externalOrders" :key="sale.id">
              <td><RouterLink :to="`/sales/${sale.id}`">#{{ sale.number }}</RouterLink></td>
              <td>{{ sale.externalOrderId }}</td>
              <td>{{ formatBRL(sale.total) }}</td>
              <td>{{ STATUS_LABEL[sale.status] ?? sale.status }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-if="detail.charges.length">
        <h2>Cobranças</h2>
        <p v-for="charge in detail.charges" :key="charge.id">{{ charge.method }} · {{ formatBRL(charge.amount) }} · {{ STATUS_LABEL[charge.status] ?? charge.status }}</p>
      </section>
      <section>
        <h2>Compras</h2>
        <p v-if="!detail.sales.length" class="empty">Nenhuma compra neste recorte.</p>
        <table v-else class="table">
          <thead><tr><th>Número</th><th>Loja</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            <tr v-for="sale in detail.sales" :key="sale.id">
              <td><RouterLink :to="`/sales/${sale.id}`">#{{ sale.number }}</RouterLink></td>
              <td>{{ sale.storeName }}</td>
              <td>{{ formatBRL(sale.total) }}</td>
              <td>{{ STATUS_LABEL[sale.status] ?? sale.status }}</td>
              <td>{{ formatDate(sale.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2>Tickets</h2>
        <p v-if="!detail.tickets.length" class="empty">Nenhum ticket neste recorte.</p>
        <table v-else class="table">
          <thead><tr><th>Assunto</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            <tr v-for="ticket in detail.tickets" :key="ticket.id">
              <td>{{ ticket.subject }}</td>
              <td>{{ STATUS_LABEL[ticket.status] ?? ticket.status }}</td>
              <td>{{ formatDate(ticket.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <button class="btn" type="button" @click="detailOpen = false">Voltar</button>
    </div>
  </Modal>
</template>
