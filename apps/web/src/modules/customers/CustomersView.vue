<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer } from '../../types';
import { formatBRL, formatCpf } from '../../utils/format';

const session = useSession();
const customers = ref<Customer[]>([]);
const query = ref('');
const form = ref({ name: '', cpf: '', phone: '' });
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
  </header>
  <section class="split">
    <form class="card grid" @submit.prevent="load">
      <label class="field">Buscar por nome ou CPF<input v-model="query" data-testid="customer-search" /></label>
      <button class="btn" type="submit">Buscar</button>
      <table class="table">
        <thead><tr><th>Nome</th><th>CPF</th><th>Limite</th></tr></thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id">
            <td>{{ customer.name }}</td><td>{{ formatCpf(customer.cpf) }}</td><td>{{ formatBRL(customer.creditLimit) }}</td>
          </tr>
        </tbody>
      </table>
    </form>
    <form v-if="session.can('customer.create')" class="card grid" @submit.prevent="create">
      <h2>Novo cliente</h2>
      <label class="field">Nome<input v-model="form.name" required /></label>
      <label class="field">CPF<input v-model="form.cpf" data-testid="customer-cpf" required /></label>
      <label class="field">Telefone<input v-model="form.phone" /></label>
      <p v-if="error">{{ error }}</p>
      <button class="btn primary" type="submit">Cadastrar</button>
    </form>
  </section>
</template>
