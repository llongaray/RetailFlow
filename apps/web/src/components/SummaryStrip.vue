<script setup lang="ts">
defineProps<{ items: { label: string; value: string }[] }>();
</script>

<template>
  <section class="summary">
    <article v-for="item in items" :key="item.label">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </article>
  </section>
</template>
