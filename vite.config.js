// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Must import 'path' module from node to use path.resolve
import path from 'path'; 

export default defineConfig({
  plugins: [react()],
  
  // 1. Root setting tells Vite to start serving from the 'index' subfolder.
  root: 'index', 
  
  // 2. Public directory setting tells Vite where the public assets are located.
  publicDir: '../public', 

  // 3. Resolve alias fixes the path issue for the JavaScript module imports
  resolve: {
    alias: {
      '/src': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    // Frontend runs on this port
    port: 5173, 
    strictPort: true,
  },
  
  // Base ensures the scripts inside index.html are found correctly
  base: '/', 
  
  build: {
    outDir: '../dist',
  },
});