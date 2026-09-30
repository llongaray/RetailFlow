<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Sale } from '../../types';
import { formatBRL, formatDate, STATUS_LABEL } from '../../utils/format';

const route = useRoute();
const session = useSession();
const sale = ref<Sale | null>(null);
const reason = ref('');
const externalId = ref('');
const cancelOpen = ref(false);
const error = ref('');

async function load() {
  sale.value = await api<Sale>(`/api/v1/sales/${route.params.id}`);
}

async function cancel() {
  error.value = '';
  try {
    sale.value = await api<Sale>(`/api/v1/sales/${route.params.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: reason.value }) });
    cancelOpen.value = false;
    session.notify('Venda cancelada.');
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao cancelar.';
  }
}

async function contract() {
  if (!sale.value?.proposal) return;
  await api('/api/v1/contracts', { method: 'POST', body: JSON.stringify({ proposalId: sale.value.proposal.id }) });
  session.notify('Contrato gerado e estoque baixado.');
  await load();
}

async function pay(installmentId: string, amount: number) {
  await api('/api/v1/payments', {
    method: 'POST',
    body: JSON.stringify({ installmentId, amount, externalTransactionId: externalId.value }),
  });
  externalId.value = '';
  session.notify('Pagamento registrado.');
  await load();
}

onMounted(load);
</script>

<template>
  <header class="topbar" v-if="sale">
    <div>
      <h1>Venda #{{ sale.number }}</h1>
      <p>{{ sale.customer.name }} · {{ sale.store.name }}</p>
    </div>
    <span class="pill" :data-status="sale.status" data-testid="sale-status">{{ STATUS_LABEL[sale.status] ?? sale.status }}</span>
  </header>
  <section v-if="sale" class="grid">
    <article class="card">
      <p v-for="item in sale.items" :key="item.productId">{{ item.quantity }}× {{ item.name }} · {{ formatBRL(item.unitPrice) }}</p>
      <strong>{{ formatBRL(sale.total) }}</strong>
      <p v-if="sale.proposal">Proposta {{ STATUS_LABEL[sale.proposal.status] }} · {{ sale.proposal.installments }}× {{ formatBRL(sale.proposal.installmentAmount) }}</p>
      <div class="row">
        <button v-if="sale.proposal?.status === 'APPROVED' && session.can('contract.create')" class="btn primary" data-testid="generate-contract" type="button" @click="contract">Gerar contrato</button>
        <button v-if="sale.status !== 'CANCELLED' && session.can('sale.cancel')" class="btn danger" type="button" @click="cancelOpen = true">Cancelar venda</button>
      </div>
    </article>
    <article v-if="sale.contract" class="card" data-testid="contract-panel">
      <h2>Contrato #{{ sale.contract.number }}</h2>
      <p>Total financiado {{ formatBRL(sale.contract.total) }} · {{ STATUS_LABEL[sale.contract.status] ?? sale.contract.status }}</p>
      <table class="table">
        <thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="item in sale.contract.schedule" :key="item.id">
            <td>{{ item.number }}</td>
            <td>{{ formatBRL(item.amount) }}</td>
            <td>{{ formatDate(item.dueDate) }}</td>
            <td><span class="pill" :data-status="item.status">{{ STATUS_LABEL[item.status] ?? item.status }}</span></td>
            <td>
              <button v-if="item.status === 'OPEN' && session.can('payment.create')" class="btn" type="button" @click="pay(item.id, item.amount)">Receber</button>
            </td>
          </tr>
        </tbody>
      </table>
      <label v-if="session.can('payment.create')" class="field">Identificador externo do pagamento<input v-model="externalId" placeholder="ex. PIX-123" /></label>
    </article>
  </section>
  <div v-if="cancelOpen" class="modal-back">
    <form class="modal" @submit.prevent="cancel">
      <h2>Cancelar venda #{{ sale?.number }}?</h2>
      <p>{{ sale?.customer.name }} · {{ formatBRL(sale?.total ?? 0) }}</p>
      <label class="field">Motivo<textarea v-model="reason" data-testid="cancel-reason" required /></label>
      <p v-if="error">{{ error }}</p>
      <div class="row">
        <button class="btn" type="button" @click="cancelOpen = false">Voltar</button>
        <button class="btn danger" type="submit">Confirmar cancelamento</button>
      </div>
    </form>
  </div>
</template>
