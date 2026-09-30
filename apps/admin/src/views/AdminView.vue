<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, api } from '../http';

type Person = { id: string; name: string; email?: string; role?: string; active: boolean; cpf?: string; phone?: string | null };
type Store = { id: string; name: string };
type Provider = { id: string; name: string; category: string; available: boolean; enabled: boolean; hasSecret: boolean };
type Payment = { id: string; code: string; name: string; active: boolean };
type Supplier = { id: string; name: string; document: string | null; active: boolean };
type ApiKey = { id: string; name: string; prefix: string; active: boolean };
type Company = { name: string; logoSquare: string | null; logoWide: string | null; logoStory: string | null };

const router = useRouter();
const section = ref('colaboradores');
const error = ref('');
const collaborators = ref<Person[]>([]);
const customers = ref<Person[]>([]);
const stores = ref<Store[]>([]);
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

const sections = [
  ['colaboradores', 'Colaboradores'],
  ['clientes', 'Clientes'],
  ['conectores', 'Conectores'],
  ['pagamentos', 'Pagamentos'],
  ['fornecedores', 'Fornecedores'],
  ['chaves', 'Chaves'],
  ['empresa', 'Empresa'],
] as const;

async function load() {
  const [people, clients, shop, connectors, options, vendors, issued, profile] = await Promise.all([
    api<Person[]>('/api/v1/admin/collaborators'),
    api<Person[]>('/api/v1/admin/customers'),
    api<Store[]>('/api/v1/admin/stores'),
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
  void router.push('/login');
}

onMounted(load);
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <strong>RetailFlow</strong>
      <button v-for="item in sections" :key="item[0]" type="button" :aria-pressed="section === item[0]" @click="section = item[0]">{{ item[1] }}</button>
      <button type="button" @click="logout">Sair</button>
    </aside>
    <main class="workspace">
      <p v-if="error" class="error">{{ error }}</p>
      <section v-if="section === 'colaboradores'" class="card grid">
        <div class="top"><h1>Colaboradores</h1><button class="btn primary" type="button" @click="dialog = 'collaborator'">Novo</button></div>
        <table class="table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th></th></tr></thead>
          <tbody>
            <tr v-for="person in collaborators" :key="person.id">
              <td>{{ person.name }}</td><td>{{ person.email }}</td><td>{{ person.role }}</td>
              <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/collaborators/${person.id}`, !person.active)">{{ person.active ? 'Desativar' : 'Ativar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-else-if="section === 'clientes'" class="card grid">
        <div class="top"><h1>Clientes</h1><button class="btn primary" type="button" @click="dialog = 'customer'">Novo</button></div>
        <table class="table">
          <thead><tr><th>Nome</th><th>CPF</th><th></th></tr></thead>
          <tbody>
            <tr v-for="person in customers" :key="person.id">
              <td>{{ person.name }}</td><td>{{ person.cpf }}</td>
              <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/customers/${person.id}`, !person.active)">{{ person.active ? 'Desativar' : 'Ativar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-else-if="section === 'conectores'" class="card grid">
        <h1>Conectores</h1>
        <article v-for="provider in providers" :key="provider.id" class="grid">
          <strong>{{ provider.name }}</strong>
          <p>{{ provider.category }} · {{ provider.available ? 'disponível' : 'indisponível' }} · {{ provider.hasSecret ? 'segredo guardado' : 'sem segredo' }}</p>
          <div class="row">
            <label><input v-model="provider.enabled" type="checkbox" :disabled="!provider.available" /> Ligado</label>
            <input v-model="secrets[provider.id]" type="password" placeholder="Novo segredo" autocomplete="off" />
            <button class="btn" type="button" @click="saveProvider(provider)">Guardar</button>
          </div>
        </article>
      </section>
      <section v-else-if="section === 'pagamentos'" class="card grid">
        <h1>Pagamentos</h1>
        <table class="table">
          <tbody>
            <tr v-for="option in payments" :key="option.id">
              <td>{{ option.name }}</td>
              <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/payment-options/${option.id}`, !option.active)">{{ option.active ? 'Desativar' : 'Ativar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-else-if="section === 'fornecedores'" class="card grid">
        <div class="top"><h1>Fornecedores</h1><button class="btn primary" type="button" @click="dialog = 'supplier'">Novo</button></div>
        <table class="table">
          <tbody>
            <tr v-for="item in suppliers" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.document }}</td>
              <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/suppliers/${item.id}`, !item.active)">{{ item.active ? 'Desativar' : 'Ativar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-else-if="section === 'chaves'" class="card grid">
        <div class="top"><h1>Chaves de parceiro</h1><button class="btn primary" type="button" data-testid="new-key" @click="dialog = 'key'">Nova chave</button></div>
        <p v-if="freshToken" class="token" data-testid="partner-token">{{ freshToken }}</p>
        <table class="table">
          <tbody>
            <tr v-for="key in keys" :key="key.id">
              <td>{{ key.name }}</td><td>{{ key.prefix }}</td>
              <td><button class="btn" type="button" @click="toggle(`/api/v1/admin/api-keys/${key.id}`, !key.active)">{{ key.active ? 'Desativar' : 'Ativar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-else class="card grid">
        <h1>Empresa</h1>
        <form class="row" @submit.prevent="saveCompany">
          <label class="field">Nome<input v-model="company.name" data-testid="company-name" required /></label>
          <button class="btn primary" data-testid="save-company" type="submit">Salvar</button>
        </form>
        <div class="logos">
          <label>1:1<img v-if="company.logoSquare" class="square" :src="company.logoSquare" alt="Logo quadrado" /><input data-testid="logo-square" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('square', $event)" /></label>
          <label>1:6<img v-if="company.logoWide" class="banner" :src="company.logoWide" alt="Logo faixa" /><input data-testid="logo-banner" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('banner', $event)" /></label>
          <label>9:16<img v-if="company.logoStory" class="story" :src="company.logoStory" alt="Logo vertical" /><input data-testid="logo-story" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo('story', $event)" /></label>
        </div>
      </section>
      <div v-if="dialog" class="modal-back" @click.self="dialog = ''">
        <form v-if="dialog === 'collaborator'" class="card modal grid" @submit.prevent="createCollaborator">
          <h2>Novo colaborador</h2>
          <label class="field">Nome<input v-model="collaborator.name" required /></label>
          <label class="field">E-mail<input v-model="collaborator.email" type="email" required /></label>
          <label class="field">Senha<input v-model="collaborator.password" type="password" minlength="8" required /></label>
          <label class="field">Papel
            <select v-model="collaborator.role">
              <option>VENDEDOR</option><option>GERENTE</option><option>ANALISTA_CREDITO</option><option>ATENDIMENTO</option><option>FINANCEIRO</option><option>ADMIN</option>
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
        <form v-else-if="dialog === 'customer'" class="card modal grid" @submit.prevent="createCustomer">
          <h2>Novo cliente</h2>
          <label class="field">Nome<input v-model="customer.name" required /></label>
          <label class="field">CPF<input v-model="customer.cpf" required /></label>
          <label class="field">Telefone<input v-model="customer.phone" /></label>
          <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" type="submit">Criar</button></div>
        </form>
        <form v-else-if="dialog === 'supplier'" class="card modal grid" @submit.prevent="createSupplier">
          <h2>Novo fornecedor</h2>
          <label class="field">Nome<input v-model="supplier.name" required /></label>
          <label class="field">Documento<input v-model="supplier.document" /></label>
          <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" type="submit">Criar</button></div>
        </form>
        <form v-else class="card modal grid" @submit.prevent="createKey">
          <h2>Nova chave</h2>
          <label class="field">Nome<input v-model="keyName" data-testid="key-name" required /></label>
          <div class="row"><button class="btn" type="button" @click="dialog = ''">Voltar</button><button class="btn primary" data-testid="create-key" type="submit">Emitir</button></div>
        </form>
      </div>
    </main>
  </div>
</template>
