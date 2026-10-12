import { createDockview, type AddPanelPositionOptions, type DockviewApi } from 'dockview-core';
import { Panel } from './Panel';
import { Tab } from './Tab';
import { RenodeProxySession, type EmptyEventCallback, type UartOpenedArgs } from 'renode-ws-api';
import {
  getRenodeWSManager,
  incrementLoadingTerminalsAmount,
  openDisplaysManager,
  openPanelsManager,
  openUARTsManager,
  RENODE_WS_PORT,
  TERMINALS,
  waitForNoTerminalsLoading,
  type PanelType,
} from '$lib/store.svelte';

const disableNotAllowedOverlay = (dock: DockviewApi) => {
  dock.onWillShowOverlay((e) => {
    if (
      e.options.panel?.id === undefined ||
      (e.getData()?.panelId === e.options.panel.id &&
        //@ts-expect-error e.options property is private
        e.options.group._model._panels.length === 1)
    ) {
      e.preventDefault();
    }
  });
};

export const createDockviewApi = (node: HTMLElement) => {
  const dock = createDockview(node, {
    disableFloatingGroups: true,
    createComponent: () => new Panel(),
    createTabComponent: () => new Tab(),
    singleTabMode: 'fullwidth',
    theme: {
      name: 'renode-ui',
      className: 'dockview-theme-renode-ui',
    },
    defaultRenderer: 'always',
  });

  disableNotAllowedOverlay(dock);

  return dock;
};

interface CreatePanelArgs {
  dockview: DockviewApi;
  panelType: PanelType;
  port?: number;
  predefinedMachine?: string;
  predefinedUart?: string;
  predefinedDisplay?: string;
  position?: AddPanelPositionOptions;
  keepFocus?: boolean;
}

const DEFAULT_PANEL_DIRECTION: Record<string, { direction: string }> = {
  'Renode Logs': { direction: 'below' },
  UARTs: { direction: 'right' },
  Displays: { direction: 'right' },
};

export const createPanel = async ({
  dockview,
  panelType,
  port,
  predefinedMachine,
  predefinedUart,
  predefinedDisplay,
  position,
  keepFocus = false,
}: CreatePanelArgs) => {
  const panelId = 'panel-' + Math.floor(Math.random() * 10000).toString();

  let currentPanel = dockview.activePanel;

  dockview.addPanel({
    id: panelId,
    component: panelType,
    position: position ?? DEFAULT_PANEL_DIRECTION[panelType],
    tabComponent: 'default',
    params: { panelType: panelType, port, predefinedMachine, predefinedUart, predefinedDisplay },
  });

  incrementLoadingTerminalsAmount();
  if (keepFocus) {
    currentPanel?.focus();
  }

  openPanelsManager.set(panelId, panelType);
  await waitForNoTerminalsLoading();
};

export const registerWSProxy = async () => {
  const ws = await RenodeProxySession.tryConnect(
    `ws://localhost:${RENODE_WS_PORT.value}/proxy`,
    '',
  );
  await ws.startRenode();

  return ws;
};

export const createUartAndSensorPanels = async ({
  dockview,
  uartArgs,
}: {
  dockview: DockviewApi;
  uartArgs: UartOpenedArgs;
}) => {
  const openedPanels = new Set(openPanelsManager.values());
  if (!openedPanels.has('Sensors')) {
    await createPanel({
      dockview,
      panelType: 'Sensors',
      predefinedMachine: uartArgs.machineName,
      keepFocus: true,
    });
  }

  const existingUart = openUARTsManager.get(uartArgs.machineName) ?? {};
  if (!(uartArgs.name in existingUart)) {
    openUARTsManager.set(uartArgs.machineName, {
      ...existingUart,
      [uartArgs.name]: uartArgs.port,
    });
  }

  await createPanel({
    dockview,
    panelType: 'UARTs',
    port: uartArgs.port,
    predefinedMachine: uartArgs.machineName,
    predefinedUart: uartArgs.name,
  });
};

export const registerWSProxyCallbacks = ({
  dockview,
  onQuit,
}: {
  dockview: DockviewApi;
  onQuit?: EmptyEventCallback;
}) => {
  const ws = getRenodeWSManager();

  if (onQuit) {
    ws.registerRenodeQuittedCallback(onQuit);
  }
  ws.registerUartOpenedCallback(async (e) => createUartAndSensorPanels({ dockview, uartArgs: e }));
  ws.registerDisplayOpenedCallback(async (e) => {
    openDisplaysManager.set(e.machineName, {
      ...openDisplaysManager.get(e.machineName),
      [e.name]: e.port,
    });
    await createPanel({
      dockview,
      panelType: 'Displays',
      port: e.port,
      predefinedMachine: e.machineName,
      predefinedDisplay: e.name,
    });
  });
  ws.registerLedStateChangedCallback(() => {});
  ws.registerClearCommandCallback(() => {
    const idsToRemove = [];

    for (const [id, type] of openPanelsManager.entries()) {
      if (type === 'UARTs' || type === 'Sensors' || type === 'Displays') {
        const panel = dockview.getPanel(id);
        if (panel) {
          dockview.removePanel(panel);
          idsToRemove.push(id);
        }
      }
    }

    for (const id of idsToRemove) {
      openPanelsManager.delete(id);
    }

    openUARTsManager.clear();
    openDisplaysManager.clear();
  });
};

export const focusMonitor = (dockview: DockviewApi) => {
  for (const [id, type] of openPanelsManager.entries()) {
    if (type === 'Monitor') {
      dockview.getPanel(id)?.focus();
    }
  }

  for (const term of TERMINALS.value) {
    if (term.metadata.panelType == 'Monitor') {
      term.focus();
    }
  }
};
