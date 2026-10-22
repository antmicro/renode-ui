<script lang="ts">
  import '$lib/aesir/src/styles/aesir-global.css';
  import '$lib/aesir/src/styles/aesir-motion.css';
  import '$lib/aesir/src/styles/aesir-typography.css';
  import favicon from '$lib/assets/favicon.svg';
  import '$lib/assets/global.css';
  import Dockview from '$lib/components/dockview/Dockview.svelte';
  import { handleException } from '$lib/store.svelte';
  import { AesirToaster } from '$lib/aesir/src/index.js';

  const parseArgs = () =>
    Object.fromEntries(
      ['--renode-port'].map((argName) => {
        const argVal = (window.NL_ARGS || [])
          .map((arg, idx) => {
            if (arg == argName) return window.NL_ARGS?.[idx + 1];
            if (arg.startsWith(argName + '=')) return arg.split('=')[1];
            return null;
          })
          .find(Boolean);
        return [argName, argVal];
      }),
    );

  const args = window.Neutralino ? parseArgs() : {};

  const handleError = (event) => {
    if (handleException(event.error)) {
      event.preventDefault();
    }
  };

  const handleUnhandledRejection = (event) => {
    if (event.reason instanceof Error && handleException(event.reason)) {
      event.preventDefault();
    }
  };
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={favicon} />
</svelte:head>

<svelte:window on:error={handleError} on:unhandledrejection={handleUnhandledRejection} />

<Dockview
  onQuit={() => window.Neutralino.app.exit()}
  style={{ width: '100vw', height: '100vh' }}
  renodePort={Number(args['--renode-port'])}
/>

<AesirToaster />
