<script setup lang="ts">
defineProps<{ modelValue?: boolean; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();
</script>
<template>
  <label class="rf-check"><input type="checkbox" :checked="modelValue" @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)" /> {{ label }}</label>
</template>
