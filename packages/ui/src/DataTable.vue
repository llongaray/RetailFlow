<script setup lang="ts">
defineProps<{ columns: string[]; rows: string[][] }>();
</script>
<template>
  <table class="rf-table">
    <thead><tr><th v-for="column in columns" :key="column">{{ column }}</th></tr></thead>
    <tbody><tr v-for="(row, index) in rows" :key="index"><td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td></tr></tbody>
  </table>
</template>
