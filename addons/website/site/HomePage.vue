<script setup lang="ts">
import { onMounted, ref } from 'vue';

type Payload = { page: { hero: { title: string; subtitle: string; button: string; link: string }; identity: { name: string }; footer: { text: string; copyright: string }; contact: { email: string } }; sections: { id: string; title: string; description: string }[] };

const data = ref<Payload | null>(null);
const missing = ref(false);

onMounted(async () => {
  const response = await fetch(`/api/v1/ext/website/public?host=${encodeURIComponent(window.location.host)}`);
  if (!response.ok) {
    missing.value = true;
    return;
  }
  data.value = await response.json();
});
</script>

<template>
  <main class="site">
    <p v-if="missing">Esta página não está publicada.</p>
    <template v-else-if="data">
      <p class="brand">{{ data.page.identity.name }}</p>
      <h1 data-testid="site-hero">{{ data.page.hero.title }}</h1>
      <p>{{ data.page.hero.subtitle }}</p>
      <a v-if="data.page.hero.button" :href="data.page.hero.link">{{ data.page.hero.button }}</a>
      <section v-for="section in data.sections" :key="section.id">
        <h2>{{ section.title }}</h2>
        <p>{{ section.description }}</p>
      </section>
      <footer>
        <p>{{ data.page.footer.text }}</p>
        <p>{{ data.page.contact.email }}</p>
        <small>{{ data.page.footer.copyright }}</small>
      </footer>
    </template>
  </main>
</template>

<style scoped>
.site { min-height: 100vh; padding: 64px 24px; background: var(--canvas); color: var(--ink); font-family: Manrope, sans-serif; }
h1 { font-family: Fraunces, serif; font-size: clamp(2.4rem, 5vw, 4rem); max-width: 12ch; }
a { display: inline-flex; margin-top: 12px; background: var(--accent); color: var(--accent-ink); text-decoration: none; border-radius: 999px; padding: 12px 16px; }
</style>
