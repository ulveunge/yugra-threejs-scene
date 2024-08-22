import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { generateInputEntries, gatherMockData, ViteEjsHotModuleReloadPlugin } from './config/vite';

export default defineConfig({
  base: '/yugra-threejs-scene/',
  server: {
    host: true,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...generateInputEntries(__dirname),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/ts'),
    },
  },
  plugins: [
    ViteEjsPlugin(gatherMockData(__dirname), {
      ejs: () => ({
        views: [resolve(__dirname, 'src/partials')],
      }),
    }),
    ViteEjsHotModuleReloadPlugin(),
  ],
});
