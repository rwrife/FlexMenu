import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlexMenu',
      fileName: (format) => `flexmenu.${format === 'es' ? 'mjs' : 'umd.js'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {
          FlexMenu: 'FlexMenu'
        }
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild'
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src']
    })
  ]
});
