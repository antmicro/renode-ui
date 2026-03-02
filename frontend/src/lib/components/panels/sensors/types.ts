import type { SensorValue } from 'renode-ws-api';

export interface MachinePeripherals {
  readonly peripherals: Peripheral[];
  readonly leds: LED[];
  readonly buttons: Button[];
}

export interface Peripheral {
  readonly name: string;
  readonly error?: string;
  sensors: Sensor[];
}

export interface Sensor {
  readonly type: string;
  readonly error?: boolean;
  value: SensorValue;
}

export interface LED {
  readonly name: string;
  readonly changeableColour: boolean;
  colour: LEDColour;
  activated: boolean;
}

export interface Button {
  readonly name: string;
  active: boolean;
}

export enum LEDColour {
  RED = 'red',
  GREEN = 'green',
  BLUE = 'blue',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  WHITE = 'white',
  MAGENTA = 'magenta',
  UNKNOWN = 'unknown',
}
