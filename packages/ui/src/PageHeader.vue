<script setup lang="ts">
defineProps<{ title: string; text?: string }>();
</script>
<template><header class="rf-page rf-row"><div><h1>{{ title }}</h1><p>{{ text }}</p></div><slot /></header></template>
