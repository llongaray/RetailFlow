<script setup lang="ts">
defineProps<{ title: string; text?: string }>();
</script>
<template><div class="rf-empty"><h2>{{ title }}</h2><p class="rf-muted">{{ text }}</p></div></template>
