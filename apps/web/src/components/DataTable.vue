<script setup lang="ts" generic="T extends { id: string }">
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/vue-table';
import { ChevronLeft, ChevronRight, Download } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const props = defineProps<{
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  filename: string;
  loading?: boolean;
  facet?: {
    label: string;
    options: { value: string; label: string }[];
    match: (row: T, value: string) => boolean;
  };
}>();

const sorting = ref<SortingState>([]);
const globalFilter = ref('');
const data = computed(() => props.rows);

const table = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return props.columns;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
    get globalFilter() {
      return globalFilter.value;
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater;
  },
  onGlobalFilterChange: (updater) => {
    globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater;
  },
  globalFilterFn: (row, _columnId, filterValue) => {
    if (!filterValue || !props.facet) return true;
    return props.facet.match(row.original, String(filterValue));
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getRowId: (row) => row.id,
  initialState: { pagination: { pageSize: 8 } },
});

function escape(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download() {
  const headers = table.getVisibleLeafColumns().map((column) => {
    const header = column.columnDef.header;
    return typeof header === 'string' ? header : column.id;
  });
  const lines = table.getRowModel().rows.map((row) => row.getVisibleCells().map((cell) => escape(cell.getValue())).join(';'));
  const blob = new Blob([`\uFEFF${[headers.join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = props.filename;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="card grid">
    <div class="row">
      <label v-if="facet" class="field">{{ facet.label }}
        <select v-model="globalFilter">
          <option value="">Todas</option>
          <option v-for="option in facet.options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <button class="btn icon" type="button" aria-label="Exportar" title="Exportar" @click="download">
        <Download class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr v-for="group in table.getHeaderGroups()" :key="group.id">
            <th v-for="header in group.headers" :key="header.id">
              <button v-if="header.column.getCanSort()" class="sort" type="button" @click="header.column.getToggleSortingHandler()?.($event)">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              </button>
              <FlexRender v-else :render="header.column.columnDef.header" :props="header.getContext()" />
            </th>
            <th v-if="$slots.actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.getRowModel().rows" :key="row.id">
            <td v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </td>
            <td v-if="$slots.actions"><slot name="actions" :row="row.original" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="loading" class="empty">Carregando…</p>
    <p v-else-if="!table.getRowModel().rows.length" class="empty">Nenhum registro nesta página.</p>
    <div class="pager">
      <button class="btn icon" type="button" aria-label="Anterior" title="Anterior" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
        <ChevronLeft class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
      </button>
      <span>{{ table.getState().pagination.pageIndex + 1 }} de {{ table.getPageCount() || 1 }}</span>
      <button class="btn icon" type="button" aria-label="Próxima" title="Próxima" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
        <ChevronRight class="nav-icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
