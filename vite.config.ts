import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/folder': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split third-party code out of the per-page/app chunks so it stays
        // cached in the browser across our own redeploys (app code changes
        // far more often than dependencies do). React core is isolated
        // further still into its own chunk since it changes least of all -
        // the path-boundary regex matches the package DIRECTORY, so
        // react-hot-toast / react-icons don't get pulled in with it and are
        // left in the general vendor chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});