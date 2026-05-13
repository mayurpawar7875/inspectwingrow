import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'supabase': ['@supabase/supabase-js'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'prompt', // Changed to prompt for manual update control
      injectRegister: 'auto',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // CRITICAL: Auth endpoints must NEVER be cached - always hit network
            // Caching token/refresh responses causes users to be logged out on app reopen
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-auth-no-cache',
            }
          },
          {
            // Storage uploads/downloads must NEVER be cached or timed-out by SW.
            // Large video uploads can take much longer than 10s on mobile networks.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-storage-no-cache',
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /\.(?:js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            urlPattern: /\.(?:css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],
        navigateFallback: null,
        // Removed skipWaiting and clientsClaim for manual update control
      },
      manifest: {
        name: 'Wingrow Market Management',
        short_name: 'Wingrow',
        description: 'Market management system for Wingrow Agritech',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
