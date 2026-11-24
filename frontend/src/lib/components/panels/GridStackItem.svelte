<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import '$lib/aesir/src/styles/aesir-global.css';

  import { getGridStackContext } from './context';
  import type { GridItemHTMLElement, GridStackWidget } from 'gridstack';

  let element: HTMLElement | null = $state(null);
  let gridElement: GridItemHTMLElement | null = null;

  type Props = Omit<GridStackWidget, 'content'> & { children?: Snippet; header?: string };

  let { children, header, ...options }: Props = $props();
  const context = getGridStackContext();

  $effect(() => {
    if (context.grid && element && !gridElement) {
      gridElement = context.grid.makeWidget(element, { ...options });
    }
  });

  onDestroy(() => {
    if (context.grid && gridElement) {
      context.grid.removeWidget(gridElement, false, false);
      gridElement = null;
    }
  });
</script>

<div class="grid-stack-item" bind:this={element}>
  <div class={['grid-stack-item-content', header ? 'content-group' : 'content-standalone']}>
    {#if header}
      <div class="header" title={header}>
        <span class="header-text">{header}</span>
      </div>
    {/if}
    <div class="content">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  :global(.grid-stack-item > .ui-resizable-se) {
    transform: rotate(-90deg) !important;
    margin-right: 4px;
  }

  .grid-stack-item-content {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ds-border);
  }

  .header {
    display: flex;
    color: #ebebeb;
    background-color: var(--ds-background-secondary);
    height: 32px;
    min-height: 32px;
    padding: 0 20px;
    font-family: 'Inter';
    font-size: 14px;
    font-weight: bold;
    align-items: center;
    border-bottom: 1px solid var(--ds-border);
  }

  .header-text {
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .content-group > .content {
    padding: 10px;
  }

  .content-standalone > .content {
    padding: 10px 20px;
  }

  .grid-stack-item-content.content-group {
    color: #a1a1a1;
    background-color: #000000;
  }

  .grid-stack-item-content.content-standalone {
    color: #ebebeb;
    background-color: var(--ds-background-secondary);
  }
</style>
