<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer } from '../../types';
import { formatBRL, formatCpf } from '../../utils/format';

const session = useSession();
const customers = ref<Customer[]>([]);
const query = ref('');
const form = ref({ name: '', cpf: '', phone: '' });
const createOpen = ref(false);
const error = ref('');

async function load() {
  const suffix = query.value ? `?q=${encodeURIComponent(query.value)}` : '';
  customers.value = await api<Customer[]>(`/api/v1/customers${suffix}`);
}

async function create() {
  error.value = '';
  try {
    await api('/api/v1/customers', { method: 'POST', body: JSON.stringify(form.value) });
    form.value = { name: '', cpf: '', phone: '' };
    createOpen.value = false;
    session.notify('Cliente cadastrado.');
    await load();
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao cadastrar.';
  }
}

onMounted(load);
</script>

<template>
  <header class="topbar">
    <div><h1>Clientes</h1><p>O CPF identifica um único cliente.</p></div>
    <button v-if="session.can('customer.create')" class="btn primary" type="button" @click="createOpen = true">Novo cliente</button>
  </header>
  <section class="card grid">
    <form class="row" @submit.prevent="load">
      <label class="field">Buscar por nome ou CPF<input v-model="query" data-testid="customer-search" /></label>
      <button class="btn" type="submit">Buscar</button>
    </form>
    <table class="table">
      <thead><tr><th>Nome</th><th>CPF</th><th>Limite</th></tr></thead>
      <tbody>
        <tr v-for="customer in customers" :key="customer.id" v-motion :hovered="{ backgroundColor: 'var(--row-hover)' }">
          <td>{{ customer.name }}</td><td>{{ formatCpf(customer.cpf) }}</td><td>{{ formatBRL(customer.creditLimit) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
  <Modal v-model="createOpen">
    <form class="grid" @submit.prevent="create">
      <h2>Novo cliente</h2>
      <label class="field">Nome<input v-model="form.name" required /></label>
      <label class="field">CPF<input v-model="form.cpf" data-testid="customer-cpf" required /></label>
      <label class="field">Telefone<input v-model="form.phone" /></label>
      <p v-if="error">{{ error }}</p>
      <div class="row">
        <button class="btn" type="button" @click="createOpen = false">Voltar</button>
        <button class="btn primary" type="submit">Cadastrar</button>
      </div>
    </form>
  </Modal>
</template>
