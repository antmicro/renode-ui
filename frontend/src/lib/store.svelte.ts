import type { RenodeProxySession } from 'renode-ws-api';
import { SvelteMap } from 'svelte/reactivity';
import { SocketConsole, type ExtendedHterm } from './components/panels/ExtendedHterm';
import { ActionsManager, MacroParser } from './actions.svelte';
import { KeyboardManager } from './keyboard.svelte';

type Terminalable = 'Monitor' | 'Renode Logs' | 'UARTs';
export type PanelType =
  | Terminalable
  | 'Sensors'
  | 'Displays'
  | 'Keyboard shortcuts'
  | 'Documentation'
  | 'User preferences'
  | 'Color theme'
  | 'Empty';
export type SocketInitializerFn = (wsURL: string, name: string) => Promise<Socket>;
export type SocketMessageData = string | ArrayBuffer;

let loadingTerminalsAmount = $state(0);

export interface Socket {
  addEventListener(type: 'message', listener: (ev: { data: SocketMessageData }) => void): void;
  send(data: string): void;
  close(): void;

  readyState: number;
}

// Not reactive on purpose - these should be set during initialization and not changed afterwards
let customWSInitializer: SocketInitializerFn = (wsURL: string, _name: string) => {
  const w = new WebSocket(wsURL);
  // NOTE: We are explicitly require `ArrayBuffer` so we don't have to deal with
  //       `Blob`'s asynchronicity.
  w.binaryType = 'arraybuffer';
  return Promise.resolve(w);
};

let renodeWSManager: RenodeProxySession | null = null;

export const getRenodeWSManager = () => renodeWSManager!;
export const getSocketConsole = (wsURL: string, name: string): Promise<SocketConsole> => {
  if (!(wsURL in SOCKET_CONSOLES) || !SOCKET_CONSOLES[wsURL].isValid) {
    SOCKET_CONSOLES[wsURL] = new SocketConsole(wsURL, name, customWSInitializer!);
  }

  return Promise.resolve(SOCKET_CONSOLES[wsURL]);
};

export const openSocket = (wsURL: string, name: string) => customWSInitializer(wsURL, name);

export const setRenodeWSManager = (manager: RenodeProxySession) => {
  renodeWSManager = manager;
};

export const setSocketInitializer = (initializer: SocketInitializerFn) => {
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

export const openDisplaysManager = new SvelteMap<string, { [display: string]: number }>();

export const RENODE_WS_PORT = { value: 21234 };

export const SOCKET_CONSOLES: Record<string, SocketConsole> = {};

export const TERMINALS: { value: Array<ExtendedHterm> } = { value: [] };

export const ACTIONS_MANAGER: ActionsManager = new ActionsManager();

export const KEYBOARD_MANAGER: KeyboardManager = new KeyboardManager((macro) =>
  MacroParser.parseSingleAndExecute(ACTIONS_MANAGER, macro as string),
);
