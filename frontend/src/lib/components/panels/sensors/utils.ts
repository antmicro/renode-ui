import { RenodeProxySession } from 'renode-ws-api';
import { LEDColour, Sensor, type Button, type LED, type Peripheral } from './types.svelte';
import {
  Droplet,
  Gauge,
  Icon,
  Magnet,
  RotateCcw,
  SquareActivity,
  Thermometer,
  Zap,
  Sun,
} from '@lucide/svelte';

// NOTE: As of now Renode does not expose nor have API to assign colours
// to the LEDs. This is best effort func to find it based partial match
// in LED name
export const tryGuessColour = (name: string): LEDColour => {
  return Object.values(LEDColour).find((col) => name.includes(col)) || LEDColour.UNKNOWN;
};

export const ledNamesToLeds = (ledNames: string[] = []): LED[] =>
  ledNames.map((name) => ({
    activated: false,
    name,
    changeableColour: false,
    colour: tryGuessColour(name),
  }));

export const btnNamesToBtns = (btnNames: string[] = []): Button[] =>
  btnNames.map((name) => ({ active: false, name: name }));

export const machToPeripherals = async (ws: RenodeProxySession | undefined, mach: string) => {
  const proxySensors = (await ws?.getSensors(mach)) ?? [];

  const tempPeripherals: Peripheral[] = [];

  for (const sensor of proxySensors) {
    const tempPeri: Peripheral = { name: sensor.name, sensors: [] };

    for (const sensorType of sensor.types) {
      const sensorObj = await Sensor.fromSensor(ws, sensor, sensorType);
      tempPeri.sensors.push(sensorObj);
    }

    if (tempPeri.sensors.length > 0) {
      tempPeripherals.push(tempPeri);
    }
  }

  return tempPeripherals;
};

export const sensorTypeToItem: { [key: string]: { icon: typeof Icon; text: string } } = {
  temperature: { icon: Thermometer, text: 'Temperature' },
  humidity: { icon: Droplet, text: 'Humidity' },
  acceleration: { icon: Gauge, text: 'Acceletation' },
  'angular-rate': { icon: RotateCcw, text: 'Angular rate' },
  voltage: { icon: Zap, text: 'Voltage' },
  ecg: { icon: SquareActivity, text: 'ECG' },
  'magnetic-flux-density': { icon: Magnet, text: 'Magnetic flux density' },
  illuminance: { icon: Sun, text: 'Illuminance' },
};
