<script lang="ts">
  import { ChevronDown, ChevronUp, X } from '@lucide/svelte';
  import Dropdown from './Dropdown.svelte';
  import { typeToIcon } from '$lib/utils';
  import { openPanelsManager, type PanelType } from '$lib/store.svelte';
  import type { DockviewPanelApi } from 'dockview-core';

  let { api, panelType }: { api: DockviewPanelApi; panelType: PanelType } = $props();

  // svelte-ignore state_referenced_locally - tab props do not change
  let Icon = typeToIcon(panelType);

  const onPanelTypeChange = (v: PanelType) => {
    openPanelsManager.set(api.id, v);
    api.updateParameters({ panelType: v });
  };

  const onClose = () => {
    api.close();
  };
</script>

<div class="tab tab-dock">
  <div class="left-group">
    <Icon size={16} />
    {panelType}
    <div class="dropdown-active">
      <ChevronUp size={16} />
    </div>
    <div class="dropdown-inactive">
      <ChevronDown size={16} />
    </div>
  </div>
  <div class="right-group">
    <div data-test-id="close-panel-btn"><X size={16} onclick={onClose} /></div>
  </div>
  <div class="popover">
    <Dropdown {panelType} {onPanelTypeChange} />
  </div>
</div>

<style>
  .popover {
    display: none;
  }

  .tab > * {
    overflow: visible;
  }

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

  .right-group div,
  .left-group div {
    max-height: 16px;
  }

  .right-group div:hover {
    color: #ececee;
  }

  .dropdown-active {
    display: none;
  }

  .dropdown-active,
  .dropdown-inactive {
    align-items: center;
  }

  .left-group:hover .dropdown-active {
    display: flex;
  }

  .left-group:hover ~ .popover,
  .popover:hover {
    display: block;
    position: absolute;
    left: 4px;
    top: 30px;
  }

  .left-group:hover .dropdown-inactive {
    display: none;
  }
</style>
