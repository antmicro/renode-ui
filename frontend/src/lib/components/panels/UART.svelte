<script lang="ts">
  import { getRenodeWSManager, openUARTsManager, type PanelType } from '$lib/store.svelte';
  import { Ellipsis } from '@lucide/svelte';
  import Select from './Select.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import Term from './Term.svelte';

  interface Props {
    panelType: PanelType;
    predefinedMachine?: string;
    predefinedUart?: string;
  }

  const { panelType, predefinedMachine = 'Machines', predefinedUart = 'UARTs' }: Props = $props();

  let machines: string[] = $state([]);
  let uarts = new SvelteMap<string, string[]>();

  // svelte-ignore state_referenced_locally - tab props do not change
  let selectedMachine = $state(predefinedMachine);
  // svelte-ignore state_referenced_locally - tab props do not change
  let selectedUART = $state(predefinedUart);

  const availableMachinesAndUARTS = async () => {
    machines = await getRenodeWSManager().getMachines();
    for (const mach of machines) {
      const machUARTs = await getRenodeWSManager().getUarts(mach);
      uarts.set(mach, machUARTs);
    }
  };
</script>

<div class="uart-main">
  {#await availableMachinesAndUARTS() then}
    {#if machines.length !== 0}
      <div class="uart-subheader">
        <div class="left-group">
          <Select header="Machine selection" items={machines} bind:selectedItem={selectedMachine} />
          <Select
            header="UART selection"
            items={uarts.get(selectedMachine) ?? []}
            bind:selectedItem={selectedUART}
          />
        </div>

        <div>
          <Ellipsis size={16} color="#9E9EA4" />
        </div>
      </div>
      {#if selectedMachine !== 'Machines' && selectedUART !== 'UARTs'}
        {@const port = openUARTsManager.get(selectedMachine)?.[selectedUART]}
        {#if port}
          {#key [selectedUART, selectedMachine]}
            <Term {panelType} {port} predefinedUart={selectedUART} />
          {/key}
        {:else}
          <div class="empty">No ports open for this UART</div>
        {/if}
      {:else}
        <div class="empty">Select machine and UART</div>
      {/if}
    {:else}
      <div class="empty">No machines</div>
    {/if}
  {:catch e}
    <div class="empty">Could not load machines: {e}</div>
  {/await}
</div>

<style>
  .uart-subheader {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    background-color: #171717;
    border-width: 1px 0px 1px 0px;
    border-style: solid;
    border-color: #242424;
    padding: 3px 6px 3px 6px;
    align-items: center;
  }

  .left-group {
    gap: 6px;
    display: flex;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    color: white;
  }

  .uart-main {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
</style>
