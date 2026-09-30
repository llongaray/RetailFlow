<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../services/http';
import { useSession } from '../stores/session';

const session = useSession();
const router = useRouter();
const email = ref('lucas.ferreira@retailflow.local');
const password = ref('RetailFlow#2026');
const error = ref('');
const loading = ref(false);
const accounts = [
  ['Vendedor · Porto Alegre', 'lucas.ferreira@retailflow.local'],
  ['Analista de crédito', 'camila.nogueira@retailflow.local'],
  ['Gerente · Porto Alegre', 'ricardo.almeida@retailflow.local'],
  ['Financeiro', 'sofia.ribeiro@retailflow.local'],
  ['Atendimento', 'bruno.teixeira@retailflow.local'],
  ['Administração', 'helena.prado@retailflow.local'],
];

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await session.login(email.value, password.value);
    router.push('/');
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Não foi possível entrar.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="login">
    <div class="login-story">
      <p>Operação de loja</p>
      <h1>Venda, crédito e estoque na mesma filial.</h1>
      <p>Um cliente, um carrinho e a decisão entre pagamento à vista ou financiamento.</p>
    </div>
    <div class="login-panel">
      <form class="login-card" @submit.prevent="submit">
        <p class="brand" style="color: var(--ink)">RetailFlow</p>
        <label class="field">E-mail<input v-model="email" data-testid="login-email" type="email" required /></label>
        <label class="field">Senha<input v-model="password" data-testid="login-password" type="password" required /></label>
        <p v-if="error" data-testid="login-error">{{ error }}</p>
        <button class="btn primary" data-testid="login-submit" type="submit" :disabled="loading">Entrar</button>
        <div class="accounts">
          <button v-for="account in accounts" :key="account[1]" class="btn" type="button" @click="email = account[1]">{{ account[0] }}</button>
        </div>
        <p>Senha de demonstração: RetailFlow#2026</p>
      </form>
    </div>
  </section>
</template>
