<script setup lang="ts">
defineProps<{ tabs: string[]; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
</script>
<template>
  <div class="rf-tabs rf-row">
    <button v-for="tab in tabs" :key="tab" class="rf-button" :class="tab === modelValue ? 'primary' : ''" type="button" @click="emit('update:modelValue', tab)">{{ tab }}</button>
  </div>
</template>
