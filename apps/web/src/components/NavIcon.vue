<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === '/'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </template>
    <template v-else-if="name === '/welcome'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
    </template>
    <template v-else-if="name === '/customers'">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.2c1.4-3 3.8-4.4 7-4.4s5.6 1.4 7 4.4" />
    </template>
    <template v-else-if="name === '/catalog'">
      <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" />
      <path d="M4 12.2 12 15.7l8-3.5" />
      <path d="M4 16.5 12 20l8-3.5" />
    </template>
    <template v-else-if="name === '/sales'">
      <path d="M7 3.5h10v17l-2.2-1.5L12 20.5l-2.8-1.5L7 20.5v-17Z" />
      <path d="M10 8h4M10 11.5h4M10 15h2.5" />
    </template>
    <template v-else-if="name === '/sales/new'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.5v7M8.5 12h7" />
    </template>
    <template v-else-if="name === '/credit'">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </template>
    <template v-else-if="name === '/support'">
      <path d="M6 16.5 4 19v-4.2A7 7 0 1 1 12 19H8.5" />
    </template>
    <template v-else-if="name === '/audit'">
      <path d="M8 3.5h8l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 16h6" />
    </template>
    <template v-else>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="7" r="2.2" />
      <circle cx="18" cy="17" r="2.2" />
      <path d="M8 11.2 15.8 8M8 12.8l7.8 3.2" />
    </template>
  </svg>
</template>
