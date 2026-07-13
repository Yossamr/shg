
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Detect if we are building for GitHub Pages
const isGithubPages = process.env.GITHUB_PAGES === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  base: './', // Relative base path ensures compatibility with any custom subdirectory (like GitHub Pages /shg/) and native builds (Capacitor/Electron)
  optimizeDeps: {
    exclude: ['otpauth']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['otpauth']
    }
  }
});
