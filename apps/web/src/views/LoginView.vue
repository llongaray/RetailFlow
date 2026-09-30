<script setup lang="ts">
import { ArrowRight, ChartColumn, CreditCard, Eye, EyeOff, Lock, Mail, ShieldCheck, ShoppingCart, UserRound } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import loginArt from '../imgs/img_login.png';
import { ApiError } from '../services/http';
import { useSession } from '../stores/session';

const session = useSession();
const router = useRouter();
const savedEmail = localStorage.getItem('rf_login_email') ?? '';
const email = ref(savedEmail);
const password = ref('');
const remember = ref(Boolean(savedEmail));
const showPassword = ref(false);
const error = ref('');
const note = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  note.value = '';
  loading.value = true;
  try {
    await session.login(email.value, password.value);
    if (remember.value) localStorage.setItem('rf_login_email', email.value);
    else localStorage.removeItem('rf_login_email');
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
      <img class="login-photo" :src="loginArt" alt="" />
      <svg class="login-curves" viewBox="0 0 800 900" aria-hidden="true">
        <path d="M40 80 C 220 40, 260 220, 140 340 S 40 560, 220 700" />
        <path d="M520 -20 C 640 80, 700 160, 620 280 S 480 460, 700 620" />
        <path d="M-40 760 C 160 680, 280 820, 420 900" />
      </svg>
      <div
        class="login-copy"
        v-motion
        :initial="{ opacity: 0, y: 18 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 700 } }"
      >
        <div>
          <p class="brand">RetailFlow</p>
          <p class="login-kicker">Operação de loja</p>
          <h1>Vendas, crédito e operação em <em>um só lugar.</em></h1>
          <p class="login-promise">Mais controle, mais resultado para o seu varejo.</p>
        </div>
        <div class="login-points">
          <article>
            <ShoppingCart :size="18" :stroke-width="1.75" aria-hidden="true" />
            <strong>Vendas</strong>
            <span>Mais agilidade no atendimento.</span>
          </article>
          <article>
            <CreditCard :size="18" :stroke-width="1.75" aria-hidden="true" />
            <strong>Crédito</strong>
            <span>Decisões seguras e mais vendas.</span>
          </article>
          <article>
            <ChartColumn :size="18" :stroke-width="1.75" aria-hidden="true" />
            <strong>Operação</strong>
            <span>Sua loja sempre no controle.</span>
          </article>
        </div>
      </div>
    </div>
    <div class="login-panel">
      <form
        class="login-card"
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 600, delay: 120 } }"
        @submit.prevent="submit"
      >
        <div class="login-head">
          <div>
            <p class="login-mark">RetailFlow</p>
            <h2>Entrar</h2>
          </div>
          <span class="login-safe"><Lock :size="14" :stroke-width="1.75" aria-hidden="true" /> Acesso seguro</span>
        </div>
        <p class="login-lead">Acesse sua operação com segurança.</p>
        <label class="field">E-mail
          <span class="login-input">
            <Mail :size="18" :stroke-width="1.75" aria-hidden="true" />
            <input v-model="email" data-testid="login-email" type="email" autocomplete="username" placeholder="seu@email.com" required />
          </span>
        </label>
        <label class="field">Senha
          <span class="login-input">
            <Lock :size="18" :stroke-width="1.75" aria-hidden="true" />
            <input v-model="password" data-testid="login-password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Sua senha" required />
            <button class="btn icon" type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" :title="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" :size="18" :stroke-width="1.75" aria-hidden="true" />
              <Eye v-else :size="18" :stroke-width="1.75" aria-hidden="true" />
            </button>
          </span>
        </label>
        <div class="login-row">
          <label class="login-check"><input v-model="remember" type="checkbox" /> Lembrar-me</label>
          <button class="login-link" type="button" @click="note = 'A redefinição da senha é feita pelo administrador da loja.'">Esqueci minha senha</button>
        </div>
        <p v-if="error" class="hint" data-testid="login-error">{{ error }}</p>
        <p v-if="note" class="login-note">{{ note }}</p>
        <button class="btn primary" data-testid="login-submit" type="submit" :disabled="loading">Entrar <ArrowRight :size="18" :stroke-width="1.75" aria-hidden="true" /></button>
        <p class="login-or"><span>Ou, se precisar de acesso</span></p>
        <button class="btn login-request" type="button" @click="note = 'O acesso é liberado pelo administrador da filial.'">
          <UserRound :size="18" :stroke-width="1.75" aria-hidden="true" /> Solicitar acesso
        </button>
        <p class="login-foot"><ShieldCheck :size="16" :stroke-width="1.75" aria-hidden="true" /> Seus dados são protegidos com criptografia e altos padrões de segurança.</p>
      </form>
    </div>
  </section>
</template>
