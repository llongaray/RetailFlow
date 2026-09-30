<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavIcon from '../components/NavIcon.vue';
import { useSession } from '../stores/session';
import { ROLE_LABEL } from '../utils/format';

type Link = { to: string; label: string; permission?: string };

const session = useSession();
const route = useRoute();
const router = useRouter();
const collapsed = ref(localStorage.getItem('rf-sidebar') === 'collapsed');
const portrait = ref(false);
const drawer = ref(false);
const userOpen = ref(false);
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
    ],
  },
];

function allowed(link: Link) {
  return !link.permission || session.can(link.permission);
}

const visibleLoose = computed(() => loose.filter(allowed));
const visibleCategories = computed(() =>
  categories
    .map((category) => ({ ...category, links: category.links.filter(allowed) }))
    .filter((category) => category.links.length),
);

const menuOpen = computed(() => (portrait.value ? drawer.value : !collapsed.value));
const iconOnly = computed(() => !portrait.value && collapsed.value);

function syncPortrait() {
  portrait.value = portraitQuery.matches;
  if (!portraitQuery.matches) drawer.value = false;
}

function toggleMenu() {
  if (portrait.value) drawer.value = !drawer.value;
  else collapsed.value = !collapsed.value;
}

watch(collapsed, (value) => localStorage.setItem('rf-sidebar', value ? 'collapsed' : 'open'));
watch(() => route.fullPath, () => {
  drawer.value = false;
  userOpen.value = false;
});

onMounted(() => {
  syncPortrait();
  portraitQuery.addEventListener('change', syncPortrait);
});
onBeforeUnmount(() => portraitQuery.removeEventListener('change', syncPortrait));

function logout() {
  session.logout();
  router.push('/login');
}
</script>

<template>
  <div class="shell" :class="{ collapsed, drawer }">
    <aside class="sidebar">
      <div class="sidebar-scroll">
        <div class="brand">
          {{ portrait || !collapsed ? 'RetailFlow' : 'RF' }}
          <small v-if="portrait || !collapsed">Varejo e crédito</small>
        </div>
        <nav class="nav">
          <RouterLink v-for="link in visibleLoose" :key="link.to" :to="link.to" :title="link.label" :aria-label="link.label">
            <NavIcon v-if="iconOnly" :name="link.to" />
            <span v-else>{{ link.label }}</span>
          </RouterLink>
          <section v-for="category in visibleCategories" :key="category.id" class="nav-group">
            <h2 v-if="portrait || !collapsed">{{ category.label }}</h2>
            <RouterLink v-for="link in category.links" :key="link.to" :to="link.to" :title="link.label" :aria-label="link.label">
              <NavIcon v-if="iconOnly" :name="link.to" />
              <span v-else>{{ link.label }}</span>
            </RouterLink>
          </section>
        </nav>
      </div>
    </aside>
    <button
      class="rail-toggle"
      type="button"
      :aria-expanded="menuOpen"
      :aria-label="menuOpen ? 'Recuar menu' : 'Expandir menu'"
      @click="toggleMenu"
    >
      {{ menuOpen ? '‹' : '›' }}
    </button>
    <div v-if="portrait && drawer" class="drawer-back" @click="drawer = false" />
    <div class="column">
      <header class="tophead">
        <div class="usermenu">
          <button class="btn" type="button" data-testid="session-menu" @click="userOpen = !userOpen">
            {{ session.user?.name }}
            <small>{{ ROLE_LABEL[session.user?.role ?? ''] }}</small>
          </button>
          <div v-if="userOpen" class="userpop">
            <p v-if="session.user?.storeName">{{ session.user.storeName }}</p>
            <button class="btn" type="button" data-testid="logout" @click="logout">Sair</button>
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
