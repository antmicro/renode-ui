import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' with { type: 'json' };

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    output: {
      bundleStrategy: 'inline',
    },
    router: {
      type: 'hash',
    },
    alias: process.env.WS_API_PATH ? { 'renode-ws-api': process.env.WS_API_PATH } : {},
  },
};

export default config;
