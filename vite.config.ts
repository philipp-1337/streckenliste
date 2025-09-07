import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@components": path.resolve(__dirname, "src/components"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@data": path.resolve(__dirname, "src/data"),
      "@types": path.resolve(__dirname, "src/types"),
      "@auth": path.resolve(__dirname, "src/auth"),
    },
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase")) {
              return "firebase";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (id.includes("react")) {
              return "react";
            }
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    open: true,
  },
});