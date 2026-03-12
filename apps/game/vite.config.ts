import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
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
