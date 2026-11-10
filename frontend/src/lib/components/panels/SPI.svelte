<script lang="ts">
  import { openSpisManager, type PanelType } from '$lib/store.svelte';
  import { SpiExchangesArraySchema } from 'renode-ws-api';
  import DataTable, { createBatchedRows, toRenderRow, type Column } from './DataTable.svelte';
  import Select from './Select.svelte';
  import { typeToWsURL } from '$lib/utils';

  interface Props {
    panelType: PanelType;
    predefinedMachine: string | null;
    predefinedPeripheral: string | null;
  }

  type SpiExchange = ReturnType<typeof SpiExchangesArraySchema.parse>[number];

  let { panelType, predefinedMachine = null, predefinedPeripheral = null }: Props = $props();

  const decoder = new TextDecoder('utf-8');

  const columns: Column<SpiExchange>[] = [
    { header: 'ID', primaryKey: true, width: '100px' },
    {
      header: 'Timestamp',
      format: (m) => m.TimeStamp,
      width: '150px',
    },
    {
      header: 'PICO',
      format: (m) => `0x${m.PICO.toString(16).padStart(2, '0')}`,
      width: '100px',
    },
    {
      header: 'POCI',
      format: (m) => `0x${m.POCI.toString(16).padStart(2, '0')}`,
      width: '100px',
    },
    { header: 'Peripheral', format: (m) => m.PeripheralName },
  ];

  const renderRows = createBatchedRows();

  const machines = $derived([...openSpisManager.keys()]);

  // svelte-ignore state_referenced_locally - tab props do not change
  let machine: string | null = $state(predefinedMachine);
  // svelte-ignore state_referenced_locally - tab props do not change
  let controller: string | null = $state(predefinedPeripheral);

  const controllers = $derived(machine ? (openSpisManager.get(machine) ?? []) : []);

  $effect(() => {
    renderRows.clear();
    if (!machine || !controller || !controllers.includes(controller)) return;

    const wsURL = typeToWsURL(panelType, machine, controller);
    const socket = new WebSocket(wsURL); /* FIXME: reuse socket if several panels are opened */
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (event) => {
      try {
        const jsonString =
          event.data instanceof ArrayBuffer ? decoder.decode(event.data) : event.data;
        const frames = SpiExchangesArraySchema.parse(JSON.parse(jsonString));

        for (const frame of frames) {
          renderRows.append(toRenderRow(columns, frame, renderRows.latestIndex));
        }
      } catch (e) {
        console.error('Failed to decode or parse frame:', e);
      }
    };

    return () => {
      renderRows.destroy();
      socket.close();
    };
  });
</script>

<DataTable {columns} rows={renderRows.rows}>
  {#snippet toolbar()}
    <Select
      header="Machine selection"
      placeholder="Machines"
      items={machines}
      bind:selectedItem={machine}
    />
    <Select
      header="SPI controller selection"
      placeholder="SPI controllers"
      items={controllers}
      bind:selectedItem={controller}
    />
  {/snippet}
</DataTable>
