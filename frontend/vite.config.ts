import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^monaco-editor\/esm\/vs/,
        replacement: fileURLToPath(new URL("../node_modules/monaco-editor/esm/vs", import.meta.url)),
      },
    ],
  },
  optimizeDeps: { exclude: ["monaco-editor"] },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        timeout: 130_000,
        proxyTimeout: 130_000,
        configure(proxy) {
          proxy.on("error", (error, request) => {
            console.error(`[Vite API proxy] ${request.method} ${request.url} failed: ${error.message}`);
          });
        },
      },
    },
  },
});
