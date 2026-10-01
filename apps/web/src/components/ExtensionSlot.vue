<script setup lang="ts">
import { computed } from 'vue';
import { panelExtensions } from '../extensions/registry';

const props = defineProps<{ name: string }>();
const items = computed(() => panelExtensions.slots[props.name] ?? []);
</script>

<template>
  <component :is="item.component" v-for="item in items" :key="item.id" />
</template>
