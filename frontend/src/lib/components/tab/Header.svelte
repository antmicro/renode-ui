<script lang="ts">
  import { ChevronDown, ChevronUp, X } from '@lucide/svelte';
  import { DropdownMenu } from 'bits-ui';
  import PanelDropdown from './Dropdown.svelte';
  import { typeToIcon } from '$lib/utils';
  import { openPanelsManager, type PanelType } from '$lib/store.svelte';
  import type { DockviewPanelApi } from 'dockview-core';

  let { api, panelType }: { api: DockviewPanelApi; panelType: PanelType } = $props();
  let isDropdownOpen = $state(false);
  let tabElement = $state<HTMLDivElement>();

  // svelte-ignore state_referenced_locally - tab props do not change
  let Icon = typeToIcon(panelType);

  const onPanelTypeChange = (v: PanelType) => {
    openPanelsManager.set(api.id, v);
    api.updateParameters({ panelType: v });
    isDropdownOpen = false;
  };

  const onClose = () => {
    api.close();
  };
</script>

<div class="tab tab-dock" bind:this={tabElement}>
  <div class="left-group">
    <Icon size={16} />
    {panelType}
    <div class="dropdown">
      <DropdownMenu.Root bind:open={isDropdownOpen}>
        <DropdownMenu.Trigger
          class="dropdown-trigger"
          data-test-id="panel-dropdown-btn"
          aria-label={`Toggle ${panelType} panel menu`}
          onclick={(event) => event.stopPropagation()}
        >
          {#if isDropdownOpen}
            <ChevronUp size={16} />
          {:else}
            <ChevronDown size={16} />
          {/if}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          class="popover"
          side="bottom"
          sideOffset={-4}
          align="start"
          alignOffset={4}
          customAnchor={tabElement ?? null}
        >
          <PanelDropdown {panelType} {onPanelTypeChange} />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>
  <div class="right-group">
    <div data-test-id="close-panel-btn"><X size={16} onclick={onClose} /></div>
  </div>
</div>

<style>
  .tab {
    color: #9e9ea4;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    height: 34px;
    background-color: #171717;
    border: 1px #242424 solid;
    padding: 0px 6px 0px 6px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    overflow: visible;
    gap: 8px;
  }

  .left-group,
  .right-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
  }

  .left-group {
    gap: 8px;
    font-weight: 400;
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0;
    padding: 10px 0px 10px 0px;
  }

  .right-group {
    right: 0;
    gap: 8px;
  }

  .right-group div {
    max-height: 16px;
  }

  .right-group div:hover {
    color: #ececee;
  }

  .dropdown :global(.dropdown-trigger) {
    all: unset;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .dropdown :global(.dropdown-trigger:hover) {
    background: rgb(255 255 255 / 0.08);
  }

  .dropdown :global(.dropdown-trigger[data-state='open'] .dropdown-icon-closed) {
    display: none;
  }

  .dropdown :global(.dropdown-trigger[data-state='open'] .dropdown-icon-open) {
    display: flex;
  }

  .dropdown :global(.dropdown-trigger:hover),
  .dropdown :global(.dropdown-trigger[data-state='open']) {
    background-color: #1e1e20;
    color: #ececee;
  }

  .dropdown :global(.popover) {
    z-index: 100;
  }
</style>
