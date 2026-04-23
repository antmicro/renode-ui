import { RENODE_WS_PORT, type PanelType } from './store.svelte';
import { ArrowRightLeft, Logs, Radio, SquareTerminal, type Icon } from '@lucide/svelte';
import Terminal from './components/panels/Term.svelte';
import UART from './components/panels/UART.svelte';
import Sensors from './components/panels/sensors/Sensors.svelte';

export const typeToIcon = (t: PanelType): typeof Icon => {
  switch (t) {
    case 'Monitor':
      return SquareTerminal;
    case 'Renode Logs':
      return Logs;
    case 'UARTs':
      return ArrowRightLeft;
    case 'Sensors':
      return Radio;
    default:
      throw new Error(`unknown icon type: ${t}`);
  }
};

export const typeToComponent = (t: string) => {
  switch (t) {
    case 'Monitor':
    case 'Renode Logs':
      return Terminal;
    case 'UARTs':
      return UART;
    case 'Sensors':
      return Sensors;
  }
};

export const typeToEndpoint = (t: string, port?: number): string => {
  switch (t) {
    case 'Monitor':
      return '/telnet/29169';
    case 'Renode Logs':
      return '/telnet/29170';
    case 'UARTs':
      return `/telnet/${port}`;
    default:
      console.error(`undefined port for type: ${t}`);
      return '';
  }
};

export const typeToWsURL = (t: string, port?: number): string =>
  `ws://localhost:${RENODE_WS_PORT.value}${typeToEndpoint(t, port)}`;

export const cssStringify = (obj: { [key: string]: string }): string => {
  return Object.keys(obj)
    .map((k) => `${k}: ${obj[k]}`)
    .join(';');
};
