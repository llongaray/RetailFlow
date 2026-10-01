<script setup lang="ts">
defineProps<{ text: string }>();
</script>
<template><p class="rf-toast" role="status">{{ text }}</p></template>
