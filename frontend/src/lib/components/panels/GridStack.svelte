<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';

  import 'gridstack/dist/gridstack.min.css';
  import { GridStack, type GridStackOptions } from 'gridstack';
  import { setGridStackContext, type GridStackContext } from './context';

  let container: HTMLElement;
  let context: GridStackContext = $state({});

  type Props = Omit<GridStackOptions, 'children' | 'auto'> & { children?: Snippet };

  let { children, ...options }: Props = $props();

  $effect(() => {
    if (context.grid) return;

    context.grid = GridStack.init({ ...options, auto: false }, container)!;
  });

  onDestroy(() => {
    context.grid?.destroy();
  });

  $effect(() => {
    if (context.grid) {
      context.grid.updateOptions(options);
    }
  });

  setGridStackContext(context);
</script>

<div class="grid-stack" bind:this={container}>
  {@render children?.()}
</div>

<style>
  .grid-stack {
    width: 100%;
    height: 100%;
  }
</style>
