import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Clear output except for Tauri-related logs
  clearScreen: false,
  // Tauri expects the dev server at a specific port
  server: {
    port: 5173,
    strictPort: true,
  },
  // Tauri uses a custom protocol in production
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri supports ES modules
    // chrome105+ supports top-level await
    target: ['es2022', 'chrome105', 'safari15'],
    // Don't minify for easier debugging during development
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce a sourcemap for debugging
    sourcemap: true,
    // Output to src-tauri/dist for Tauri to bundle
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
});
