<script setup lang="ts">
import { computed } from 'vue';
import {
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Receipt,
  Share2,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-vue-next';

const props = defineProps<{ name: string }>();

const icons: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/welcome': Sun,
  '/customers': Users,
  '/catalog': Layers,
  '/sales': Receipt,
  '/sales/new': Plus,
  '/credit': CreditCard,
  '/support': MessageCircle,
  '/audit': FileText,
};

const icon = computed(() => icons[props.name] ?? Share2);
</script>

<template>
  <component :is="icon" class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
</template>
