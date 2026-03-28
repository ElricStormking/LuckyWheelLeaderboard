import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@lucky-wheel/contracts": path.resolve(__dirname, "../contracts/src/index.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
