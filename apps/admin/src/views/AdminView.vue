<script setup lang="ts">
import { Building2, KeyRound, Plug, Truck, UserRound, Users, Wallet } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '../components/Modal.vue';
import { ApiError, api } from '../http';

type Person = { id: string; name: string; email?: string; role?: string; active: boolean; cpf?: string; phone?: string | null };
type Shop = { id: string; name: string };
type Provider = { id: string; name: string; category: string; available: boolean; enabled: boolean; hasSecret: boolean };
type Payment = { id: string; code: string; name: string; active: boolean };
type Supplier = { id: string; name: string; document: string | null; active: boolean };
type ApiKey = { id: string; name: string; prefix: string; active: boolean };
type Company = { name: string; logoSquare: string | null; logoWide: string | null; logoStory: string | null };

const ROLE: Record<string, string> = {
  ADMIN: 'Administração',
  GERENTE: 'Gerência',
  ANALISTA_CREDITO: 'Análise de crédito',
  VENDEDOR: 'Vendas',
  ATENDIMENTO: 'Atendimento',
  FINANCEIRO: 'Financeiro',
};

const router = useRouter();
const section = ref('colaboradores');
const error = ref('');
const collaborators = ref<Person[]>([]);
const customers = ref<Person[]>([]);
const stores = ref<Shop[]>([]);
const providers = ref<Provider[]>([]);
const payments = ref<Payment[]>([]);
const suppliers = ref<Supplier[]>([]);
const keys = ref<ApiKey[]>([]);
const company = ref<Company>({ name: '', logoSquare: null, logoWide: null, logoStory: null });
const freshToken = ref('');
const dialog = ref<'collaborator' | 'customer' | 'supplier' | 'key' | ''>('');
const collaborator = ref({ name: '', email: '', password: '', role: 'VENDEDOR', storeId: '' });
const customer = ref({ name: '', cpf: '', phone: '' });
const supplier = ref({ name: '', document: '' });
const keyName = ref('');
const secrets = ref<Record<string, string>>({});
const sessionName = ref('Superusuário');

