<script lang="ts">
  import { ChevronsUpDown, Dot } from '@lucide/svelte';

  interface Props {
    items: string[];
    header: string;
    hideHeader?: boolean;
    selectedItem: string;
    disabled?: boolean;
  }

  let {
    items,
    header,
    hideHeader = false,
    selectedItem = $bindable(),
    disabled = false,
  }: Props = $props();

  let open = $state(false);
</script>

<div data-test-id={`${header}-btn`}>
  <button {disabled} class="open" onclick={() => (open = !open)}
    >{selectedItem}<ChevronsUpDown size={14} /></button
  >
  {#if open}
    <div class="dropdown">
      {#if !hideHeader}
        <div class="header">{header}</div>
      {/if}
      <div class="items-list">
        {#each items as item (item)}
          <button
            class="item"
            onclick={() => {
              if (selectedItem === item) {
                selectedItem = header;
              } else {
                selectedItem = item;
              }

              open = false;
            }}
          >
            {#if selectedItem === item}
              <Dot size={16} />
            {:else}
              <div class="empty"></div>
            {/if}
            {item}
          </button>
        {/each}
      </div>
    </div>
    <button aria-label="close dropdown" class="focus-catcher" onclick={() => (open = !open)}
    ></button>
  {/if}
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

  button:disabled {
    cursor: not-allowed;
  }

  button.open {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: #141415;
    color: #9e9ea4;
    border-radius: 6px;
    border: 1px solid #373739;
    padding: 2px 6px 2px 6px;
    font-size: 12px;
    line-height: 16px;
  }

  .header {
    color: #9e9ea4;
    border-bottom: 1px solid #242424;
    padding: 0px 8px 4px 8px;
  }

  .empty {
    width: 16px;
    height: 16px;
  }

  .dropdown {
    z-index: 2;
    position: absolute;
    top: 34px;
    background-color: #000000;
    border: 1px solid #242424;
    padding: 4px 0px 4px 0px;
    border-radius: 6px;
    border: 1px solid #242424;
  }

  .items-list {
    overflow-y: auto;
    overflow-x: hidden;
    text-overflow: ellipsis;
    max-height: 182px;
  }

  .item {
    height: 26px;
    display: flex;
    align-items: center;
    color: #ececee;
    width: 100%;
    padding: 0px 5px 0px 5px;
  }

  .item:hover {
    background-color: #1f1f1f;
  }

  .focus-catcher {
    position: absolute;
    z-index: 1;
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    cursor: default;
  }
</style>
