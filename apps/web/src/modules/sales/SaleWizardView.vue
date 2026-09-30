<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, api } from '../../services/http';
import { useSession } from '../../stores/session';
import type { Customer, Product, Sale, Store } from '../../types';
import { formatBRL, formatCpf } from '../../utils/format';

const session = useSession();
const router = useRouter();
const stores = ref<Store[]>([]);
const products = ref<Product[]>([]);
const storeId = ref(session.user?.storeId ?? '');
const cpf = ref('');
const customer = ref<Customer | null>(null);
const newName = ref('');
const cart = ref<{ product: Product; quantity: number }[]>([]);
const method = ref<'CASH' | 'FINANCED'>('CASH');
const installments = ref(12);
const simulation = ref<{ installmentAmount: number; total: number } | null>(null);
const confirmOpen = ref(false);
const error = ref('');

const total = computed(() => cart.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0));
const stockOf = (product: Product) => product.stock.find((item) => item.storeId === storeId.value)?.quantity ?? 0;

onMounted(async () => {
  stores.value = await api<Store[]>('/api/v1/stores');
  if (!storeId.value) storeId.value = stores.value.find((store) => store.active)?.id ?? '';
  await loadProducts();
});

async function loadProducts() {
  if (!storeId.value) return;
  products.value = await api<Product[]>(`/api/v1/products?storeId=${storeId.value}`);
}

async function findCustomer() {
  error.value = '';
  const found = await api<Customer[]>(`/api/v1/customers?q=${encodeURIComponent(cpf.value)}`);
  customer.value = found[0] ?? null;
  if (!customer.value) error.value = 'Cliente não encontrado. Cadastre para continuar.';
}

async function createCustomer() {
  customer.value = await api<Customer>('/api/v1/customers', { method: 'POST', body: JSON.stringify({ name: newName.value, cpf: cpf.value }) });
  error.value = '';
}

function add(product: Product) {
  const current = cart.value.find((item) => item.product.id === product.id);
  const next = (current?.quantity ?? 0) + 1;
  if (next > stockOf(product)) {
    session.notify('Estoque da filial insuficiente.', 'error');
    return;
  }
  if (current) current.quantity = next;
  else cart.value.push({ product, quantity: 1 });
}

async function simulate() {
  simulation.value = await api('/api/v1/credit/simulations', {
    method: 'POST',
    body: JSON.stringify({ amount: total.value, installments: installments.value }),
  });
}

async function submit() {
  error.value = '';
  try {
    const sale = await api<Sale>('/api/v1/sales', {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.value?.id,
        storeId: storeId.value,
        paymentMethod: method.value,
        installments: method.value === 'FINANCED' ? installments.value : undefined,
        items: cart.value.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      }),
    });
    session.notify(method.value === 'CASH' ? 'Venda concluída.' : 'Proposta enviada para análise.');
    router.push(`/sales/${sale.id}`);
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao registrar a venda.';
    confirmOpen.value = false;
  }
}
</script>

<template>
  <header class="topbar">
    <div><h1>Nova venda</h1><p>O estoque só baixa quando a venda é concluída.</p></div>
  </header>
  <div class="wizard">
    <section class="grid">
      <label class="field">Loja
        <select v-model="storeId" data-testid="sale-store" :disabled="Boolean(session.user?.storeId)" @change="loadProducts">
          <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
        </select>
      </label>
      <form class="card grid" @submit.prevent="findCustomer">
        <label class="field">CPF do cliente<input v-model="cpf" data-testid="sale-cpf" required /></label>
        <button class="btn" type="submit">Localizar</button>
        <p v-if="customer" data-testid="sale-customer">{{ customer.name }} · limite {{ formatBRL(customer.creditLimit) }}</p>
        <p v-if="error">{{ error }}</p>
        <template v-if="!customer && error">
          <label class="field">Nome<input v-model="newName" data-testid="sale-customer-name" /></label>
          <button class="btn" type="button" @click="createCustomer">Cadastrar cliente</button>
        </template>
      </form>
      <section class="card">
        <table class="table">
          <thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>{{ product.name }}</td>
              <td>{{ formatBRL(product.price) }}</td>
              <td>{{ stockOf(product) }}</td>
              <td><button class="btn" type="button" :data-testid="`add-${product.sku}`" @click="add(product)">Adicionar</button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
    <aside class="card cart grid">
      <h2>Carrinho</h2>
      <p v-for="item in cart" :key="item.product.id">{{ item.quantity }}× {{ item.product.name }}</p>
      <p v-if="!cart.length" class="empty">Nenhum item.</p>
      <strong data-testid="sale-total">{{ formatBRL(total) }}</strong>
      <label class="field">Pagamento
        <select v-model="method" data-testid="sale-method">
          <option value="CASH">À vista</option>
          <option value="FINANCED">Financiado</option>
        </select>
      </label>
      <template v-if="method === 'FINANCED'">
        <label class="field">Parcelas<input v-model.number="installments" data-testid="sale-installments" type="number" min="1" max="24" /></label>
        <button class="btn" type="button" @click="simulate">Simular</button>
        <p v-if="simulation">{{ installments }}× de {{ formatBRL(simulation.installmentAmount) }} · total {{ formatBRL(simulation.total) }}</p>
      </template>
      <button class="btn primary" data-testid="sale-review" type="button" :disabled="!customer || !cart.length" @click="confirmOpen = true">Revisar</button>
    </aside>
  </div>
  <div v-if="confirmOpen" class="modal-back">
    <form class="modal" @submit.prevent="submit">
      <h2>{{ method === 'CASH' ? 'Confirmar venda à vista' : 'Enviar proposta de crédito' }}</h2>
      <p>{{ customer?.name }} · {{ formatCpf(customer?.cpf ?? '') }}</p>
      <p>{{ formatBRL(total) }}</p>
      <p v-if="error">{{ error }}</p>
      <div class="row">
        <button class="btn" type="button" @click="confirmOpen = false">Voltar</button>
        <button class="btn primary" data-testid="sale-confirm" type="submit">Confirmar</button>
      </div>
    </form>
  </div>
</template>
