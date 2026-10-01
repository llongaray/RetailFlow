<script setup lang="ts">
defineProps<{ text: string }>();
</script>
<template><span class="rf-tip"><slot /><span>{{ text }}</span></span></template>
