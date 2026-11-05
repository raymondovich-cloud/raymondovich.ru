import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        legacy: "index.html",
        spa: "spa.html",
      },
    },
  },
});
