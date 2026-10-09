<script lang="ts">
  import { openSocket, type Socket } from '$lib/store.svelte';
  import { typeToWsURL } from '$lib/utils';
  import { DisplayDecoder, type VideoConfig } from 'renode-ws-api';
  import { onDestroy, onMount } from 'svelte';

  interface Props {
    port: number;
    name: string;
    mode: string;
    info?: string;
  }

  let { port, name, mode, info = $bindable('') }: Props = $props();

  let canvas: HTMLCanvasElement;
  let socket: Socket | undefined;
  let destroyed = false;
  let config: VideoConfig | undefined;
  let receivedBytes = 0;
  const decoder = new DisplayDecoder();

  const objectFit: Record<string, string> = { Fit: 'contain', Stretch: 'fill', Center: 'none' };

  const onMessage = async (data: ArrayBuffer) => {
    receivedBytes += data.byteLength;
    const message = await decoder.decode(data);
    if (message.kind === 'config') {
      config = message.config;
      canvas.width = config.width;
      canvas.height = config.height;
      info = `${config.width}×${config.height} ${config.format}`;
    } else if (message.kind === 'frame' && config) {
      canvas
        .getContext('2d')!
        .putImageData(new ImageData(message.pixels, config.width, config.height), 0, 0);
    } else if (message.kind === 'stats' && config) {
      // Stats arrive about once per second
      info = `${config.width}×${config.height} ${config.format} · ${message.framesPerSecond.toFixed(0)} fps · ${(receivedBytes / 1024).toFixed(1)} KiB/s`;
      receivedBytes = 0;
    }
  };

  onMount(async () => {
    const s = await openSocket(typeToWsURL('Displays', port), name);
    if (destroyed) {
      s.close();
      return;
    }
    socket = s;
    socket.addEventListener('message', ({ data }) => {
      if (data instanceof ArrayBuffer) {
        onMessage(data).catch(console.error);
      }
    });
  });

  onDestroy(() => {
    destroyed = true;
    socket?.close();
  });
</script>

<div class="display-view">
  <canvas bind:this={canvas} style:object-fit={objectFit[mode] ?? 'contain'}></canvas>
</div>

<style>
  .display-view {
    flex: 1;
    min-height: 0;
    display: flex;
    background-color: #000;
  }

  canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
</style>
