<script lang="ts">
  import type { PanelType } from '$lib/store.svelte';
  import { typeToComponent } from '$lib/utils';
  import type { Component } from 'svelte';

  interface Props {
    panelType: PanelType;
    port?: number;
    predefinedMachine?: string;
    predefinedUart?: string;
  }

  const props: Props = $props();

  let PanelComponent = $derived(typeToComponent(props.panelType) as Component<Props>);
</script>

<PanelComponent {...props}></PanelComponent>
