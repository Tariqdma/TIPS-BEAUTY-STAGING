import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/TIPS-BEAUTY-STAGING/driver/',
  plugins: [react()],
});
