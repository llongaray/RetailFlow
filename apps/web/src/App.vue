<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from './layouts/AppShell.vue';
import { useSession } from './stores/session';

const route = useRoute();
const session = useSession();
const bare = computed(() => route.path === '/login');
</script>

<template>
  <RouterView v-if="bare" />
  <AppShell v-else><RouterView /></AppShell>
  <div class="toasts">
    <div v-for="toast in session.toasts" :key="toast.id" class="toast" :class="toast.tone">{{ toast.text }}</div>
  </div>
</template>
