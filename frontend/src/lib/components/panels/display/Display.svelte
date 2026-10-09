<script lang="ts">
  import { decrementLoadingTerminalsAmount, openDisplaysManager } from '$lib/store.svelte';
  import { onMount } from 'svelte';
  import Select from '../Select.svelte';
  import DisplayView from './DisplayView.svelte';

  interface Props {
    predefinedMachine?: string;
    predefinedDisplay?: string;
  }

  const { predefinedMachine = 'Machines', predefinedDisplay = 'Displays' }: Props = $props();

  const machines = $derived([...openDisplaysManager.keys()]);

  // svelte-ignore state_referenced_locally - tab props do not change
  let selectedMachine = $state(predefinedMachine);
  // svelte-ignore state_referenced_locally - tab props do not change
  let selectedDisplay = $state(predefinedDisplay);
  let info = $state('');
  let mode = $state('Fit');

  onMount(decrementLoadingTerminalsAmount);
</script>

<div class="display-main">
  {#if machines.length !== 0}
    <div class="display-subheader">
      <div class="left-group">
        <Select header="Machine selection" items={machines} bind:selectedItem={selectedMachine} />
        <Select
          header="Display selection"
          items={Object.keys(openDisplaysManager.get(selectedMachine) ?? {})}
          bind:selectedItem={selectedDisplay}
        />
        <Select
          header="Display mode"
          items={['Fit', 'Stretch', 'Center']}
          bind:selectedItem={mode}
        />
      </div>
      <div class="info">{info}</div>
    </div>
    {@const port = openDisplaysManager.get(selectedMachine)?.[selectedDisplay]}
    {#if port}
      {#key [selectedDisplay, selectedMachine]}
        <DisplayView {port} name={selectedDisplay} {mode} bind:info />
      {/key}
    {:else}
      <div class="empty">Select machine and display</div>
    {/if}
  {:else}
    <div class="empty">No displays</div>
  {/if}
</div>

<style>
  .display-subheader {
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

  .info {
    color: #9e9ea4;
    font-size: 12px;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    color: white;
  }

  .display-main {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
</style>
