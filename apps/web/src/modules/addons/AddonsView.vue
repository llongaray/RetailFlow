<script setup lang="ts">
import { Badge, Button, Card, EmptyState, PageHeader } from '@retailflow/ui';
import { onMounted, ref } from 'vue';
import ExtensionSlot from '../../components/ExtensionSlot.vue';
import { api } from '../../services/http';

type Row = { name: string; displayName: string; availableVersion: string; installedVersion: string | null; state: string; error: string | null };

const rows = ref<Row[]>([]);

async function load() {
  rows.value = await api<Row[]>('/api/v1/addons');
}

async function setState(name: string, active: boolean) {
  await api(`/api/v1/addons/${name}/${active ? 'activate' : 'deactivate'}`, { method: 'POST', body: '{}' });
  await load();
}

onMounted(load);
</script>

<template>
  <PageHeader title="Addons" text="Ativar não apaga os dados. Um addon novo com tela exige novo build.">
    <ExtensionSlot name="page.header.actions" />
  </PageHeader>
  <EmptyState v-if="!rows.length" title="Nenhum addon" text="A pasta addons ainda não tem um manifesto válido." />
  <Card v-for="row in rows" :key="row.name">
    <header class="rf-row">
      <div>
        <strong>{{ row.displayName }}</strong>
        <p class="rf-muted">{{ row.installedVersion ?? 'não instalado' }} · disponível {{ row.availableVersion }}</p>
        <p v-if="row.error">{{ row.error }}</p>
      </div>
      <Badge :tone="row.state === 'ACTIVE' ? 'ok' : row.state === 'ERROR' || row.state === 'INCOMPATIBLE' ? 'danger' : 'neutral'">{{ row.state }}</Badge>
    </header>
    <Button v-if="row.state !== 'ACTIVE'" @click="setState(row.name, true)">Ativar</Button>
    <Button v-else kind="neutral" @click="setState(row.name, false)">Desativar</Button>
  </Card>
  <ExtensionSlot name="settings.sections" />
</template>
