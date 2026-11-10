<script lang="ts">
  import { openCansManager, type PanelType } from '$lib/store.svelte';
  import { typeToWsURL } from '$lib/utils';

  import { type CANFrame, CANFrameSchema } from 'renode-ws-api';

  import DataTable, { createBatchedRows, toRenderRow, type Column } from './DataTable.svelte';
  import Select from './Select.svelte';
  import { onDestroy } from 'svelte';

  interface Props {
    panelType: PanelType;
    predefinedPeripheral: string | null;
  }

  let { panelType, predefinedPeripheral = null }: Props = $props();

  const decoder = new TextDecoder('utf-8');

  const formatDecoded = (decoded: NonNullable<CANFrame['DecodedMessage']>) =>
    `${decoded.Name}: ${decoded.Signals.map((s) => `${s.Name}=${s.Value}${s.Unit ? ` ${s.Unit}` : ''}`).join(', ')}`;

  const frameHex = (frame: CANFrame) => Uint8Array.fromBase64(frame.Message.Data).toHex();

  const columns: Column<CANFrame>[] = $state([
    {
      header: 'ID',
      sortable: true,
      width: '100px',
      format: (f) => f.Message.Id,
      primaryKey: true,
      placeholder: 'id:20',
    },
    {
      header: 'Timestamp',
      sortable: true,
      width: '150px',
      format: (f) => f.TimeStamp,
    },
    {
      header: 'Sender',
      sortable: true,
      width: '150px',
      format: (f) => f.Sender,
      placeholder: 'sender:ECUC.fdcan1',
    },
    {
      header: 'Data',
      format: (f) => `0x${frameHex(f)}`,
    },
  ]);

  const decodedColumn: Column<CANFrame> = {
    header: 'Decoded',
    format: (f) => (f.DecodedMessage ? formatDecoded(f.DecodedMessage) : `0x${frameHex(f)}`),
  };

  const renderRows = createBatchedRows();

  const hubs = $derived([...openCansManager]);

  // svelte-ignore state_referenced_locally - tab props do not change
  let hub: string | null = $state(predefinedPeripheral);

  $effect(() => {
    renderRows.clear();
    if (!hub || !openCansManager.has(hub)) return;

    const wsURL = typeToWsURL(panelType, undefined, hub);
    const socket = new WebSocket(wsURL);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (event) => {
      try {
        const jsonString =
          event.data instanceof ArrayBuffer ? decoder.decode(event.data) : event.data;
        const frame = CANFrameSchema.parse(JSON.parse(jsonString));

        // When there is a frame with DecodedMessage swap Data column to Decoded column
        if (frame.DecodedMessage && columns[columns.length - 1].header !== 'Decoded') {
          columns[columns.length - 1] = decodedColumn;
        }

        renderRows.append(toRenderRow(columns, frame, renderRows.latestIndex));
      } catch (e) {
        console.error('Failed to decode or parse frame:', e);
      }
    };

    return () => {
      socket.close();
    };
  });

  onDestroy(() => {
    renderRows.destroy();
  });
</script>

<DataTable {columns} rows={renderRows.rows} groupable searcheable>
  {#snippet toolbar()}
    <Select
      header="CAN hub selection"
      placeholder="CAN hubs"
      items={hubs}
      bind:selectedItem={hub}
    />
  {/snippet}
</DataTable>
