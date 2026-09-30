<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer, Ticket } from '../../types';
import { STATUS_LABEL } from '../../utils/format';

const session = useSession();
const tickets = ref<Ticket[]>([]);
const customers = ref<Customer[]>([]);
const form = ref({ customerId: '', subject: '', description: '' });

async function load() {
  tickets.value = await api<Ticket[]>('/api/v1/support/tickets');
  if (session.can('support.write')) customers.value = await api<Customer[]>('/api/v1/customers');
}

async function create() {
  await api('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify(form.value) });
  form.value = { customerId: '', subject: '', description: '' };
  session.notify('Atendimento aberto.');
  await load();
}

async function move(id: string, status: string) {
  await api(`/api/v1/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  await load();
}

onMounted(load);
</script>

<template>
  <header class="topbar"><div><h1>Atendimento</h1><p>Histórico fica ligado ao cliente.</p></div></header>
  <section class="split">
    <article class="card">
      <table class="table">
        <thead><tr><th>Cliente</th><th>Assunto</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="ticket in tickets" :key="ticket.id">
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
    <form v-if="session.can('support.write')" class="card grid" @submit.prevent="create">
      <h2>Novo ticket</h2>
      <label class="field">Cliente
        <select v-model="form.customerId" required>
          <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
        </select>
      </label>
      <label class="field">Assunto<input v-model="form.subject" required /></label>
      <label class="field">Descrição<textarea v-model="form.description" required /></label>
      <button class="btn primary" type="submit">Abrir</button>
    </form>
  </section>
</template>
