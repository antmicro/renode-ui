import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import removeConsole from 'vite-plugin-remove-console';

const plugins: PluginOption[] = [commonjs()];
if (!['true', 'yes', '1'].includes(process.env.VITE_DEBUG_BUILD?.toLocaleLowerCase() || '')) {
  plugins.push(removeConsole({ includes: ['debug', 'log'] }));
}

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      plugins,
    },
  },
});
