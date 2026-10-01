<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { Bell, ChevronLeft, ChevronRight, Search } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import mark from '../imgs/favicon.ico';
import { loadDashboard } from '../modules/dashboard/load';
import { useSession } from '../stores/session';
import { ROLE_LABEL } from '../utils/format';
import NavIcon from '../components/NavIcon.vue';
import { panelExtensions } from '../extensions/registry';
import { api } from '../services/http';

type Link = { to: string; label: string; permission?: string; icon?: unknown; addon?: string };

const session = useSession();
const route = useRoute();
const router = useRouter();
const collapsed = ref(localStorage.getItem('rf-sidebar') === 'collapsed');
const portrait = ref(false);
const drawer = ref(false);
const userOpen = ref(false);
const bellOpen = ref(false);
const draft = ref(typeof route.query.q === 'string' && route.path === '/customers' ? route.query.q : '');
const activeAddons = ref<string[] | null>(null);
const portraitQuery = window.matchMedia('(max-width: 980px)');

const loose: Link[] = [
  { to: '/', label: 'Painel', permission: 'dashboard.read' },
  { to: '/welcome', label: 'Boas-vindas' },
];

const categories: { id: string; label: string; links: Link[] }[] = [
  {
    id: 'operacao',
    label: 'Operação',
    links: [
      { to: '/customers', label: 'Clientes', permission: 'customer.read' },
      { to: '/catalog', label: 'Catálogo', permission: 'catalog.read' },
      { to: '/sales', label: 'Vendas', permission: 'sale.read' },
      { to: '/sales/new', label: 'Nova venda', permission: 'sale.create' },
    ],
  },
  { id: 'credito', label: 'Crédito', links: [{ to: '/credit', label: 'Crédito', permission: 'credit.read' }] },
  { id: 'relacionamento', label: 'Relacionamento', links: [{ to: '/support', label: 'Atendimento', permission: 'support.read' }] },
  {
    id: 'gestao',
    label: 'Gestão',
    links: [
      { to: '/audit', label: 'Auditoria', permission: 'audit.read' },
      { to: '/integrations', label: 'Integrações', permission: 'audit.read' },
      { to: '/addons', label: 'Addons', permission: 'addon.manage' },
    ],
  },
];

function allowed(link: Link) {
  return !link.permission || session.can(link.permission);
}

async function loadActiveAddons() {
  if (!session.can('addon.manage')) return;
  try {
    const rows = await api<{ name: string; state: string }[]>('/api/v1/addons');
    activeAddons.value = rows.filter((row) => row.state === 'ACTIVE').map((row) => row.name);
  } catch {
    activeAddons.value = [];
  }
}

watch(() => route.path, () => void loadActiveAddons(), { immediate: true });

const visibleLoose = computed(() => loose.filter(allowed));
const visibleCategories = computed(() => {
  const extra = panelExtensions.sidebar.filter((item) => {
    if (item.addon && activeAddons.value && !activeAddons.value.includes(item.addon)) return false;
    return allowed(item);
  });
  return categories
    .map((category) => ({
      ...category,
      links: [...category.links, ...(category.id === 'gestao' ? extra : [])].filter(allowed),
    }))
    .filter((category) => category.links.length);
});

