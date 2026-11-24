<script lang="ts">
  import { decrementLoadingTerminalsAmount, getRenodeWSManager } from '$lib/store.svelte';
  import GridStack from '../GridStack.svelte';
  import GridStackItem from '../GridStackItem.svelte';
  import WidgetSlider from '../widgets/WidgetSlider.svelte';
  import WidgetNumber from '../widgets/WidgetNumber.svelte';
  import { machToPeripherals } from './utils';
  import type { Sensor } from './types.svelte';
  import type { SensorValue } from 'renode-ws-api';
  import { onMount } from 'svelte';

  function sampleFormatter(sample: SensorValue): string {
    return `${sample.value.toFixed(2)} ${sample.unit}`;
  }

  function formatterFromSample(sample: SensorValue): (number: number) => string {
    return (value) => `${value.toFixed(2)} ${sample.unit}`;
  }

  interface SensorEntry {
    machine: string;
    name: string;
    sensor: Sensor;
  }

  let sensors: SensorEntry[] = $state([]);

  async function updateSensorValues(): Promise<void> {
    const ws = getRenodeWSManager();

    for (let { sensor } of sensors) {
      await sensor.update(ws);
    }
  }

  async function commitSensorValue(
    sensor: Sensor,
    type: 'raw' | 'percent' | 'discrete',
    newValue: number,
  ) {
    const ws = getRenodeWSManager();
    await sensor.setValue(ws, type, newValue);
  }

  const getMachinesSensors = async () => {
    const machineNames = await getRenodeWSManager().getMachines();
    for (const machine of machineNames) {
      const peripherals = await machToPeripherals(getRenodeWSManager(), machine);
      for (const peripheral of peripherals) {
        // NOTE: Ignore trivial sources
        if (peripheral.name.match(/adc[0-9]+-channel[0-9]+/) !== null) {
          continue;
        }

        sensors.push({
          machine,
          name: peripheral.name.split('.').pop()!,
          sensor: peripheral.sensors[0],
        });
      }
    }
    decrementLoadingTerminalsAmount();
  };

  onMount(() => {
    const updater = setInterval(updateSensorValues, 1000 / 5);
    return () => clearInterval(updater);
  });
</script>

{#await getMachinesSensors()}
  <div class="center">Loading sensors...</div>
{:then}
  <div class="container">
    <GridStack
      mode="compact"
      animate={false}
      cellHeight={32}
      sizeToContent={true}
      columnOpts={{ columnWidth: 300, columnMax: 4 }}
    >
      {#each sensors as { machine, name, sensor }}
        {#if sensor.types.includes('percent')}
          <GridStackItem>
            <WidgetSlider
              headerLeft={name}
              subHeaderLeft={machine}
              headerRight={sampleFormatter(sensor.value)}
              forceDisplayMode="percentage"
              minimumValue={0}
              maximumValue={100}
              value={sensor.percentage!.value as number}
              format={formatterFromSample(sensor.value)}
              valueChanged={(value) => commitSensorValue(sensor, 'percent', value)}
            />
          </GridStackItem>
        {:else}
          <GridStackItem>
            <WidgetNumber
              headerLeft={name}
              subHeaderLeft={machine}
              headerRight={sampleFormatter(sensor.value)}
              value={sensor.value.value as number}
              precission={2}
              unit={sensor.value.unit}
            />
          </GridStackItem>
        {/if}
      {/each}
    </GridStack>
  </div>
{/await}

<style>
  .center {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    height: 100%;
  }

  .container {
    background-color: black;
    padding: 10px;
    height: 100%;
    overflow-y: auto;
  }
</style>
