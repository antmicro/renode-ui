<script lang="ts">
  import '$lib/assets/global.css';
  import favicon from '$lib/assets/favicon.svg';
  import Dockview from '$lib/components/dockview/Dockview.svelte';

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
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={favicon} />
</svelte:head>

<Dockview
  onQuit={() => window.Neutralino.app.exit()}
  style={{ width: '100vw', height: '100vh' }}
  renodePort={Number(args['--renode-port'])}
/>
