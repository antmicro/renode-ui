import {
  RenodeProxySession,
  SensorValue,
  SensorType,
  Sensor as RenodeSensor,
  GetSensorSourceValue,
} from 'renode-ws-api';

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

export class Sensor {
  readonly sensor: RenodeSensor;
  readonly types: string[];
  readonly measurand: SensorType;
  value: SensorValue;
  percentage?: SensorValue;
  discrete?: SensorValue;

  private constructor(
    sensor: RenodeSensor,
    types: string[],
    measurand: SensorType,
    value: SensorValue,
    percentage?: SensorValue,
    discrete?: SensorValue,
  ) {
    this.sensor = sensor;
    this.types = types;
    this.measurand = measurand;
    this.value = $state(value);
    this.percentage = $state(percentage);
    this.discrete = $state(discrete);
  }

  public async update(ws: RenodeProxySession): Promise<void> {
    this.value = await ws?.getSensorSourceValue(this.sensor, this.measurand, 'raw');
    if (!this.value) {
      if (
        this.measurand === SensorType.MagneticFluxDensity ||
        this.measurand === SensorType.Acceleration ||
        this.measurand === SensorType.AngularRate
      ) {
        this.value = {
          sample: { x: 0, y: 0, z: 0 },
          unit: Sensor.typeToUnit(this.measurand),
        } as SensorValue;
      } else {
        this.value = { sample: '', unit: Sensor.typeToUnit(this.measurand) } as SensorValue;
      }
    }

    if (this.types.includes('percent')) {
      let percentageValue = await ws?.getSensorSourceValue(this.sensor, this.measurand, 'percent');
      this.percentage = percentageValue;
    }

    if (this.types.includes('discrete')) {
      let discreteValue = await ws?.getSensorSourceValue(this.sensor, this.measurand, 'discrete');
      this.discrete = discreteValue;
    }
  }

  public async setValue(
    ws: RenodeProxySession,
    type: 'raw' | 'percent' | 'discrete',
    value: number,
  ) {
    const sensorValue = GetSensorSourceValue(this.measurand, type, value, true);
    await ws.setSensorSourceValue(this.sensor, this.measurand, type, sensorValue);
    await this.update(ws);
  }

  public static async fromSensor(
    ws: RenodeProxySession | undefined,
    sensor: RenodeSensor,
    measurand: SensorType,
  ): Promise<Sensor> {
    let sensorValue = await ws?.getSensorSourceValue(sensor, measurand, 'raw');
    if (!sensorValue) {
      if (
        measurand === SensorType.MagneticFluxDensity ||
        measurand === SensorType.Acceleration ||
        measurand === SensorType.AngularRate
      ) {
        sensorValue = {
          sample: { x: 0, y: 0, z: 0 },
          unit: Sensor.typeToUnit(measurand),
        } as SensorValue;
      } else {
        sensorValue = { sample: '', unit: Sensor.typeToUnit(measurand) } as SensorValue;
      }
    }

    const returnObject = new Sensor(sensor, sensor.measurands[measurand]!, measurand, sensorValue);

    if (returnObject.types.includes('percent')) {
      let percentageValue = await ws?.getSensorSourceValue(sensor, measurand, 'percent');
      returnObject.percentage = percentageValue;
    }

    if (returnObject.types.includes('discrete')) {
      let discreteValue = await ws?.getSensorSourceValue(sensor, measurand, 'discrete');
      returnObject.discrete = discreteValue;
    }

    return returnObject;
  }

  public static typeToUnit = (type: SensorType) => {
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
      case SensorType.Illuminance:
        return 'lx';
    }
  };
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
