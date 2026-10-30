<script lang="ts" module>
  export type Cell = string | number;

  export type RenderRow = Cell[];

  export interface Column<T> {
    header: string;
    format?: (row: T) => Cell;
    width?: string;
    sortable?: boolean;
    compare?: (a: RenderRow, b: RenderRow) => number;
    primaryKey?: true;
    placeholder?: string;
  }

  const defaultCompare = (index: number) => (a: RenderRow, b: RenderRow) => {
    const x = a[index];
    const y = b[index];
    return x < y ? -1 : x > y ? 1 : 0;
  };

  export const toRenderRow = <T,>(columns: Column<T>[], data: T, index: number): RenderRow =>
    columns.map((c) => (c.format !== undefined ? c.format(data) : index + 1));

  const FLUSH_MS = 100;
  const MAX_ROWS = 100_000;

  export const createBatchedRows = () => {
    const all: RenderRow[] = []; // non-reactive
    let rows: RenderRow[] = $state.raw([]);
    let total = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
      clearTimeout(timeout);
      timeout = undefined;
    };

    const flush = () => {
      timeout = undefined;
      all.splice(0, Math.max(0, all.length - MAX_ROWS));
      rows = [...all];
    };

    return {
      get rows() {
        return rows;
      },

      get latestIndex() {
        return total;
      },

      append(row: RenderRow) {
        total++;
        all.push(row);
        timeout ??= setTimeout(flush, FLUSH_MS);
      },

      clear() {
        cancel();
        all.length = 0;
        total = 0;
        rows = [];
      },

      destroy: cancel,
    };
  };
</script>

