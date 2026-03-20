import type { RenodeProxySession } from 'renode-ws-api';
import { SvelteMap } from 'svelte/reactivity';
import type { ExtendedHterm } from './components/panels/ExtendedHterm';
import { terminalHistories, type TerminalHistory } from './terminalHistory';

type Terminalable = 'Monitor' | 'Renode Logs' | 'UARTs';
export type PanelType =
  | Terminalable
  | 'Sensors'
  | 'Keyboard shortcuts'
  | 'Documentation'
  | 'User preferences'
  | 'Color theme';

let loadingTerminalsAmount = $state(0);

export interface Socket {
  addEventListener(
    type: 'message',
    listener: (ev: { data: string | Blob | ArrayBuffer }) => void,
  ): void;
  send(data: string): void;
  close(): void;
}

// Not reactive on purpose - these should be set during initialization and not changed afterwards
let customWSInitializer: (wsURL: string, name: string) => Promise<Socket> = (
  wsURL: string,
  _name: string,
) => {
  const w = new WebSocket(wsURL);
  w.binaryType = 'arraybuffer';
  return Promise.resolve(w);
};

let renodeWSManager: RenodeProxySession | null = null;

export const getRenodeWSManager = () => renodeWSManager!;
export const getSocketInitializer = () => customWSInitializer!;

export const setRenodeWSManager = (manager: RenodeProxySession) => {
  renodeWSManager = manager;
};

export const setSocketInitializer = (
  initializer: (wsURL: string, name: string) => Promise<Socket>,
) => {
  customWSInitializer = initializer;
};

export const openPanelsManager = new SvelteMap<string, PanelType>();

export const incrementLoadingTerminalsAmount = () => {
  loadingTerminalsAmount++;
};

export const decrementLoadingTerminalsAmount = () => {
  if (loadingTerminalsAmount > 0) {
    loadingTerminalsAmount--;
  }
};

export const clearTerminalsLoadingCounter = () => {
  loadingTerminalsAmount = 0;
};

export const terminalsLoading = () => {
  return loadingTerminalsAmount > 0;
};

export const waitForNoTerminalsLoading = async () => {
  while (terminalsLoading()) {
    await new Promise((r) => setTimeout(r, 100));
  }
};

export const openUARTsManager = new SvelteMap<string, { [uart: string]: number }>();

export const RENODE_WS_PORT = { value: 21234 };

export const TERMINALS: { value: Array<ExtendedHterm> } = { value: [] };

export { terminalHistories };
export type { TerminalHistory };
