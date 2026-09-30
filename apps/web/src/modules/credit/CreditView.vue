<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Proposal } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const session = useSession();
const proposals = ref<Proposal[]>([]);
const error = ref('');
const policyFlag = ref(false);
const mode = ref<'table' | 'board'>('table');
const statuses = ['SUBMITTED', 'UNDER_ANALYSIS', 'APPROVED', 'REJECTED', 'CONTRACTED'];
const columns = computed<KanbanColumn[]>(() =>
  statuses.map((status) => ({
    id: status,
    title: STATUS_LABEL[status] ?? status,
    cards: proposals.value
      .filter((proposal) => proposal.status === status)
      .map((proposal) => ({
        id: proposal.id,
        title: proposal.customer.name,
        detail: `${formatBRL(proposal.amount)} · ${proposal.installments}×`,
        href: proposal.saleId ? `/sales/${proposal.saleId}` : undefined,
      })),
  })),
);

async function drop(payload: { id: string; from: string; to: string }) {
  const action =
    payload.from === 'SUBMITTED' && payload.to === 'UNDER_ANALYSIS'
      ? 'start-analysis'
      : payload.from === 'UNDER_ANALYSIS' && payload.to === 'APPROVED'
        ? 'approve'
        : payload.from === 'UNDER_ANALYSIS' && payload.to === 'REJECTED'
          ? 'reject'
          : null;
  if (!action) {
    session.notify('Esse movimento não é permitido.', 'error');
    await load();
    return;
  }
  await act(payload.id, action);
}

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
  <header class="topbar">
    <div><h1>Crédito</h1><p>Quem vendeu não aprova a própria proposta.</p></div>
    <ViewSwitch v-model="mode" storage-key="rf-view-credit" />
  </header>
  <p v-if="error">{{ error }}</p>
  <label v-if="session.can('credit.approve')" class="field"><input v-model="policyFlag" type="checkbox" /> Confirmo a política adicional acima do limite de gerente</label>
  <KanbanBoard v-if="mode === 'board'" :columns="columns" @move="drop" />
  <section v-else class="card">
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
