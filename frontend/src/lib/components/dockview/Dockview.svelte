<script lang="ts">
  import '$lib/assets/shared.css';
  import 'dockview-core/dist/styles/dockview.css';
  import './themeOverride.css';

  import { onDestroy, onMount } from 'svelte';
  import {
    clearTerminalsLoadingCounter,
    getRenodeWSManager,
    openDisplaysManager,
    openPanelsManager,
    RENODE_WS_PORT,
    ACTIONS_MANAGER,
    setRenodeWSManager,
    setSocketInitializer,
    type PanelType,
    type SocketInitializerFn,
    KEYBOARD_MANAGER,
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
    customWsInitializer: SocketInitializerFn;
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

  const DOCKVIEW_NAMESPACE = 'node';

  let dockElement: HTMLElement;
  let isLoading = $state(true);
  let loadingError: string | null = $state(null);
  let dockview: DockviewApi | undefined;

  type GroupNavigationDirection = 'left' | 'right' | 'above' | 'below';

  function findGroupInDirection(
    group: DockviewGroupPanel,
    direction: GroupNavigationDirection,
  ): DockviewGroupPanel | undefined {
    if (group.api.location.type !== 'grid') {
      return undefined;
    }

    const { x, y, width, height } = group.element.getBoundingClientRect();
    const maxX = x + width,
      maxY = y + height;

    let isCandidate;
    if (direction == 'left' || direction == 'right') {
      isCandidate = (bbox: DOMRect) => {
        if (direction == 'right' && bbox.x < maxX) return false;
        if (direction == 'left' && bbox.x + bbox.width > x) return false;

        return Math.max(y, bbox.y) < Math.min(maxY, bbox.y + bbox.height);
      };
    } else {
      isCandidate = (bbox: DOMRect) => {
        if (direction == 'below' && bbox.y < maxY) return false;
        if (direction == 'above' && bbox.y + bbox.height > y) return false;

        return Math.max(x, bbox.x) < Math.min(maxX, bbox.x + bbox.width);
      };
    }

    let candidates: any[] = [];
    for (const candidate of dockview!.groups) {
      if (candidate === group || candidate.api.location.type !== 'grid') {
        continue;
      }
      const rect = candidate.element.getBoundingClientRect();
      if (!isCandidate(rect)) {
        continue;
      }

      candidates.push({ group: candidate, rect });
    }

    if (candidates.length === 0) {
      return;
    }

    candidates.sort((a, b) => {
      let cmp;

      switch (direction) {
        case 'left':
          cmp = b.rect.x + b.rect.width - a.rect.x - a.rect.width;
          break;
        case 'right':
          cmp = a.rect.x - b.rect.x;
          break;
        case 'above':
          cmp = b.rect.y + b.rect.height - a.rect.y - a.rect.height;
          break;
        case 'below':
          cmp = a.rect.y - b.rect.y;
          break;
      }

      if (cmp != 0) return cmp;

      switch (direction) {
        case 'left':
        case 'right':
          return a.rect.y - b.rect.y;
        case 'above':
        case 'below':
          return a.rect.x - b.rect.x;
      }
    });

    return candidates[0].group;
  }

  const registerActions = (dockview: DockviewApi) => {
    const namespace = ACTIONS_MANAGER.registerNamespace(DOCKVIEW_NAMESPACE);

    const getPanelByIdOrActive = (panelId?: string): IDockviewPanel | undefined => {
      let panel;
      if (panelId !== undefined) {
        panel = dockview.getPanel(panelId);
        if (panel === undefined) {
          return;
        }
      } else {
        panel = dockview.activePanel;
      }

      return panel;
    };

    namespace.registerAction(
      'create',
      async ({
        panelType = 'Empty',
        keepFocus = false,
      }: {
        panelType: PanelType;
        keepFocus: boolean;
      }) => {
        await createPanel({
          dockview,
          panelType,
          keepFocus,
        });
      },
      { description: 'Create new node' },
    );

    namespace.registerAction(
      'close',
      async ({ panelId }: { panelId?: string }) => {
        let panel = getPanelByIdOrActive(panelId);

        let isLastPanel = dockview.totalPanels == 1;
        if (panel && isLastPanel) {
          openPanelsManager.set(dockview.id, 'Empty');
          panel?.api.updateParameters({ panelType: 'Empty' });
          return;
        }

        panel?.api.close();
      },
      { description: 'Close node' },
    );

    namespace.registerAction(
      'split',
      async ({
        direction = 'right',
        keepFocus = false,
        panelId,
        panelType,
      }: {
        direction: GroupNavigationDirection;
        keepFocus: boolean;
        panelId?: string;
        panelType?: PanelType;
      }) => {
        let panel = getPanelByIdOrActive(panelId);
        let panelArguments = {
          dockview: dockview,
          panelType: panelType || panel?.params?.panelType,
          position: { referenceGroup: panel?.api.group, direction },
          keepFocus,
        };
        if (panelType === undefined) {
          panelArguments = { ...panelArguments, ...panel?.params };
        }

        await createPanel(panelArguments);
      },
      { description: 'Split panel' },
    );

    namespace.registerAction(
      'move',
      async ({
        panelId,
        direction,
      }: {
        panelId?: string;
        direction?: GroupNavigationDirection;
      }) => {
        let group: DockviewGroupPanel | undefined;
        if (panelId !== undefined) {
          group = dockview.getPanel(panelId)?.group;
        }
        if (direction !== undefined) {
          group = findGroupInDirection(dockview.activeGroup!, direction);
        }

        let position: Position;
        switch (direction) {
          case 'left':
            position = 'left';
            break;
          case 'right':
            position = 'right';
            break;
          case 'above':
            position = 'top';
            break;
          case 'below':
            position = 'bottom';
            break;
          default:
            throw null;
        }

        dockview.activeGroup?.api.moveTo({ group, position });
      },
      { description: 'Move current panel' },
    );

    namespace.registerAction(
      'swap',
      async ({
        panelId,
        direction,
      }: {
        panelId?: string;
        direction?: GroupNavigationDirection;
      }) => {
        let group: DockviewGroupPanel | undefined;
        if (panelId !== undefined) {
          group = dockview.getPanel(panelId)?.group;
        }
        if (direction !== undefined) {
          group = findGroupInDirection(dockview.activeGroup!, direction);
        }

        var active = dockview.activeGroup!;
        // NOTE: Create a "hole" which we use to save previous position of the group
        var hole = dockview.addGroup({ referenceGroup: group!.id });

        dockview.component.moveGroup({ from: { group: group }, to: { group: active } });
        dockview.component.moveGroup({ from: { group: active }, to: { group: hole } });
        dockview.removeGroup(hole);

        active.activePanel?.focus();
      },
      { description: 'Swap current panel' },
    );

    namespace.registerAction(
      'focus',
      async ({
        panelType,
        direction,
      }: {
        panelType?: PanelType;
        direction?: GroupNavigationDirection;
      }) => {
        if (panelType !== undefined) {
          let panel = dockview.panels.find((panel) => panel.params?.panelType == panelType);
          panel?.focus();
        }
        if (direction !== undefined) {
          let group = findGroupInDirection(dockview.activeGroup!, direction);
          group?.activePanel?.focus();
        }
      },
      { description: 'Focus panel' },
    );
  };

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
      registerActions(dockview);

      dockview.onDidRemovePanel((panel) => {
        openPanelsManager.delete(panel.id);
      });

      focusMonitor(dockview);
      dockview.onDidActivePanelChange((panel) => {
        KEYBOARD_MANAGER.currentContext = panel?.params?.panelType;
      });

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
    ACTIONS_MANAGER.unregisterNamespace(DOCKVIEW_NAMESPACE);
    getRenodeWSManager()?.dispose();
    openPanelsManager.clear();
    openDisplaysManager.clear();
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
