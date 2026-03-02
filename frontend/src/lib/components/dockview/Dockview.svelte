<script lang="ts">
  import '$lib/assets/shared.css';
  import 'dockview-core/dist/styles/dockview.css';
  import './themeOverride.css';

  import { onDestroy, onMount } from 'svelte';
  import {
    clearTerminalsLoadingCounter,
    getRenodeWSManager,
    openPanelsManager,
    openUARTsManager,
    RENODE_WS_PORT,
    setRenodeWSManager,
    setSocketInitializer,
    type Socket,
  } from '$lib/store.svelte';
  import { RenodeProxySession, type UartOpenedArgs } from 'renode-ws-api';
  import LoadingScreen from '../loaders/LoadingScreen.svelte';
  import { cssStringify } from '$lib/utils';
  import {
    createDockviewApi,
    registerWSProxy,
    createPanel,
    focusMonitor,
    registerWSProxyCallbacks,
    createUartAndSensorPanels,
  } from './mount';
  import Error from '../loaders/Error.svelte';
  import type { DockviewApi } from 'dockview-core';

  interface RunInCloudProps {
    customProxyInitializer: () => Promise<RenodeProxySession>;
    customWsInitializer: (wsURL: string, name: string) => Promise<Socket>;
    getRestoreState?: () => Promise<UartOpenedArgs>;
  }

  interface Props {
    style: { [key: string]: string };
    onLoad?: (ws: RenodeProxySession) => void;
    onQuit?: () => void;
    onError?: () => void;
    loadingMessage?: string;
    runInCloud?: RunInCloudProps;
    renodePort?: number;
  }

  let { style, loadingMessage, onError, onLoad, onQuit, runInCloud, renodePort }: Props = $props();

  $effect(() => {
    if (renodePort) RENODE_WS_PORT.value = renodePort;
  });

  let dockElement: HTMLElement;
  let isLoading = $state(true);
  let loadingError: string | null = $state(null);
  let dockview: DockviewApi | undefined;

  const createUI = async () => {
    try {
      loadingError = null;

      const proxyInitializer =
        typeof runInCloud?.customProxyInitializer === 'function'
          ? runInCloud.customProxyInitializer
          : registerWSProxy;

      const retries = 4;
      for (let i = 0; i <= retries; i++) {
        try {
          setRenodeWSManager(await proxyInitializer());
          break;
        } catch (e) {
          if (i == retries) {
            throw e;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      if (runInCloud?.customWsInitializer) {
        setSocketInitializer(runInCloud?.customWsInitializer);
      }

      dockview = createDockviewApi(dockElement);
      registerWSProxyCallbacks({ dockview, onQuit });

      await createPanel({ panelType: 'Monitor', dockview });
      await createPanel({ panelType: 'Renode Logs', dockview });

      const uartArgs = await runInCloud?.getRestoreState?.();
      if (uartArgs) {
        await createUartAndSensorPanels({ dockview, uartArgs });
      }

      focusMonitor(dockview);

      isLoading = false;
      onLoad?.(getRenodeWSManager());
    } catch (e) {
      dockview?.dispose();
      loadingError = String(e);
      console.error(e);
      onError?.();
    }
  };

  onMount(() => createUI());
  onDestroy(() => {
    getRenodeWSManager().dispose();
    openPanelsManager.clear();
    openUARTsManager.clear();
    clearTerminalsLoadingCounter();
    dockview?.dispose();
  });
</script>

<div class="main__hterm" style={cssStringify({ position: 'relative', ...style })}>
  <div class="main" bind:this={dockElement}></div>
  {#if isLoading}
    <div class="loader" data-test-id="loader">
      {#if !loadingError}
        <LoadingScreen {loadingMessage} />
      {:else}
        <Error error={loadingError} onRetry={() => createUI()} />{/if}
    </div>
  {/if}
</div>

<style>
  .main__hterm {
    height: 100vh;
    width: 100vw;
  }

  .main {
    height: 100%;
    width: 100%;
    border: 0;
  }

  .loader {
    position: absolute;
    top: 0;
    height: 100%;
    width: 100%;
  }
</style>
