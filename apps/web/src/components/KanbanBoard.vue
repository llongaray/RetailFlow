<script setup lang="ts">
import dragula from 'dragula';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export type KanbanCard = { id: string; title: string; detail: string; href?: string };
export type KanbanColumn = { id: string; title: string; cards: KanbanCard[] };

const props = defineProps<{ columns: KanbanColumn[]; readonly?: boolean }>();
const emit = defineEmits<{ move: [payload: { id: string; from: string; to: string }] }>();

const containers = ref(new Map<string, HTMLElement>());
let drake: dragula.Drake | undefined;

function setRoot(id: string, element: Element | { $el?: Element } | null) {
  if (element instanceof HTMLElement) containers.value.set(id, element);
  else containers.value.delete(id);
}

function bind() {
  drake?.destroy();
  const nodes = [...containers.value.values()];
  if (!nodes.length) return;
  drake = dragula(nodes, {
    moves: () => !props.readonly,
  });
  drake.on('drop', (element, target, source) => {
    if (!(element instanceof HTMLElement) || !(target instanceof HTMLElement) || !(source instanceof HTMLElement) || target === source) return;
    const id = element.dataset.id ?? '';
    const to = target.dataset.column ?? '';
    const from = source.dataset.column ?? '';
    source.appendChild(element);
    emit('move', { id, from, to });
  });
}

onMounted(() => void nextTick(bind));
watch(
  () => props.columns.map((column) => `${column.id}:${column.cards.map((card) => card.id).join(',')}`).join('|'),
  () => void nextTick(bind),
);
onBeforeUnmount(() => drake?.destroy());
</script>

<template>
  <div class="kanban">
    <section v-for="column in columns" :key="column.id" class="kanban-col">
      <h2>{{ column.title }} <span>{{ column.cards.length }}</span></h2>
      <div class="kanban-list" :data-column="column.id" :ref="(element) => setRoot(column.id, element)">
        <article v-for="card in column.cards" :key="card.id" class="kanban-card" :data-id="card.id">
          <strong>{{ card.title }}</strong>
          <p>{{ card.detail }}</p>
          <RouterLink v-if="card.href" :to="card.href">Abrir</RouterLink>
        </article>
        <p v-if="!column.cards.length" class="empty">Vazio</p>
      </div>
    </section>
  </div>
</template>
