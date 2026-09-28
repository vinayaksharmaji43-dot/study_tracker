import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Default to '/' for Cloudflare Workers/Pages & custom domains; supports custom base via VITE_BASE_PATH
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
});
