<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { ColumnDef } from '@tanstack/vue-table';
import { computed, h, ref } from 'vue';
import DataTable from '../../components/DataTable.vue';
import KanbanBoard, { type KanbanColumn } from '../../components/KanbanBoard.vue';
import SummaryStrip from '../../components/SummaryStrip.vue';
import ViewSwitch from '../../components/ViewSwitch.vue';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Proposal } from '../../types';
import { formatBRL, STATUS_LABEL } from '../../utils/format';

const session = useSession();
const queryClient = useQueryClient();
const error = ref('');
const policyFlag = ref(false);
const mode = ref<'table' | 'board'>('table');
const statuses = ['SUBMITTED', 'UNDER_ANALYSIS', 'APPROVED', 'REJECTED', 'CONTRACTED'];
const list = useQuery({ queryKey: ['proposals'], queryFn: () => api<Proposal[]>('/api/v1/credit/proposals') });
const proposals = computed(() => list.data.value ?? []);

const summary = computed(() => [
  { label: 'Propostas', value: String(proposals.value.length) },
  { label: 'Em análise', value: String(proposals.value.filter((proposal) => proposal.status === 'SUBMITTED' || proposal.status === 'UNDER_ANALYSIS').length) },
  { label: 'Aprovadas', value: String(proposals.value.filter((proposal) => proposal.status === 'APPROVED' || proposal.status === 'CONTRACTED').length) },
  { label: 'Volume', value: formatBRL(proposals.value.reduce((sum, proposal) => sum + proposal.amount, 0)) },
]);

const columns: ColumnDef<Proposal, unknown>[] = [
  { id: 'customer', header: 'Cliente', accessorFn: (row) => `${row.customer.name} ${row.seller.name}` },
  { id: 'amount', header: 'Valor', accessorFn: (row) => row.amount, cell: (info) => formatBRL(info.getValue<number>()) },
  { id: 'installments', header: 'Parcelas', accessorFn: (row) => `${row.installments}× ${formatBRL(row.installmentAmount)}` },
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
  match: (row: Proposal, value: string) => row.status === value,
};

const board = computed<KanbanColumn[]>(() =>
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

async function load() {
  await queryClient.invalidateQueries({ queryKey: ['proposals'] });
}

async function act(id: string, action: 'start-analysis' | 'approve' | 'reject') {
  error.value = '';
  const next = action === 'start-analysis' ? 'UNDER_ANALYSIS' : action === 'approve' ? 'APPROVED' : 'REJECTED';
  queryClient.setQueryData<Proposal[]>(['proposals'], (current) => current?.map((proposal) => (proposal.id === id ? { ...proposal, status: next } : proposal)));
  try {
    const body = action === 'reject' ? { reason: 'Renda incompatível com a parcela.' } : { additionalPolicyConfirmed: policyFlag.value };
    await api(`/api/v1/credit/proposals/${id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'start-analysis' ? {} : body) });
    session.notify('Proposta atualizada.');
    await load();
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha na análise.';
    await load();
  }
}

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
</script>

<template>
  <header class="topbar">
    <div><h1>Crédito</h1><p>Quem vendeu não aprova a própria proposta.</p></div>
    <ViewSwitch v-model="mode" storage-key="rf-view-credit" />
  </header>
  <SummaryStrip :items="summary" />
  <p v-if="error" class="hint">{{ error }}</p>
  <label v-if="session.can('credit.approve')" class="field" style="margin-bottom: 16px"><input v-model="policyFlag" type="checkbox" /> Confirmo a política adicional acima do limite de gerente</label>
  <KanbanBoard v-if="mode === 'board'" :columns="board" @move="drop" />
  <DataTable v-else :rows="proposals" :columns="columns" :facet="facet" :loading="list.isPending.value" filename="credito.csv">
    <template #actions="{ row }">
      <div class="row">
        <button v-if="row.status === 'SUBMITTED' && session.can('credit.analyze')" class="btn" type="button" :data-testid="`analyze-${row.id}`" @click="act(row.id, 'start-analysis')">Assumir</button>
        <button v-if="row.status === 'UNDER_ANALYSIS' && session.can('credit.approve')" class="btn primary" type="button" :data-testid="`approve-${row.id}`" @click="act(row.id, 'approve')">Aprovar</button>
        <button v-if="row.status === 'UNDER_ANALYSIS' && session.can('credit.approve')" class="btn" type="button" @click="act(row.id, 'reject')">Rejeitar</button>
        <RouterLink v-if="row.saleId" :to="`/sales/${row.saleId}`">Venda</RouterLink>
      </div>
    </template>
  </DataTable>
</template>
