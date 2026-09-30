<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, api } from '../http';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    const result = await api<{ accessToken: string; user?: { name: string } }>('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    sessionStorage.setItem('rf_admin_token', result.accessToken);
    if (result.user?.name) sessionStorage.setItem('rf_admin_user', JSON.stringify({ name: result.user.name }));
    await router.push('/');
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao entrar.';
  }
}
</script>

<template>
  <section class="login">
    <div class="login-story">
      <div class="brand">
        <img src="/favicon.ico" alt="" />
        <span>RetailFlow<small>Admin</small></span>
      </div>
      <h1>A rede, as chaves e a marca num só lugar.</h1>
      <p>Colaboradores, conectores e a empresa. A conta da loja não entra aqui.</p>
    </div>
    <div class="login-panel">
      <form class="login-card" @submit.prevent="submit">
        <p class="brand ink"><img src="/favicon.ico" alt="" />RetailFlow<small>Superusuário</small></p>
        <label class="field">E-mail<input v-model="email" data-testid="admin-email" type="email" required /></label>
        <label class="field">Senha<input v-model="password" data-testid="admin-password" type="password" required /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn primary" data-testid="admin-submit" type="submit">Entrar</button>
      </form>
    </div>
  </section>
</template>