const menuOpen = computed(() => (portrait.value ? drawer.value : !collapsed.value));
const iconOnly = computed(() => !portrait.value && collapsed.value);
const initials = computed(() =>
  (session.user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join(''),
);

const alertsOn = computed(() => session.authenticated && session.can('dashboard.read'));
const alerts = useQuery({
  queryKey: ['dashboard'],
  queryFn: loadDashboard,
  enabled: alertsOn,
});
const counts = computed(() => alerts.data.value?.data);
const badge = computed(() => {
  const data = counts.value;
  if (!data) return 0;
  return data.pendingCredit + data.openTickets + data.lowStock;
});

function syncPortrait() {
  portrait.value = portraitQuery.matches;
  if (!portraitQuery.matches) drawer.value = false;
}

function toggleMenu() {
  if (portrait.value) drawer.value = !drawer.value;
  else collapsed.value = !collapsed.value;
}

function search() {
  if (!session.can('customer.read')) return;
  const term = draft.value.trim();
  router.push({ path: '/customers', query: term ? { q: term } : {} });
}

function logout() {
  session.logout();
  router.push('/login');
}

watch(collapsed, (value) => localStorage.setItem('rf-sidebar', value ? 'collapsed' : 'open'));
watch(
  () => route.fullPath,
  () => {
    drawer.value = false;
    userOpen.value = false;
    bellOpen.value = false;
    if (route.path === '/customers') draft.value = typeof route.query.q === 'string' ? route.query.q : '';
  },
);

onMounted(() => {
  syncPortrait();
  portraitQuery.addEventListener('change', syncPortrait);
});
onBeforeUnmount(() => portraitQuery.removeEventListener('change', syncPortrait));
</script>

<template>
  <div class="shell" :class="{ collapsed, drawer }">
    <aside class="sidebar">
      <div class="sidebar-scroll">
        <div class="brand">
          <img :src="mark" alt="" />
          <span v-if="!iconOnly">
            RetailFlow
            <small>Varejo e crédito</small>
          </span>
        </div>
        <nav class="nav">
          <RouterLink v-for="link in visibleLoose" :key="link.to" :to="link.to" :title="link.label" :aria-label="link.label">
            <NavIcon :name="link.to" />
            <span v-if="!iconOnly">{{ link.label }}</span>
          </RouterLink>
          <section v-for="category in visibleCategories" :key="category.id" class="nav-group">
            <h2 v-if="!iconOnly">{{ category.label }}</h2>
            <RouterLink v-for="link in category.links" :key="link.to" :to="link.to" :title="link.label" :aria-label="link.label">
              <component :is="link.icon" v-if="link.icon" class="nav-icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
              <NavIcon v-else :name="link.to" />
              <span v-if="!iconOnly">{{ link.label }}</span>
            </RouterLink>
          </section>
        </nav>
        <div v-if="!iconOnly" class="promo">
          <strong>Mais vendas com crédito inteligente</strong>
          <p>A proposta nasce na venda e segue para análise sem sair do atendimento.</p>
        </div>
      </div>
    </aside>
    <button
      class="rail-toggle"
      type="button"
      :aria-expanded="menuOpen"
      :aria-label="menuOpen ? 'Recuar menu' : 'Expandir menu'"
      @click="toggleMenu"
    >
      <ChevronLeft v-if="menuOpen" class="nav-icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
      <ChevronRight v-else class="nav-icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
    </button>
    <div v-if="portrait && drawer" class="drawer-back" @click="drawer = false" />
    <div class="column">
      <header class="tophead">
        <form v-if="session.can('customer.read')" class="head-search" @submit.prevent="search">
          <input v-model="draft" aria-label="Buscar cliente" placeholder="Buscar cliente" />
          <button class="btn icon" type="submit" aria-label="Buscar" title="Buscar">
            <Search class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
          </button>
        </form>
        <div class="head-tools">
          <div v-if="session.can('dashboard.read')" class="bell">
            <button class="btn icon" type="button" aria-label="Pendências" title="Pendências" @click="bellOpen = !bellOpen">
              <Bell class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
              <span v-if="badge" class="badge">{{ badge }}</span>
            </button>
            <div v-if="bellOpen" class="userpop alert-list">
              <RouterLink to="/credit">Crédito em análise <strong>{{ counts?.pendingCredit ?? 0 }}</strong></RouterLink>
              <RouterLink to="/support">Tickets abertos <strong>{{ counts?.openTickets ?? 0 }}</strong></RouterLink>
              <RouterLink to="/catalog">Estoque baixo <strong>{{ counts?.lowStock ?? 0 }}</strong></RouterLink>
            </div>
          </div>
          <div class="usermenu">
            <button class="btn session" type="button" data-testid="session-menu" @click="userOpen = !userOpen">
              <span class="initials" aria-hidden="true">{{ initials }}</span>
              <span>
                {{ session.user?.name }}
                <small>{{ ROLE_LABEL[session.user?.role ?? ''] }}</small>
              </span>
            </button>
            <div v-if="userOpen" class="userpop">
              <p v-if="session.user?.storeName">{{ session.user.storeName }}</p>
              <button class="btn" type="button" data-testid="logout" @click="logout">Sair</button>
            </div>
          </div>
        </div>
      </header>
      <main class="workspace">
        <div :key="route.fullPath" v-motion :initial="{ opacity: 0, y: 10 }" :enter="{ opacity: 1, y: 0 }">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
