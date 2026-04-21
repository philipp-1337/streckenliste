import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Streckenliste',
        short_name: 'Streckenliste',
        description: 'Digitale Streckenliste für die Jagd',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Prevent the SW from intercepting blob: URL navigations — iOS Safari
        // throws WebKitBlobResource error 1 when the SW serves index.html for them.
        navigateFallbackDenylist: [/^blob:/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Jahr
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
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
      "@constants": path.resolve(__dirname, "src/constants"),
    },
  },
  build: {
    outDir: "build",
    sourcemap: true, // <--- hinzufügen
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Heavy libraries first
            if (id.includes("firebase")) {
              return "firebase";
            }
            if (id.includes("jspdf") || id.includes("html-to-image")) {
              return "pdf-export";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (id.includes("sonner")) {
              return "sonner";
            }
            if (id.includes("zod")) {
              return "zod";
            }
            
            // Framework pieces
            if (id.includes("react-router")) {
              return "router";
            }
            if (id.includes("react-hook-form") || id.includes("@hookform/resolvers")) {
              return "forms";
            }
            
            // Core React - be specific to avoid catching other react-related libs
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-core";
            }

            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    open: true,
  },
});