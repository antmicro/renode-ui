<script lang="ts">
  import {
    decrementLoadingTerminalsAmount,
    TERMINALS,
    type PanelType,
    getRenodeWSManager,
    getSocketConsole,
  } from '$lib/store.svelte';
  import { ExtendedHterm } from './ExtendedHterm';
  import { typeToEndpoint, typeToWsURL } from '$lib/utils';
  import type { DockviewPanelApi } from 'dockview-core';

  interface Props {
    panelType: PanelType;
    api: DockviewPanelApi;
    port?: number;
    predefinedUart?: string;
  }
  const { panelType, port, predefinedUart, api }: Props = $props();

  const wsManager = getRenodeWSManager();

  export const installHterm = (panelType: PanelType, port?: number, uart?: string) => {
    return (element: HTMLElement) => {
      const termEndpoint = typeToEndpoint(panelType, port);
      const term = new ExtendedHterm({
        profileId: panelType,
        interactible: panelType === 'Monitor' || panelType === 'UARTs',
        metadata: { panelType, port, uart },
        onResize: (width, height) => {
          wsManager.resizeTerminal(termEndpoint, width, height);
        },
        onFocus: () => {
          api.setActive();
        },
      });

      api.onDidActiveChange((e) => {
        if (e.isActive) {
          term.focus();
        }
      });

      const wsURL = typeToWsURL(panelType, port);
      getSocketConsole(wsURL, uart !== undefined ? `Analyzer (${uart})` : panelType)
        .then((con) => term.install(element, con))
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
