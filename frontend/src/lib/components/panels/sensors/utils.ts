import {
  RenodeProxySession,
  SensorType,
  type SensorValue,
  type Sensor as RenodeSensor,
} from 'renode-ws-api';
import { LEDColour, type Button, type LED, type Peripheral } from './types';
import {
  Droplet,
  Gauge,
  Icon,
  Magnet,
  RotateCcw,
  SquareActivity,
  Thermometer,
  Zap,
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

export const typeToUnit = (type: SensorType) => {
  switch (type) {
    case SensorType.Temperature:
      return '°C';
    case SensorType.Acceleration:
      return 'g';
    case SensorType.AngularRate:
      return 'rad/s';
    case SensorType.Voltage:
      return 'V';
    case SensorType.ECG:
      return 'nV';
    case SensorType.Humidity:
      return '%RH';
    case SensorType.Pressure:
      return 'Pa';
    case SensorType.MagneticFluxDensity:
      return 'nT';
  }
};

export const machToPeripherals = async (ws: RenodeProxySession | undefined, mach: string) => {
  const proxySensors = (await ws?.getSensors(mach)) ?? [];

  const tempPeripherals: Peripheral[] = [];

  for (const sensor of proxySensors) {
    const tempPeri: Peripheral = { name: sensor.name, sensors: [] };

    for (const sensorType of sensor.types) {
      const sensorObj = await sensorTypeToSensor(ws, sensor, sensorType);
      tempPeri.sensors.push(sensorObj);
    }

    if (tempPeri.sensors.length > 0) {
      tempPeripherals.push(tempPeri);
    }
  }

  return tempPeripherals;
};

const sensorTypeToSensor = async (
  ws: RenodeProxySession | undefined,
  sensor: RenodeSensor,
  type: SensorType,
) => {
  let sensorValue = await ws?.getSensorValue(sensor, type);
  if (!sensorValue) {
    if (
      type === SensorType.MagneticFluxDensity ||
      type === SensorType.Acceleration ||
      type === SensorType.AngularRate
    ) {
      sensorValue = {
        sample: { x: 0, y: 0, z: 0 },
        unit: typeToUnit(type),
      } as SensorValue;
    } else {
      sensorValue = { sample: '', unit: typeToUnit(type) } as SensorValue;
    }
  }

  return {
    type: type,
    value: sensorValue,
  };
};

export const sensorTypeToItem: { [key: string]: { icon: typeof Icon; text: string } } = {
  temperature: { icon: Thermometer, text: 'Temperature' },
  humidity: { icon: Droplet, text: 'Humidity' },
  acceleration: { icon: Gauge, text: 'Acceletation' },
  'angular-rate': { icon: RotateCcw, text: 'Angular rate' },
  voltage: { icon: Zap, text: 'Voltage' },
  ecg: { icon: SquareActivity, text: 'ECG' },
  'magnetic-flux-density': { icon: Magnet, text: 'Magnetic flux density' },
};