<script lang="ts" generics="T">
  import { tick, type Snippet } from 'svelte';
  import {
    ArrowDown,
    ArrowDownUp,
    ArrowDownToLine,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    FunnelX,
    Search,
  } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    columns: Column<T>[];
    rows: RenderRow[];
    toolbar?: Snippet;
    groupable?: boolean;
    searcheable?: boolean;
  }

  let { columns, rows, toolbar, groupable = false, searcheable = false }: Props = $props();

  let scrollTop = $state(0);
  let height = $state(0);
  let scrollElement: HTMLDivElement | null = $state(null);

  let stickToBottom = $state(true);

  const ROW_HEIGHT = 30;
  const OVERSCAN = 10;

  const MAX_SCROLL_HEIGHT = 1_000_000;

  const GROUPABLE_MODES = ['Chronological', 'Grouped'] as const;

  type GroupableMode = (typeof GROUPABLE_MODES)[number];

  const columnByIndex = $derived(
    Object.fromEntries(columns.map((c, index) => [c.header.toLowerCase(), index])),
  );

  let groupableMode = $state<GroupableMode>('Chronological');

  let search = $state('');

  type Matcher = (t: RenderRow) => boolean;

  const { matcher, invalid }: { matcher: Matcher; invalid: string[] } = $derived.by(() => {
    const matchers: Matcher[] = [];
    const invalid: string[] = [];

    search
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        const [field, rest = ''] = t.split(':').map((s) => s.trim());
        const index = columnByIndex[field.toLowerCase()];

        if (index == undefined || !rest) {
          invalid.push(t);
          return;
        }

        matchers.push((row) => String(row[index]).toLowerCase().includes(rest.toLowerCase()));
      });

    return { matcher: (t: RenderRow) => matchers.every((m) => m(t)), invalid };
  });

  const filteredRows = $derived(rows.filter(matcher));

  const primaryColumnIndex = $derived.by(() => {
    const index = columns.findIndex((c) => c.primaryKey);
    return index !== -1 ? index : 0;
  });

  interface Item {
    row: RenderRow;
    key: Cell;
    count: number;
    child: boolean;
    expanded: boolean;
  }

  const expandedKeys = new SvelteSet<Cell>();

  const items: Item[] = $derived.by(() => {
    if (groupableMode === 'Chronological') {
      return filteredRows.map((row) => ({
        row,
        key: row[primaryColumnIndex],
        count: 1,
        child: false,
        expanded: false,
      }));
    }

    const groups = new Map<Cell, RenderRow[]>();
    filteredRows.forEach((row) => {
      const key = row[primaryColumnIndex];
      const group = groups.get(key);
      if (group) {
        group.push(row);
      } else {
        groups.set(key, [row]);
      }
    });

    const result: Item[] = [];
    groups.forEach((group, key) => {
      const expanded = expandedKeys.has(key);
      result.push({
        row: group[group.length - 1],
        key,
        count: group.length,
        child: false,
        expanded,
      });

      if (expanded) {
        for (let i = group.length - 2; i >= 0; i--) {
          result.push({ row: group[i], key, count: group.length, child: true, expanded: false });
        }
      }
    });

    return result;
  });

  type SortDirection = 'asc' | 'desc';

  let sort = $state<{ index: number; direction: SortDirection } | null>(null);

  const grouping = $derived(groupable && groupableMode === 'Grouped');

  const activeSort = $derived(
    grouping
      ? {
          index: primaryColumnIndex,
          direction: sort?.index === primaryColumnIndex ? sort.direction : 'asc',
        }
      : sort,
  );

  const toggleSort = (index: number) => {
    if (grouping) {
      sort = { index, direction: activeSort?.direction === 'asc' ? 'desc' : 'asc' };
    } else if (sort?.index !== index) {
      sort = { index, direction: 'asc' };
    } else if (sort.direction === 'asc') {
      sort = { index, direction: 'desc' };
    } else {
      sort = null;
    }
  };

  const sortedItems = $derived.by(() => {
    if (!activeSort || !items.length) return items;

    const { index, direction } = activeSort;
    const base = columns[index]?.compare ?? defaultCompare(index);
    const sign = direction === 'asc' ? 1 : -1;
    const compare = (a: RenderRow, b: RenderRow) => sign * base(a, b);

    if (groupableMode === 'Chronological') {
      return items.toSorted((a, b) => compare(a.row, b.row));
    }

    const result: Item[] = [];
    const groups: Item[][] = [];
    for (const item of items) {
      if (item.child) groups[groups.length - 1].push(item);
      else groups.push([item]);
    }
    groups.sort((a, b) => compare(a[0].row, b[0].row));
    for (const group of groups) for (const item of group) result.push(item);
    return result;
  });

  const totalHeight = $derived((sortedItems.length + 1) * ROW_HEIGHT);
  const scrollHeight = $derived(Math.min(totalHeight, MAX_SCROLL_HEIGHT));
  const scale = $derived(
    scrollHeight > height ? Math.max(1, (totalHeight - height) / (scrollHeight - height)) : 1,
  );
  const scrollPosition = $derived(Math.min(scrollTop, Math.max(0, scrollHeight - height)));
  const top = $derived(scrollPosition * scale);
  const first = $derived(Math.max(0, Math.floor(top / ROW_HEIGHT) - OVERSCAN));
  const last = $derived(
    Math.min(sortedItems.length, Math.ceil((top + height) / ROW_HEIGHT) + OVERSCAN),
  );
  const offset = $derived(scrollPosition + first * ROW_HEIGHT - top);

  const updateStickToBottom = () => {
    if (!scrollElement) return;
    stickToBottom =
      scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight <
      ROW_HEIGHT * OVERSCAN;
  };

  const onscroll = () => {
    scrollTop = scrollElement!.scrollTop;
    updateStickToBottom();
  };

  const toggleGroupFold = (key: Cell) => {
    if (expandedKeys.delete(key)) {
      tick().then(updateStickToBottom);
    } else {
      expandedKeys.add(key);
      stickToBottom = false;
    }
  };

  $effect(() => {
    rows.length;
    groupableMode;
    activeSort;
    if (stickToBottom && scrollElement) {
      tick().then(() => (scrollElement!.scrollTop = scrollElement!.scrollHeight));
    }
  });
</script>

