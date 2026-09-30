<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { ROLE_LABEL } from '../utils/format';

const session = useSession();
const router = useRouter();
const links = computed(() =>
  [
    { to: '/', label: 'Painel', permission: 'dashboard.read' },
    { to: '/customers', label: 'Clientes', permission: 'customer.read' },
    { to: '/catalog', label: 'Catálogo', permission: 'catalog.read' },
    { to: '/sales', label: 'Vendas', permission: 'sale.read' },
    { to: '/sales/new', label: 'Nova venda', permission: 'sale.create' },
    { to: '/credit', label: 'Crédito', permission: 'credit.read' },
    { to: '/support', label: 'Atendimento', permission: 'support.read' },
    { to: '/audit', label: 'Auditoria', permission: 'audit.read' },
    { to: '/integrations', label: 'Integrações', permission: 'audit.read' },
  ].filter((link) => session.can(link.permission)),
);

function logout() {
  session.logout();
  router.push('/login');
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">RetailFlow<small>Varejo e crédito</small></div>
      <nav class="nav">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
      </nav>
      <div class="user">
        <strong>{{ session.user?.name }}</strong>
        <span>{{ ROLE_LABEL[session.user?.role ?? ''] }}</span>
        <div v-if="session.user?.storeName">{{ session.user.storeName }}</div>
        <button class="btn ghost" style="margin-top: 12px; color: white" type="button" @click="logout">Sair</button>
      </div>
    </aside>
    <main class="workspace"><slot /></main>
  </div>
</template>
