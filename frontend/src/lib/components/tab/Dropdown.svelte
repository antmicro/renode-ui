<script lang="ts">
  import { openPanelsManager, type PanelType } from '$lib/store.svelte';
  import {
    SquareTerminal,
    Logs,
    ArrowRightLeft,
    Radio,
    type Icon as IconType,
  } from '@lucide/svelte';

  let { onPanelTypeChange, panelType } = $props();

  const restrictedToOnePanelTypes = ['Monitor', 'Renode Logs'];

  const shouldDisable = (btnName: string) => {
    const openPanels = new Set(openPanelsManager.values()) as Set<string>;
    return restrictedToOnePanelTypes.includes(btnName) && openPanels.has(btnName);
  };
</script>

{#snippet GroupItem(name: PanelType, Icon: typeof IconType, inactive: boolean = false)}
  <button
    disabled={shouldDisable(name)}
    class="group-item {panelType === name && 'active'} {(shouldDisable(name) || inactive) &&
      'inactive'}"
    onclick={() => onPanelTypeChange(name)}
  >
    <Icon size={16} />
    {name}
  </button>
{/snippet}

<div class="main">
  <div class="group">
    <div class="group-header">General</div>
    <div class="group-items">
      {@render GroupItem('Monitor', SquareTerminal)}
      {@render GroupItem('Renode Logs', Logs)}
    </div>
  </div>
  <div class="group">
    <div class="group-header">Peripherals</div>
    <div class="group-items">
      {@render GroupItem('UARTs', ArrowRightLeft)}
      {@render GroupItem('Sensors', Radio)}
    </div>
  </div>
</div>

<style>
  button {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;
  }

  .main {
    position: relative;
    z-index: 10000;
    border: 1px #242424 solid;
    border-radius: 6px;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    background-color: #000000cc;
    color: #ececee;
    width: fit-content;
    height: fit-content;
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: row;
    gap: 6px;
  }

  .group-header {
    color: #9e9ea4;
    font-size: 10px;
    font-weight: 400;
    line-height: 16px;
    letter-spacing: 0;
  }

  .group:first-child {
    padding-left: 12px;
  }
  .group:last-child {
    padding-right: 12px;
  }

  .group {
    padding-top: 12px;
    padding-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-item {
    width: 160px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0;
    font-weight: 400;
  }

  .group-item.active {
    background-color: #0c1939;
    color: #67a5ff;
  }

  .group-item.inactive {
    color: #9e9ea4;
    pointer-events: none;
    cursor: not-allowed;
  }

  .group-item:hover:not(.active) {
    background-color: #1e1e20;
  }
</style>
