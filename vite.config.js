import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Cloudflare Pages serves from root '/', while GitHub Pages serves from '/study_tracker/'
  base: process.env.CF_PAGES ? '/' : (process.env.VITE_BASE_PATH || '/study_tracker/'),
  plugins: [react()],
});
