import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.railway.app', '.up.railway.app']
  },
  preview: {
    allowedHosts: ['.railway.app', '.up.railway.app']
  }
});
