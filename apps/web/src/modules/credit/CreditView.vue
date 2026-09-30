<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Proposal } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const session = useSession();
const proposals = ref<Proposal[]>([]);
const error = ref('');
const policyFlag = ref(false);

async function load() {
  proposals.value = await api<Proposal[]>('/api/v1/credit/proposals');
}

async function act(id: string, action: 'start-analysis' | 'approve' | 'reject') {
  error.value = '';
  try {
    const body = action === 'reject' ? { reason: 'Renda incompatível com a parcela.' } : { additionalPolicyConfirmed: policyFlag.value };
    await api(`/api/v1/credit/proposals/${id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'start-analysis' ? {} : body) });
    session.notify('Proposta atualizada.');
    await load();
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha na análise.';
  }
}

onMounted(load);
</script>

<template>
  <header class="topbar"><div><h1>Crédito</h1><p>Quem vendeu não aprova a própria proposta.</p></div></header>
  <p v-if="error">{{ error }}</p>
  <label v-if="session.can('credit.approve')" class="field"><input v-model="policyFlag" type="checkbox" /> Confirmo a política adicional acima do limite de gerente</label>
  <section class="card">
    <table class="table">
      <thead><tr><th>Cliente</th><th>Valor</th><th>Parcelas</th><th>Status</th><th></th></tr></thead>
      <tbody>
        <tr v-for="proposal in proposals" :key="proposal.id">
          <td>{{ proposal.customer.name }}<br />{{ proposal.seller.name }}</td>
          <td>{{ formatBRL(proposal.amount) }}</td>
          <td>{{ proposal.installments }}× {{ formatBRL(proposal.installmentAmount) }}</td>
          <td><span class="pill" :data-status="proposal.status">{{ STATUS_LABEL[proposal.status] }}</span></td>
          <td class="row">
            <button v-if="proposal.status === 'SUBMITTED' && session.can('credit.analyze')" class="btn" type="button" :data-testid="`analyze-${proposal.id}`" @click="act(proposal.id, 'start-analysis')">Assumir</button>
            <button v-if="proposal.status === 'UNDER_ANALYSIS' && session.can('credit.approve')" class="btn primary" type="button" :data-testid="`approve-${proposal.id}`" @click="act(proposal.id, 'approve')">Aprovar</button>
            <button v-if="proposal.status === 'UNDER_ANALYSIS' && session.can('credit.approve')" class="btn" type="button" @click="act(proposal.id, 'reject')">Rejeitar</button>
            <RouterLink v-if="proposal.saleId" :to="`/sales/${proposal.saleId}`">Venda</RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
