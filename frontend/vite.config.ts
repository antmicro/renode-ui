import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const debugBuild = ['true', 'yes', '1'].includes(process.env.VITE_DEBUG_BUILD?.toLowerCase() || '');

export default defineConfig({
  plugins: [sveltekit()],
  build: debugBuild
    ? undefined
    : {
        minify: 'terser',
        terserOptions: {
          compress: {
            pure_funcs: ['console.log', 'console.debug'],
          },
        },
      },
});
