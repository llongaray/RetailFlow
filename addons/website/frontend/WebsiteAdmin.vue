<script setup lang="ts">
import { Badge, Button, Card, DataTable, FormField, Modal, PageHeader, SectionHeader } from '@retailflow/ui';
import { computed, onMounted, ref } from 'vue';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('rf_token') ?? '';
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error('Não foi possível guardar o website.');
  return response.json() as Promise<T>;
}

type Page = {
  identity: { name: string; logo: string; favicon: string; color: string };
  seo: { title: string; description: string; keywords: string; image: string };
  hero: { title: string; subtitle: string; image: string; button: string; link: string };
  contact: { phone: string; whatsapp: string; email: string; address: string; social: string };
  footer: { text: string; links: string; copyright: string };
};
type Section = { id: string; kind: string; title: string; description: string; image: string; order: number; status: string };

const page = ref<Page | null>(null);
const sections = ref<Section[]>([]);
const open = ref(false);
const notice = ref('');

async function load() {
  const result = await api<{ draft: Page; sections: Section[] }>('/api/v1/ext/website/settings');
  page.value = result.draft;
  sections.value = result.sections;
}

async function save() {
  if (!page.value) return;
  await api('/api/v1/ext/website/settings', { method: 'PUT', body: JSON.stringify({ page: page.value, sections: sections.value }) });
  notice.value = 'Rascunho guardado.';
  open.value = false;
  await load();
}

async function publish() {
  await api('/api/v1/ext/website/publish', { method: 'POST', body: '{}' });
  notice.value = 'Página publicada.';
  await load();
}

function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !page.value) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (page.value) page.value.hero.image = String(reader.result ?? '');
  };
  reader.readAsDataURL(file);
}

const rows = computed(() => sections.value.map((section) => [section.title, section.kind, section.status]));

onMounted(load);
</script>

<template>
  <PageHeader title="Website" text="A página pública lê só o que estiver publicado.">
    <Button kind="neutral" @click="open = true">Editar</Button>
    <Button @click="publish">Publicar</Button>
  </PageHeader>
  <p v-if="notice">{{ notice }}</p>
  <Card v-if="page">
    <SectionHeader title="Hero" />
    <p>{{ page.hero.title }}</p>
    <p>{{ page.hero.subtitle }}</p>
  </Card>
  <DataTable :columns="['Seção', 'Tipo', 'Estado']" :rows="rows" />
  <Modal :open="open" title="Editar website" @close="open = false">
    <template v-if="page">
      <SectionHeader title="Identidade" />
      <FormField v-model="page.identity.name" label="Nome" />
      <FormField v-model="page.identity.logo" label="Logo" />
      <FormField v-model="page.identity.favicon" label="Favicon" />
      <FormField v-model="page.identity.color" label="Cor" />
      <SectionHeader title="SEO" />
      <FormField v-model="page.seo.title" label="Title" />
      <FormField v-model="page.seo.description" label="Description" />
      <FormField v-model="page.seo.keywords" label="Keywords" />
      <FormField v-model="page.seo.image" label="OpenGraph" />
      <SectionHeader title="Hero" />
      <FormField v-model="page.hero.title" label="Título" />
      <FormField v-model="page.hero.subtitle" label="Subtítulo" />
      <FormField v-model="page.hero.button" label="Botão" />
      <FormField v-model="page.hero.link" label="Link" />
      <label class="rf-field">Imagem<input class="rf-input" type="file" accept="image/*" @change="onFile" /></label>
      <SectionHeader title="Contato" />
      <FormField v-model="page.contact.phone" label="Telefone" />
      <FormField v-model="page.contact.whatsapp" label="WhatsApp" />
      <FormField v-model="page.contact.email" label="E-mail" />
      <FormField v-model="page.contact.address" label="Endereço" />
      <FormField v-model="page.contact.social" label="Redes sociais" />
      <SectionHeader title="Rodapé" />
      <FormField v-model="page.footer.text" label="Texto" />
      <FormField v-model="page.footer.links" label="Links" />
      <FormField v-model="page.footer.copyright" label="Copyright" />
      <Badge v-for="section in sections" :key="section.id">{{ section.title }}</Badge>
      <Button @click="save">Guardar</Button>
    </template>
  </Modal>
</template>
