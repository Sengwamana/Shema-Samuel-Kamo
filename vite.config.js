import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
    copyPublicDir: false,
  },
  server: {
    port: 3000,
    open: false,
  },
});