const sections = [
  { id: 'colaboradores', label: 'Colaboradores', icon: Users },
  { id: 'clientes', label: 'Clientes', icon: UserRound },
  { id: 'conectores', label: 'Conectores', icon: Plug },
  { id: 'pagamentos', label: 'Pagamentos', icon: Wallet },
  { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
  { id: 'chaves', label: 'Chaves', icon: KeyRound },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
] as const;

const initials = computed(() => {
  const parts = sessionName.value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
});
const dialogOpen = computed({
  get: () => dialog.value !== '',
  set: (open: boolean) => {
    if (!open) dialog.value = '';
  },
});

function countActive(rows: { active: boolean }[]) {
  return rows.filter((row) => row.active).length;
}

function formatCpf(value?: string) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '—';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

async function load() {
  const [people, clients, shop, connectors, options, vendors, issued, profile] = await Promise.all([
    api<Person[]>('/api/v1/admin/collaborators'),
    api<Person[]>('/api/v1/admin/customers'),
    api<Shop[]>('/api/v1/admin/stores'),
    api<Provider[]>('/api/v1/admin/providers'),
    api<Payment[]>('/api/v1/admin/payment-options'),
    api<Supplier[]>('/api/v1/admin/suppliers'),
    api<ApiKey[]>('/api/v1/admin/api-keys'),
    api<Company>('/api/v1/admin/company'),
  ]);
  collaborators.value = people;
  customers.value = clients;
  stores.value = shop;
  providers.value = connectors;
  payments.value = options;
  suppliers.value = vendors;
  keys.value = issued;
  company.value = profile;
}

function fail(cause: unknown) {
  error.value = cause instanceof ApiError ? cause.message : 'Falha na operação.';
}

async function toggle(path: string, active: boolean) {
  error.value = '';
  try {
    await api(path, { method: 'PATCH', body: JSON.stringify({ active }) });
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function createCollaborator() {
  error.value = '';
  try {
    await api('/api/v1/admin/collaborators', {
      method: 'POST',
      body: JSON.stringify({ ...collaborator.value, storeId: collaborator.value.storeId || undefined }),
    });
    collaborator.value = { name: '', email: '', password: '', role: 'VENDEDOR', storeId: '' };
    dialog.value = '';
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function createCustomer() {
  error.value = '';
  try {
    await api('/api/v1/admin/customers', { method: 'POST', body: JSON.stringify(customer.value) });
    customer.value = { name: '', cpf: '', phone: '' };
    dialog.value = '';
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function saveProvider(provider: Provider) {
  error.value = '';
  try {
    await api(`/api/v1/admin/providers/${provider.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: provider.enabled, secret: secrets.value[provider.id] || undefined }),
    });
    secrets.value[provider.id] = '';
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function createSupplier() {
  error.value = '';
  try {
    await api('/api/v1/admin/suppliers', { method: 'POST', body: JSON.stringify(supplier.value) });
    supplier.value = { name: '', document: '' };
    dialog.value = '';
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function createKey() {
  error.value = '';
  try {
    const created = await api<{ token: string }>('/api/v1/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: keyName.value }),
    });
    freshToken.value = created.token;
    keyName.value = '';
    dialog.value = '';
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function saveCompany() {
  error.value = '';
  try {
    await api('/api/v1/admin/company', { method: 'PATCH', body: JSON.stringify({ name: company.value.name }) });
    await load();
  } catch (cause) {
    fail(cause);
  }
}

async function uploadLogo(slot: 'square' | 'banner' | 'story', event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = '';
  const body = new FormData();
  body.set('slot', slot);
  body.set('file', file);
  try {
    await api('/api/v1/admin/company/logos', { method: 'POST', body });
    await load();
  } catch (cause) {
    fail(cause);
  } finally {
    input.value = '';
  }
}

function logout() {
  sessionStorage.removeItem('rf_admin_token');
  sessionStorage.removeItem('rf_admin_user');
  void router.push('/login');
}

onMounted(() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem('rf_admin_user') ?? 'null') as { name?: string } | null;
    if (saved?.name) sessionName.value = saved.name;
  } catch {
    sessionName.value = 'Superusuário';
  }
  void load();
});
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <img src="/favicon.ico" alt="" />
        <span>RetailFlow<small>Admin</small></span>
      </div>
      <nav>
        <button v-for="item in sections" :key="item.id" class="nav-link" type="button" :aria-pressed="section === item.id" @click="section = item.id">
          <component :is="item.icon" class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>
      <button class="btn ghost exit" type="button" @click="logout">Sair</button>
    </aside>
    <div class="column">
      <header class="tophead">
        <div class="session">
          <span class="initials" aria-hidden="true">{{ initials }}</span>
          <span>{{ sessionName }}<small>Superusuário</small></span>
        </div>
      </header>
      <main class="workspace">
        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="section === 'colaboradores'">
          <div class="top">
            <div><h1>Colaboradores</h1><p class="lede">Quem opera a loja. O superusuário não entra nesta lista.</p></div>
            <button class="btn primary" type="button" @click="dialog = 'collaborator'">Novo colaborador</button>
          </div>
          <section class="summary">
            <article><span>Total</span><strong>{{ collaborators.length }}</strong></article>
            <article><span>Ativos</span><strong>{{ countActive(collaborators) }}</strong></article>
            <article><span>Inativos</span><strong>{{ collaborators.length - countActive(collaborators) }}</strong></article>
          </section>
          <section class="card">
            <table class="table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                <tr v-for="person in collaborators" :key="person.id">
                  <td>{{ person.name }}</td>
                  <td>{{ person.email }}</td>
                  <td>{{ ROLE[person.role ?? ''] ?? person.role }}</td>
                  <td><span class="pill" :class="person.active ? 'on' : 'off'">{{ person.active ? 'Ativo' : 'Inativo' }}</span></td>
                  <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/collaborators/${person.id}`, !person.active)">{{ person.active ? 'Desativar' : 'Ativar' }}</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>

        <template v-else-if="section === 'clientes'">
          <div class="top">
            <div><h1>Clientes</h1><p class="lede">O CPF continua único na rede.</p></div>
            <button class="btn primary" type="button" @click="dialog = 'customer'">Novo cliente</button>
          </div>
          <section class="summary">
            <article><span>Total</span><strong>{{ customers.length }}</strong></article>
            <article><span>Ativos</span><strong>{{ countActive(customers) }}</strong></article>
            <article><span>Inativos</span><strong>{{ customers.length - countActive(customers) }}</strong></article>
          </section>
          <section class="card">
            <table class="table">
              <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                <tr v-for="person in customers" :key="person.id">
                  <td>{{ person.name }}</td>
                  <td>{{ formatCpf(person.cpf) }}</td>
                  <td>{{ person.phone || '—' }}</td>
                  <td><span class="pill" :class="person.active ? 'on' : 'off'">{{ person.active ? 'Ativo' : 'Inativo' }}</span></td>
                  <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/customers/${person.id}`, !person.active)">{{ person.active ? 'Desativar' : 'Ativar' }}</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>

        <template v-else-if="section === 'conectores'">
          <div class="top">
            <div><h1>Conectores</h1><p class="lede">Ligar guarda o segredo. Nenhuma chamada externa sai daqui.</p></div>
          </div>
          <section class="summary">
            <article><span>Catálogo</span><strong>{{ providers.length }}</strong></article>
            <article><span>Ligados</span><strong>{{ providers.filter((item) => item.enabled).length }}</strong></article>
            <article><span>Com segredo</span><strong>{{ providers.filter((item) => item.hasSecret).length }}</strong></article>
          </section>
          <section class="cards">
            <article v-for="provider in providers" :key="provider.id" class="card connector">
              <div class="row">
                <strong>{{ provider.name }}</strong>
                <span class="pill" :class="provider.enabled ? 'on' : 'wait'">{{ provider.enabled ? 'Ligado' : 'Desligado' }}</span>
              </div>
              <p class="muted">{{ provider.category }} · {{ provider.available ? 'disponível' : 'indisponível' }} · {{ provider.hasSecret ? 'segredo guardado' : 'sem segredo' }}</p>
              <label class="row"><input v-model="provider.enabled" type="checkbox" :disabled="!provider.available" /> Ligado</label>
              <input v-model="secrets[provider.id]" type="password" placeholder="Novo segredo" autocomplete="off" />
              <button class="btn" type="button" @click="saveProvider(provider)">Guardar</button>
            </article>
          </section>
        </template>

        <template v-else-if="section === 'pagamentos'">
          <div class="top"><div><h1>Pagamentos</h1><p class="lede">O que a loja pode oferecer no fechamento.</p></div></div>
          <section class="summary">
            <article><span>Opções</span><strong>{{ payments.length }}</strong></article>
            <article><span>Ativas</span><strong>{{ countActive(payments) }}</strong></article>
          </section>
          <section class="card">
            <table class="table">
              <thead><tr><th>Nome</th><th>Código</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                <tr v-for="option in payments" :key="option.id">
                  <td>{{ option.name }}</td>
                  <td>{{ option.code }}</td>
                  <td><span class="pill" :class="option.active ? 'on' : 'off'">{{ option.active ? 'Ativo' : 'Inativo' }}</span></td>
                  <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/payment-options/${option.id}`, !option.active)">{{ option.active ? 'Desativar' : 'Ativar' }}</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>

        <template v-else-if="section === 'fornecedores'">
          <div class="top">
            <div><h1>Fornecedores</h1><p class="lede">Quem abastece a rede.</p></div>
            <button class="btn primary" type="button" @click="dialog = 'supplier'">Novo fornecedor</button>
          </div>
          <section class="summary">
            <article><span>Total</span><strong>{{ suppliers.length }}</strong></article>
            <article><span>Ativos</span><strong>{{ countActive(suppliers) }}</strong></article>
          </section>
          <section class="card">
            <table class="table">
              <thead><tr><th>Nome</th><th>Documento</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                <tr v-for="item in suppliers" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td>{{ item.document || '—' }}</td>
                  <td><span class="pill" :class="item.active ? 'on' : 'off'">{{ item.active ? 'Ativo' : 'Inativo' }}</span></td>
                  <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/suppliers/${item.id}`, !item.active)">{{ item.active ? 'Desativar' : 'Ativar' }}</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>

        <template v-else-if="section === 'chaves'">
          <div class="top">
            <div><h1>Chaves de parceiro</h1><p class="lede">Leitura de catálogo, clientes e vendas. Sem crédito e sem admin.</p></div>
            <button class="btn primary" type="button" data-testid="new-key" @click="dialog = 'key'">Nova chave</button>
          </div>
          <section class="summary">
            <article><span>Emitidas</span><strong>{{ keys.length }}</strong></article>
            <article><span>Ativas</span><strong>{{ countActive(keys) }}</strong></article>
          </section>
          <p v-if="freshToken" class="token-card"><span class="muted">Copie agora. Esta chave não volta a aparecer.</span><span class="token" data-testid="partner-token">{{ freshToken }}</span></p>
          <section class="card">
            <table class="table">
              <thead><tr><th>Nome</th><th>Prefixo</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                <tr v-for="key in keys" :key="key.id">
                  <td>{{ key.name }}</td>
                  <td>{{ key.prefix }}</td>
                  <td><span class="pill" :class="key.active ? 'on' : 'off'">{{ key.active ? 'Ativa' : 'Inativa' }}</span></td>
                  <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/api-keys/${key.id}`, !key.active)">{{ key.active ? 'Desativar' : 'Ativar' }}</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>

        <template v-else>
          <div class="top"><div><h1>Empresa</h1><p class="lede">O nome e as marcas que a loja mostra na boas-vindas.</p></div></div>
          <section class="card grid">
            <form class="row company-name" @submit.prevent="saveCompany">
              <label class="field">Nome<input v-model="company.name" data-testid="company-name" required /></label>
              <button class="btn primary" data-testid="save-company" type="submit">Salvar</button>
            </form>
            <div class="logos">
              <label class="logo-card card">1:1
                <img v-if="company.logoSquare" class="square" :src="company.logoSquare" alt="Logo quadrado" />
                <span class="btn">Enviar</span>
                <input class="file" data-testid="logo-square" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('square', $event)" />
              </label>
              <label class="logo-card card">1:6
                <img v-if="company.logoWide" class="banner" :src="company.logoWide" alt="Logo faixa" />
                <span class="btn">Enviar</span>
                <input class="file" data-testid="logo-banner" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('banner', $event)" />
              </label>
              <label class="logo-card card">9:16
                <img v-if="company.logoStory" class="story" :src="company.logoStory" alt="Logo vertical" />
                <span class="btn">Enviar</span>
                <input class="file" data-testid="logo-story" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('story', $event)" />
              </label>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>

  <Modal v-model="dialogOpen">
    <form v-if="dialog === 'collaborator'" class="grid" @submit.prevent="createCollaborator">
      <h2>Novo colaborador</h2>
      <label class="field">Nome<input v-model="collaborator.name" required /></label>
      <label class="field">E-mail<input v-model="collaborator.email" type="email" required /></label>
      <label class="field">Senha<input v-model="collaborator.password" type="password" minlength="8" required /></label>
      <label class="field">Papel
        <select v-model="collaborator.role">
          <option v-for="(label, value) in ROLE" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <label class="field">Filial
        <select v-model="collaborator.storeId">
          <option value="">Sem filial</option>
          <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
        </select>
      </label>
      <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" type="submit">Criar</button></div>
    </form>
    <form v-else-if="dialog === 'customer'" class="grid" @submit.prevent="createCustomer">
      <h2>Novo cliente</h2>
      <label class="field">Nome<input v-model="customer.name" required /></label>
      <label class="field">CPF<input v-model="customer.cpf" required /></label>
      <label class="field">Telefone<input v-model="customer.phone" /></label>
      <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" type="submit">Criar</button></div>
    </form>
    <form v-else-if="dialog === 'supplier'" class="grid" @submit.prevent="createSupplier">
      <h2>Novo fornecedor</h2>
      <label class="field">Nome<input v-model="supplier.name" required /></label>
      <label class="field">Documento<input v-model="supplier.document" /></label>
      <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" type="submit">Criar</button></div>
    </form>
    <form v-else class="grid" @submit.prevent="createKey">
      <h2>Nova chave</h2>
      <label class="field">Nome<input v-model="keyName" data-testid="key-name" required /></label>
      <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" data-testid="create-key" type="submit">Emitir</button></div>
    </form>
  </Modal>
</template>
