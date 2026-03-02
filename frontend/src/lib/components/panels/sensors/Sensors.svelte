<script lang="ts">
  import { decrementLoadingTerminalsAmount, getRenodeWSManager } from '$lib/store.svelte';
  import { RotateCw, Ellipsis, TriangleAlert } from '@lucide/svelte';
  import Select from '../Select.svelte';
  import {
    type ButtonStateChangedArgs,
    type EventCallback,
    type LedStateChangedArgs,
  } from 'renode-ws-api';
  import { machToPeripherals, sensorTypeToItem } from './utils';
  import { LEDColour, type MachinePeripherals, type Peripheral } from './types';
  import { btnNamesToBtns, ledNamesToLeds } from './utils';

  const { predefinedMachine = 'Machines' }: { predefinedMachine?: string } = $props();

  let machines: Record<string, MachinePeripherals> = $state({});

  // svelte-ignore state_referenced_locally - tab props do not change
  let pickedMachine = $state(predefinedMachine);
  let pickedSensor = $state('All sensors');

  let filteredSensors = $derived(
    pickedSensor !== 'All sensors'
      ? (machines[pickedMachine]?.peripherals.filter((p) => p.name === pickedSensor) ?? [])
      : (machines[pickedMachine]?.peripherals ?? []),
  );

  const clearCallback = () => {
    machines = {};
    pickedSensor = 'All sensors';
    pickedMachine = 'Machines';
  };

  let btnStateChangedCallback = (e: ButtonStateChangedArgs) => {
    let btn = machines[e.machineName]?.buttons.find((b) => b.name === e.name);
    if (btn) {
      btn.active = e.value;
    }
  };

  let ledStateChangedCallback = (e: LedStateChangedArgs) => {
    let led = machines[e.machineName]?.leds.find((l) => l.name === e.name);
    if (led) {
      led.activated = e.value;
    }
  };

  const getMachinesSensors = async () => {
    const machineNames = await getRenodeWSManager().getMachines();

    getRenodeWSManager().unregisterButtonStateChangedCallback(
      btnStateChangedCallback as EventCallback,
    );
    getRenodeWSManager().unregisterLedStateChangedCallback(
      ledStateChangedCallback as EventCallback,
    );
    getRenodeWSManager().unregisterClearCommandCallback(clearCallback);

    for (const mach of machineNames) {
      // NOTE: That's counterintuivite API naming, but instead of peripherals (and their sensors)
      // we can fetch sensors that have peripheral names and multiple types

      const [buttonNames, ledNames, peripherals] = await Promise.all([
        getRenodeWSManager().getButtons(mach),
        getRenodeWSManager().getLeds(mach),
        machToPeripherals(getRenodeWSManager(), mach),
      ]);

      machines[mach] = {
        leds: ledNamesToLeds(ledNames),
        buttons: btnNamesToBtns(buttonNames),
        peripherals: peripherals,
      };
    }

    getRenodeWSManager().registerButtonStateChangedCallback(btnStateChangedCallback);
    getRenodeWSManager().registerLedStateChangedCallback(ledStateChangedCallback);
    getRenodeWSManager().registerClearCommandCallback(clearCallback);
    decrementLoadingTerminalsAmount();
  };
</script>

