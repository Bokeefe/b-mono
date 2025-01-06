import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Add any sass options if needed
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:4171",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