<div class="data-table-wrapper">
  <div class="toolbar">
    {@render toolbar?.()}
    {#if groupable}
      <div class="groupable">
        {#each GROUPABLE_MODES as mode}
          <button class:active={mode === groupableMode} onclick={() => (groupableMode = mode)}>
            {mode}
          </button>
        {/each}
      </div>
    {/if}
    {#if searcheable}
      <label
        class="search"
        class:invalid={invalid.length !== 0}
        title={invalid.length !== 0
          ? `Could not understand: ${invalid.join(', ')}`
          : `Comma separated terms. Keys: ${columns
              .map((c) => c.header.toLowerCase())
              .join(', ')}.`}
      >
        <Search size={14} />
        <input
          type="text"
          spellcheck="false"
          placeholder={columns
            .map((c) => c.placeholder)
            .filter(Boolean)
            .join(', ')}
          bind:value={search}
        />
      </label>
      <button class="toolbar-button" disabled={search === ''} onclick={() => (search = '')}>
        <FunnelX size={14} />
      </button>
    {/if}
    <button
      class="toolbar-button"
      disabled={stickToBottom}
      title="Scroll to latest"
      onclick={() => {
        stickToBottom = true;
        if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
      }}
    >
      <ArrowDownToLine size={14} />
    </button>
  </div>
  {#if rows.length}
    <div
      class="data-table"
      style:--columns={columns.map((column) => column.width ?? '1fr').join(' ')}
      bind:this={scrollElement}
      bind:clientHeight={height}
      {onscroll}
    >
      <div class="row header" style:height="{ROW_HEIGHT}px">
        {#each columns as column, index}
          {#if column.sortable && (!grouping || index === primaryColumnIndex)}
            {@const direction = activeSort?.index === index ? activeSort.direction : null}
            {@const Icon =
              direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowDownUp}
            <button class="sort" class:active={direction} onclick={() => toggleSort(index)}>
              <Icon size={12} />
              {column.header}
            </button>
          {:else}
            <div>{column.header}</div>
          {/if}
        {/each}
      </div>
      <div class="viewport" style:height="{scrollHeight - ROW_HEIGHT}px">
        <div class="rows" style:transform="translateY({offset}px)">
          {#each sortedItems.slice(first, last) as item, i (first + i)}
            <div class="row" class:child={item.child} style:height="{ROW_HEIGHT}px">
              {#each item.row as value, column}
                <div>
                  {#if grouping && column === 0}
                    {#if !item.child && item.count > 1}
                      {@const Chevron = item.expanded ? ChevronDown : ChevronRight}
                      <button
                        class="fold"
                        title="{item.expanded ? 'Fold' : 'Unfold'} ({item.count} rows)"
                        onclick={() => toggleGroupFold(item.key)}
                      >
                        <Chevron size={14} />
                      </button>
                    {:else}
                      <span class="fold"></span>
                    {/if}
                  {/if}
                  {value}
                  {#if grouping && !item.child && column === primaryColumnIndex}
                    ({item.count})
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="empty">No data</div>
  {/if}
</div>

<style>
  .data-table-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: white;
    font-family: monospace;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    background: #171717;
    width: 100%;
  }

  .empty {
    flex: 1 1 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .groupable {
    display: flex;
    flex-shrink: 0;
    padding: 2px;
    border-radius: 6px;
    background-color: #0c0c0d;
    border: 1px solid #28282a;
  }

  .groupable button {
    padding: 1px 8px;
    border: none;
    border-radius: 4px;
    background: none;
    color: #9e9ea4;
  }

  .groupable button.active {
    background-color: #373739;
  }

  .data-table {
    position: relative;
    flex: 1 1 0;
    width: 100%;
    min-height: 0;
    overflow: auto;
    overflow-anchor: none;
  }

  .viewport {
    position: relative;
  }

  .rows {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .row {
    display: grid;
    grid-template-columns: var(--columns);
    padding: 0 16px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    text-align: left;
    border-bottom: 1px solid #242424;
    align-items: center;
  }

  .row.child {
    color: #9e9ea4;
    background: #131314;
  }

  .sort {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .fold {
    display: inline-flex;
    vertical-align: middle;
    width: 14px;
    margin-right: 6px;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg-muted);
    color: #9e9ea4;
  }

  .search {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 6px;
    background-color: #141415;
    border: 1px solid #373739;
  }

  .search:focus-within {
    border-color: #6b6b6f;
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    color: #ececee;
    font: inherit;
  }

  .search input::placeholder {
    color: #666666;
  }

  .search.invalid {
    border-color: #dd4947;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    flex-shrink: 0;
    padding: 3px 6px;
    border: none;
    background: none;
  }

  .toolbar-button:hover:not(:disabled) {
    color: #ececee;
  }

  .toolbar-button:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
