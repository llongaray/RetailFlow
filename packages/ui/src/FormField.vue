<script setup lang="ts">
defineProps<{ label: string; modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
</script>
<template>
  <label class="rf-field">{{ label }}<input class="rf-input" :value="modelValue" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" /></label>
</template>
