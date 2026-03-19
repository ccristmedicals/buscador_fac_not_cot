import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.4.23',
    port: 8038,
    proxy: {
      '/api': {
        target: 'http://192.168.4.23:8039',
        changeOrigin: true,
      }
    }
  },
});