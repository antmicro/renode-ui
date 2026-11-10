import { createDockview, type AddPanelPositionOptions, type DockviewApi } from 'dockview-core';
import { Panel } from './Panel';
import { Tab } from './Tab';
import {
  RenodeProxySession,
  type EmptyEventCallback,
  type UartOpenedArgs,
  type DisplayOpenedArgs,
  type CanOpenedArgs,
  type SpiOpenedArgs,
} from 'renode-ws-api';
import {
  getRenodeWSManager,
  incrementLoadingTerminalsAmount,
  openDisplaysManager,
  openPanelsManager,
  openCansManager,
  openSpisManager,
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
  predefinedPeripheral?: string;
  position?: AddPanelPositionOptions;
  keepFocus?: boolean;
}

const DEFAULT_PANEL_DIRECTION: Partial<Record<PanelType, { direction: string }>> = {
  'Renode Logs': { direction: 'below' },
  UARTs: { direction: 'right' },
  Displays: { direction: 'right' },
  SPI: { direction: 'right' },
  CAN: { direction: 'right' },
};

export const createPanel = async ({
  dockview,
  panelType,
  port,
  predefinedMachine,
  predefinedPeripheral,
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
    params: {
      panelType: panelType,
      port,
      predefinedMachine,
      predefinedPeripheral,
    },
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

  await createPanel({
    dockview,
    panelType: 'UARTs',
    predefinedMachine: uartArgs.machineName,
    predefinedPeripheral: uartArgs.name,
  });
};

export const createDisplayPanel = async ({
  dockview,
  displayArgs,
}: {
  dockview: DockviewApi;
  displayArgs: DisplayOpenedArgs;
}) => {
  const displays = openDisplaysManager.get(displayArgs.machineName) ?? [];
  if (!displays.includes(displayArgs.name)) {
    openDisplaysManager.set(displayArgs.machineName, [...displays, displayArgs.name]);
  }
  await createPanel({
    dockview,
    panelType: 'Displays',
    predefinedMachine: displayArgs.machineName,
    predefinedPeripheral: displayArgs.name,
  });
};

export const createCanPanel = async ({
  dockview,
  canArgs,
}: {
  dockview: DockviewApi;
  canArgs: CanOpenedArgs;
}) => {
  openCansManager.set(canArgs.hubName, canArgs.port);
  await createPanel({
    dockview,
    panelType: 'CAN',
    predefinedPeripheral: canArgs.hubName,
  });
};

export const createSpiPanel = async ({
  dockview,
  spiArgs,
}: {
  dockview: DockviewApi;
  spiArgs: SpiOpenedArgs;
}) => {
  openSpisManager.set(spiArgs.machineName, {
    ...openSpisManager.get(spiArgs.machineName),
    [spiArgs.name]: spiArgs.port,
  });
  await createPanel({
    dockview,
    panelType: 'SPI',
    predefinedMachine: spiArgs.machineName,
    predefinedPeripheral: spiArgs.name,
  });
};

export const registerWSProxyCallbacks = ({
  dockview,
  onQuit,
  ignoreOpenedEvents,
}: {
  dockview: DockviewApi;
  onQuit?: EmptyEventCallback;
  ignoreOpenedEvents: boolean;
}) => {
  const ws = getRenodeWSManager();

  if (onQuit) {
    ws.registerRenodeQuittedCallback(onQuit);
  }

  ws.registerClearCommandCallback(() => {
    const idsToRemove = [];

    for (const [id, type] of openPanelsManager.entries()) {
      if (
        type === 'UARTs' ||
        type === 'Sensors' ||
        type === 'Displays' ||
        type === 'CAN' ||
        type === 'SPI'
      ) {
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

    openDisplaysManager.clear();
    openCansManager.clear();
    openSpisManager.clear();
  });

  ws.registerLedStateChangedCallback(() => {});

  if (ignoreOpenedEvents) {
    ws.registerUartOpenedCallback(() => {});
    ws.registerDisplayOpenedCallback(() => {});
    ws.registerCanOpenedCallback(() => {});
    ws.registerSpiOpenedCallback(() => {});
  } else {
    ws.registerUartOpenedCallback(async (e) =>
      createUartAndSensorPanels({ dockview, uartArgs: e }),
    );
    ws.registerDisplayOpenedCallback(async (e) => createDisplayPanel({ dockview, displayArgs: e }));
    ws.registerCanOpenedCallback(async (e) => createCanPanel({ dockview, canArgs: e }));
    ws.registerSpiOpenedCallback(async (e) => createSpiPanel({ dockview, spiArgs: e }));
  }
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
