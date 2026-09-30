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
    const result = await api<{ accessToken: string }>('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    sessionStorage.setItem('rf_admin_token', result.accessToken);
    await router.push('/');
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Falha ao entrar.';
  }
}
</script>

<template>
  <main class="login">
    <form class="card grid" @submit.prevent="submit">
      <h1>Admin</h1>
      <p>Somente o superusuário.</p>
      <label class="field">E-mail<input v-model="email" data-testid="admin-email" type="email" required /></label>
      <label class="field">Senha<input v-model="password" data-testid="admin-password" type="password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn primary" data-testid="admin-submit" type="submit">Entrar</button>
    </form>
  </main>
</template>
