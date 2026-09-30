<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { ColumnDef } from '@tanstack/vue-table';
import { computed, h, ref } from 'vue';
import DataTable from '../../components/DataTable.vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import Modal from '../../components/Modal.vue';
import SummaryStrip from '../../components/SummaryStrip.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer, Ticket } from '../../types';
import { STATUS_LABEL } from '../../utils/format';

const session = useSession();
const queryClient = useQueryClient();
const form = ref({ customerId: '', subject: '', description: '' });
const createOpen = ref(false);
const mode = ref<'table' | 'board'>('table');
const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const list = useQuery({ queryKey: ['tickets'], queryFn: () => api<Ticket[]>('/api/v1/support/tickets') });
const people = useQuery({
  queryKey: ['customers', ''],
  queryFn: () => api<Customer[]>('/api/v1/customers'),
  enabled: computed(() => session.can('support.write')),
});
const tickets = computed(() => list.data.value ?? []);
const customers = computed(() => people.data.value ?? []);

const summary = computed(() => [
  { label: 'Tickets', value: String(tickets.value.length) },
  { label: 'Em aberto', value: String(tickets.value.filter((ticket) => ticket.status === 'OPEN').length) },
  { label: 'Em atendimento', value: String(tickets.value.filter((ticket) => ticket.status === 'IN_PROGRESS').length) },
  { label: 'Resolvidos', value: String(tickets.value.filter((ticket) => ticket.status === 'RESOLVED').length) },
]);

const columns: ColumnDef<Ticket, unknown>[] = [
  { accessorKey: 'customerName', header: 'Cliente' },
  { id: 'phone', header: 'Telefone', accessorFn: (row) => row.phone || '—' },
  { accessorKey: 'subject', header: 'Assunto' },
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
  match: (row: Ticket, value: string) => row.status === value,
};

const board = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: tickets.value
      .filter((ticket) => ticket.status === status)
      .map((ticket) => ({ id: ticket.id, title: ticket.subject, detail: `${ticket.customerName}${ticket.phone ? ` · ${ticket.phone}` : ''}` })),
  })),
);

async function refresh() {
  await queryClient.invalidateQueries({ queryKey: ['tickets'] });
}

async function create() {
  await api('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify(form.value) });
  form.value = { customerId: '', subject: '', description: '' };
  createOpen.value = false;
  session.notify('Atendimento aberto.');
  await refresh();
}

async function move(id: string, status: string) {
  await api(`/api/v1/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  await refresh();
}

async function drop(payload: { id: string; from: string; to: string }) {
  const legal =
    (payload.from === 'OPEN' && (payload.to === 'IN_PROGRESS' || payload.to === 'RESOLVED')) ||
    (payload.from === 'IN_PROGRESS' && payload.to === 'RESOLVED');
  if (!legal) {
    session.notify('Esse movimento não é permitido.', 'error');
    await refresh();
    return;
  }
  await move(payload.id, payload.to);
}
</script>

<template>
  <header class="topbar">
    <div><h1>Atendimento</h1><p>Histórico fica ligado ao cliente.</p></div>
    <div class="row">
      <ViewSwitch v-model="mode" storage-key="rf-view-support" />
      <button v-if="session.can('support.write')" class="btn primary" type="button" @click="createOpen = true">Novo ticket</button>
    </div>
  </header>
  <SummaryStrip :items="summary" />
  <KanbanBoard v-if="mode === 'board'" :columns="board" @move="drop" />
  <DataTable v-else :rows="tickets" :columns="columns" :facet="facet" :loading="list.isPending.value" filename="atendimento.csv">
    <template #actions="{ row }">
      <button v-if="session.can('support.write') && row.status !== 'RESOLVED'" class="btn" type="button" @click="move(row.id, 'RESOLVED')">Resolver</button>
    </template>
  </DataTable>
  <Modal v-model="createOpen">
    <form class="grid" @submit.prevent="create">
      <h2>Novo ticket</h2>
      <label class="field">Cliente
        <select v-model="form.customerId" required>
          <option disabled value="">Selecione</option>
          <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
        </select>
      </label>
      <label class="field">Assunto<input v-model="form.subject" required /></label>
      <label class="field">Descrição<textarea v-model="form.description" required /></label>
      <div class="row">
        <button class="btn" type="button" @click="createOpen = false">Voltar</button>
        <button class="btn primary" type="submit">Abrir</button>
      </div>
    </form>
  </Modal>
</template>
