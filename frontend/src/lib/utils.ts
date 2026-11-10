import { RENODE_WS_PORT, type PanelType } from './store.svelte';
import {
  ArrowRightLeft,
  Logs,
  Monitor,
  GitFork,
  Radio,
  SquareMousePointer,
  SquareTerminal,
  type Icon,
} from '@lucide/svelte';
import Terminal from './components/panels/Term.svelte';
import UART from './components/panels/UART.svelte';
import Empty from './components/panels/Empty.svelte';
import Sensors from './components/panels/sensors/Sensors.svelte';
import Display from './components/panels/display/Display.svelte';
import CAN from './components/panels/CAN.svelte';
import SPI from './components/panels/SPI.svelte';

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
    case 'Displays':
      return Monitor;
    case 'Empty':
      return SquareMousePointer;
    case 'CAN':
      return GitFork;
    case 'SPI':
      return ArrowRightLeft;
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
    case 'Displays':
      return Display;
    case 'CAN':
      return CAN;
    case 'Empty':
      return Empty;
    case 'SPI':
      return SPI;
  }
};

export const typeToEndpoint = (
  t: string,
  port?: number,
  machine?: string,
  peripheral?: string,
): string => {
  switch (t) {
    case 'Monitor':
      return '/monitor';
    case 'Renode Logs':
      return '/logs';
    case 'UARTs':
      return `/uart/${encodeURIComponent(machine!)}/${encodeURIComponent(peripheral!)}`;
    case 'Displays':
      return `/display/${encodeURIComponent(machine!)}/${encodeURIComponent(peripheral!)}`;
    case 'CAN':
      return `/can/${port}`;
    case 'SPI':
      return `/spi/${encodeURIComponent(machine!)}/${encodeURIComponent(peripheral!)}`;
    default:
      console.error(`undefined endpoint for type: ${t}`);
      return '';
  }
};

export const typeToWsURL = (
  t: string,
  port?: number,
  machine?: string,
  peripheral?: string,
): string =>
  `ws://localhost:${RENODE_WS_PORT.value}${typeToEndpoint(t, port, machine, peripheral)}`;

export const cssStringify = (obj: { [key: string]: string }): string => {
  return Object.keys(obj)
    .map((k) => `${k}: ${obj[k]}`)
    .join(';');
};
