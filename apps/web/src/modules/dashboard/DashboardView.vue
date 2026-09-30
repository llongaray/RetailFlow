<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Sale } from '../../types';
import { formatBRL, formatDate } from '../../utils/format';
import { loadDashboard } from './load';

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent]);

const session = useSession();
const dash = useQuery({ queryKey: ['dashboard'], queryFn: loadDashboard });
const sales = useQuery({
  queryKey: ['sales'],
  queryFn: () => api<Sale[]>('/api/v1/sales'),
  enabled: computed(() => session.can('sale.read')),
});

const data = computed(() => dash.data.value?.data ?? null);
const ticket = computed(() => {
  const current = data.value;
  if (!current || !current.salesCount) return 0;
  return current.salesTotal / current.salesCount;
});

function paint(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const bars = computed(() => {
  const stores = data.value?.stores ?? [];
  return {
    color: [paint('--accent')],
    tooltip: { trigger: 'axis', valueFormatter: (value: number) => formatBRL(Number(value)) },
    grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: stores.map((store) => store.name), axisLabel: { color: paint('--muted') } },
    yAxis: { type: 'value', axisLabel: { color: paint('--muted') }, splitLine: { lineStyle: { color: paint('--line') } } },
    series: [{ type: 'bar', data: stores.map((store) => store.salesTotal), barMaxWidth: 42 }],
  };
});

const points = computed(() => {
  const buckets = new Map<string, number>();
  for (const sale of sales.data.value ?? []) {
    const day = sale.createdAt.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + sale.total);
  }
  return [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right));
});

const line = computed(() => ({
  color: [paint('--accent')],
  tooltip: { trigger: 'axis', valueFormatter: (value: number) => formatBRL(Number(value)) },
  grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: points.value.map(([day]) => formatDate(day)), axisLabel: { color: paint('--muted') } },
  yAxis: { type: 'value', axisLabel: { color: paint('--muted') }, splitLine: { lineStyle: { color: paint('--line') } } },
  series: [{ type: 'line', data: points.value.map(([, total]) => total), smooth: true, showSymbol: true }],
}));
</script>

<template>
  <header class="topbar">
    <div>
      <h1>Painel</h1>
      <p>Consolidado da rede ou da filial. Fonte: {{ dash.data.value?.source ?? '…' }}.</p>
    </div>
  </header>
  <section v-if="data" class="grid kpis">
    <article class="card kpi"><span>Vendas concluídas</span><strong data-testid="kpi-sales">{{ data.salesCount }}</strong></article>
    <article class="card kpi"><span>Volume</span><strong>{{ formatBRL(data.salesTotal) }}</strong></article>
    <article class="card kpi"><span>Ticket médio</span><strong>{{ formatBRL(ticket) }}</strong></article>
    <article class="card kpi"><span>Crédito em análise</span><strong>{{ data.pendingCredit }}</strong></article>
    <article class="card kpi"><span>Inadimplência</span><strong>{{ data.delinquentInstallments }}</strong></article>
    <article class="card kpi"><span>Estoque baixo</span><strong>{{ data.lowStock }}</strong></article>
    <article class="card kpi"><span>Atendimentos abertos</span><strong>{{ data.openTickets }}</strong></article>
  </section>
  <section v-if="data" class="dash">
    <div class="grid">
      <article class="card">
        <h2>Vendas por loja</h2>
        <VChart v-if="data.stores.length" class="chart" :option="bars" autoresize />
        <p v-else class="empty">Ainda não há vendas concluídas.</p>
      </article>
      <article class="card">
        <h2>Série das vendas</h2>
        <VChart v-if="points.length" class="chart" :option="line" autoresize />
        <p v-else class="empty">A lista de vendas não trouxe pontos para o gráfico.</p>
      </article>
    </div>
    <article class="card">
      <h2>Pendências</h2>
      <div class="pendencies">
        <RouterLink class="pend" data-tone="pending" to="/credit"><span>Crédito em análise</span><strong>{{ data.pendingCredit }}</strong></RouterLink>
        <RouterLink class="pend" data-tone="open" to="/support"><span>Tickets abertos</span><strong>{{ data.openTickets }}</strong></RouterLink>
        <RouterLink class="pend" data-tone="stock" to="/catalog"><span>Estoque baixo</span><strong>{{ data.lowStock }}</strong></RouterLink>
      </div>
    </article>
  </section>
  <section class="card" style="margin-top: 16px">
    <h2>Por loja</h2>
    <table class="table">
      <thead><tr><th>Loja</th><th>Vendas</th><th>Total</th></tr></thead>
      <tbody>
        <tr v-for="store in data?.stores ?? []" :key="store.name">
          <td>{{ store.name }}</td><td>{{ store.salesCount }}</td><td>{{ formatBRL(store.salesTotal) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="data && !data.stores.length" class="empty">Ainda não há vendas concluídas.</p>
  </section>
</template>
