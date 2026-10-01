<script setup lang="ts">
defineProps<{ modelValue?: string; label?: string; type?: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
</script>
<template>
  <label class="rf-field">{{ label }}<input class="rf-input" :type="type ?? 'text'" :value="modelValue" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" /></label>
</template>
