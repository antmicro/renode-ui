<script lang="ts">
  import {
    decrementLoadingTerminalsAmount,
    TERMINALS,
    terminalHistories,
    type PanelType,
  } from '$lib/store.svelte';
  import { ExtendedHterm } from './ExtendedHterm';
  import { typeToWsURL } from '$lib/utils';
  import { getSocketInitializer } from '$lib/store.svelte';

  interface Props {
    panelType: PanelType;
    port?: number;
    predefinedUart?: string;
  }
  const { panelType, port, predefinedUart }: Props = $props();

  export const installHterm = (panelType: PanelType, port?: number, uart?: string) => {
    return (element: HTMLElement) => {
      const history = terminalHistories.getOrCreate(panelType, port, uart);
      const term = new ExtendedHterm({
        profileId: panelType,
        interactible: panelType === 'Monitor' || panelType === 'UARTs',
        metadata: { panelType, port, uart },
        history,
      });

      const wsURL = typeToWsURL(panelType, port);
      const socketInitializer = getSocketInitializer();
      socketInitializer(wsURL, uart !== undefined ? `Analyzer (${uart})` : panelType)
        .then((socket) => term.install(element, socket))
        .then(() => {
          decrementLoadingTerminalsAmount();
          TERMINALS.value.push(term);
        });

      return () => {
        TERMINALS.value = TERMINALS.value.filter(
          (term) => !term.metadataMatches(panelType, port, uart),
        );
        term.close();
      };
    };
  };
</script>

<div
  data-test-id={panelType}
  class="hterm-install-point"
  {@attach installHterm(panelType, port, predefinedUart)}
></div>

<style>
  .hterm-install-point {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
