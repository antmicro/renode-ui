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
    predefinedMachine?: string;
    predefinedUart?: string;
  }
  const { panelType, predefinedMachine, predefinedUart, api }: Props = $props();

  const wsManager = getRenodeWSManager();

  export const installHterm = (panelType: PanelType, machine?: string, uart?: string) => {
    return (element: HTMLElement) => {
      const termEndpoint = typeToEndpoint(panelType, undefined, machine, uart);
      const term = new ExtendedHterm({
        profileId: panelType,
        interactible: panelType === 'Monitor' || panelType === 'UARTs',
        metadata: { panelType },
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

      const wsURL = typeToWsURL(panelType, undefined, machine, uart);
      getSocketConsole(wsURL, uart !== undefined ? `Analyzer (${uart})` : panelType)
        .then((con) => term.install(element, con))
        .then(() => {
          decrementLoadingTerminalsAmount();
          TERMINALS.value.push(term);
        });

      return () => {
        TERMINALS.value = TERMINALS.value.filter((t) => t !== term);
        term.close();
      };
    };
  };
</script>

<div
  data-test-id={panelType}
  class="hterm-install-point"
  {@attach installHterm(panelType, predefinedMachine, predefinedUart)}
></div>

<style>
  .hterm-install-point {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