{#snippet SensorGroup(peripheral: Peripheral)}
  <div class="group">
    <div class="group-header">{peripheral.name}</div>
    <hr />
    {#if peripheral.error}
      <div class="error">
        <div class="err-icon">
          <TriangleAlert size={14} />
        </div>
        <span class="error-msg">{peripheral.error}</span>
      </div>
    {/if}
    <div class="group-items">
      {#each peripheral.sensors as sensor (sensor)}
        {@const Icon = sensorTypeToItem[sensor.type].icon}
        {@const iconText = sensorTypeToItem[sensor.type].text}
        <div class="group-item">
          <div class="group-item-left">
            <Icon size={16} />
            {iconText}
          </div>
          {#if sensor.type === 'magnetic-flux-density' || sensor.type === 'acceleration' || sensor.type === 'angular-rate'}
            <div class="pill-group {sensor.error && 'error'}">
              {#each Object.entries(sensor.value.value as object) as [axis, value] (axis)}
                <div class="pill {sensor.error && 'error'}">
                  {axis}: {value}
                  {sensor.value.unit}
                </div>
              {/each}
            </div>
          {:else}
            <div class="pill {sensor.error && 'error'}">
              {sensor.value.value}
              {sensor.value.unit}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet LedGroup()}
  <div class="group">
    <div class="group-header">LEDs</div>
    <hr />
    <div class="leds">
      {#each machines[pickedMachine]?.leds ?? [] as led (led)}
        <div class="group-item">
          <div class="group-item-left">
            <div class="dot {led.activated ? led.colour : ''}"></div>
            {led.name}
          </div>
          {#if !led.changeableColour}
            <div class="pill nonselectable capitalized">{led.colour}</div>
          {:else}
            <select class="pill selectable" bind:value={led.colour}>
              {#each Object.entries(LEDColour) as [colourName, colourValue] (colourName)}
                <option class="capitalized" value={colourValue}>{colourValue}</option>
              {/each}
            </select>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet ButtonsGroup()}
  <div class="group">
    <div class="group-header">Buttons</div>
    <hr />
    <div class="buttons">
      {#each machines[pickedMachine]?.buttons ?? [] as button (button.name)}
        <div class="group-item">
          <div class="group-item-left">{button.name}</div>
          <label class="switch">
            <input
              type="checkbox"
              checked={button.active}
              onchange={() =>
                getRenodeWSManager().setButtonValue(pickedMachine, button.name, !button.active)}
            />
            <span class="slider"></span>
          </label>
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#await getMachinesSensors()}
  <div class="center">Loading sensors...</div>
{:then}
  {#if Object.keys(machines).length > 0}
    {@const containsLeds = machines[pickedMachine]?.leds.length > 0}
    {@const containsButtons = machines[pickedMachine]?.buttons.length > 0}
    {@const containsSensors = machines[pickedMachine]?.leds.length > 0}
    {@const containsAnySensor = containsLeds || containsButtons || containsSensors}

    <div class="container">
      <div class="toolbar">
        <div class="left-items">
          <Select
            header="Machines"
            bind:selectedItem={pickedMachine}
            items={Object.keys(machines)}
          />
          <Select
            disabled={!containsAnySensor}
            header="All sensors"
            bind:selectedItem={pickedSensor}
            items={machines[pickedMachine]?.peripherals?.flatMap((p) => p.name) ?? []}
          />
          <button class="reset"><RotateCw size={14} /><span>Reset values</span></button>
        </div>
        <Ellipsis size={16} />
      </div>
      {#if pickedMachine !== 'Machines'}
        <div class="scrollable">
          {#if containsAnySensor}
            <div class="sensors">
              {#if machines[pickedMachine]?.leds.length > 0}
                {@render LedGroup()}
              {/if}
              {#if machines[pickedMachine]?.buttons.length > 0}
                {@render ButtonsGroup()}
              {/if}
              {#each filteredSensors as sensor (sensor)}
                {@render SensorGroup(sensor)}
              {/each}
            </div>
          {:else}
            <div class="center">This machine has no sensors, leds or buttons</div>
          {/if}
        </div>
      {:else}
        <div class="center">Pick machine to see its sensors</div>
      {/if}
    </div>
  {:else}
    <div class="center">No machines</div>
  {/if}
{:catch e}
  <div class="center">Cloud not load sensors {e}</div>
{/await}

<style>
  :root {
    --toolbar-height: 28px;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    height: 100%;
  }

  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    background-color: #171717;
    color: #9e9ea4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--toolbar-height);
    border-bottom: 1px #242424 solid;
    padding: 3px 6px 3px 6px;
  }

  .toolbar .left-items {
    display: flex;
    gap: 6px;
  }

  .reset,
  .sensor-picker {
    padding: 2px 6px 2px 6px;
    border: 1px #373739 solid;
    border-radius: 6px;
    background-color: #141415;
    color: #9e9ea4;
    gap: 4px;
    display: flex;
    align-items: center;
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: 0;
  }

  .scrollable {
    overflow-y: auto;
    scrollbar-gutter: auto;
    height: calc(100% - 29px);
  }

  .sensors {
    color: #ececee;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    margin: 10px 10px 10px 10px;
  }

  .group {
    border: 1px #242424 solid;
    padding: 0 12px 12px 12px;
    border-radius: 6px;
    gap: 10px;
  }

  .group-header {
    padding: 8px 0px 8px 0px;
    font-size: 12px;
  }

  .group-items {
    gap: 10px;
    display: flex;
    flex-direction: column;
  }

  .group-item {
    height: 20px;
    display: flex;
    align-items: center;

    font-weight: 400;
    font-size: 10px;
    line-height: 16px;
    letter-spacing: 0;
    justify-content: space-between;
  }

  .group-item-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 6px;
    height: 6px;

    border-radius: 100%;
  }

  .dot.red {
    background-color: #dd4947;
    box-shadow: 0px 4px 4px #551719;
  }

  .dot.green {
    box-shadow: 0px 4px 4px #0c3913;
    background-color: #45a949;
  }

  .dot.blue {
    background-color: #366bf7;
    box-shadow: 0px 4px 4px #142d5f;
  }

  .dot.orange {
    background-color: #f89a00;
    box-shadow: 0px 4px 4px #4b2b00;
  }

  .pill-group {
    display: flex;
    gap: 6px;
  }

  .pill {
    border: 1px #242424 solid;
    border-radius: 20% / 50%;
    padding: 2px 12px 2px 12px;
  }

  .pill.nonselectable {
    color: #797981;
  }

  .pill.selectable {
    background-color: #0d0d0d;
  }

  .error {
    color: #f46663;
  }

  .error:has(:not(.pill)) {
    margin-bottom: 10px;
    background-color: #141415;
    padding: 6px;
    border: 1px #242424 solid;
    border-radius: 6px;
    display: flex;
    gap: 10px;
    font-size: 10px;
    line-height: 14px;
    font-weight: 400;
    letter-spacing: 0;
  }

  .error-msg {
    display: flex;
    align-self: center;
  }

  .leds,
  .buttons {
    gap: 10px;
    display: flex;
    flex-direction: column;
  }

  hr {
    margin-top: 0;
    border: 0;
    border-bottom: 1px #242424 solid;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 16px;
  }

  .capitalized {
    text-transform: capitalize;
  }

  /* The slider */
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #28282a;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 9999px;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 14px;
    width: 14px;
    left: 1px;
    bottom: 1px;
    background-color: #ececee;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 100%;
  }

  input:checked + .slider {
    background-color: #ececee;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #0d0d0d;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(16px);
    -ms-transform: translateX(16px);
    transform: translateX(16px);
    background-color: #0d0d0d;
  }
  /* End slider */
</style>
