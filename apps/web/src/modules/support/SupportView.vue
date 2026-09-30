<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import Modal from '../../components/Modal.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer, Ticket } from '../../types';
import { STATUS_LABEL } from '../../utils/format';

const session = useSession();
const tickets = ref<Ticket[]>([]);
const customers = ref<Customer[]>([]);
const form = ref({ customerId: '', subject: '', description: '' });
const createOpen = ref(false);
const mode = ref<'table' | 'board'>('table');
const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const columns = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: tickets.value
      .filter((ticket) => ticket.status === status)
      .map((ticket) => ({ id: ticket.id, title: ticket.subject, detail: ticket.customerName })),
  })),
);

async function load() {
  tickets.value = await api<Ticket[]>('/api/v1/support/tickets');
  if (session.can('support.write')) customers.value = await api<Customer[]>('/api/v1/customers');
}

async function create() {
  await api('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify(form.value) });
  form.value = { customerId: '', subject: '', description: '' };
  createOpen.value = false;
  session.notify('Atendimento aberto.');
  await load();
}

async function move(id: string, status: string) {
  await api(`/api/v1/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  await load();
}

async function drop(payload: { id: string; from: string; to: string }) {
  const legal =
    (payload.from === 'OPEN' && (payload.to === 'IN_PROGRESS' || payload.to === 'RESOLVED')) ||
    (payload.from === 'IN_PROGRESS' && payload.to === 'RESOLVED');
  if (!legal) {
    session.notify('Esse movimento não é permitido.', 'error');
    await load();
    return;
  }
  await move(payload.id, payload.to);
}

onMounted(load);
</script>

<template>
  <header class="topbar">
    <div><h1>Atendimento</h1><p>Histórico fica ligado ao cliente.</p></div>
    <div class="row">
      <ViewSwitch v-model="mode" storage-key="rf-view-support" />
      <button v-if="session.can('support.write')" class="btn primary" type="button" @click="createOpen = true">Novo ticket</button>
    </div>
  </header>
  <KanbanBoard v-if="mode === 'board'" :columns="columns" @move="drop" />
  <article v-else class="card">
    <table class="table">
      <thead><tr><th>Cliente</th><th>Assunto</th><th>Status</th><th></th></tr></thead>
      <tbody>
        <tr v-for="ticket in tickets" :key="ticket.id" v-motion :hovered="{ backgroundColor: 'var(--row-hover)' }">
          <td>{{ ticket.customerName }}</td>
          <td>{{ ticket.subject }}</td>
          <td><span class="pill" :data-status="ticket.status">{{ STATUS_LABEL[ticket.status] }}</span></td>
          <td>
            <button v-if="session.can('support.write') && ticket.status !== 'RESOLVED'" class="btn" type="button" @click="move(ticket.id, 'RESOLVED')">Resolver</button>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
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
