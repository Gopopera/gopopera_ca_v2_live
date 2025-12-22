import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// CACHE-BUSTING: Force rebuild with unique build ID
const BUILD_ID_FORCE = process.env.BUILD_ID_FORCE || process.env.VERCEL_DEPLOYMENT_ID || `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        host: true,
        port: 3000,
        strictPort: true,
        allowedHosts: ['.ngrok-free.dev'],
        hmr: {
          overlay: false
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Expose Firebase env vars (support both VITE_ and NEXT_PUBLIC_ prefixes for compatibility)
        // Also check process.env for production deployments (Vercel, Netlify, etc.)
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(
          env.VITE_FIREBASE_API_KEY || 
          env.NEXT_PUBLIC_FIREBASE_API_KEY || 
          process.env.VITE_FIREBASE_API_KEY || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(
          env.VITE_FIREBASE_AUTH_DOMAIN || 
          env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 
          process.env.VITE_FIREBASE_AUTH_DOMAIN || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(
          env.VITE_FIREBASE_PROJECT_ID || 
          env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
          process.env.VITE_FIREBASE_PROJECT_ID || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(
          env.VITE_FIREBASE_STORAGE_BUCKET || 
          env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
          process.env.VITE_FIREBASE_STORAGE_BUCKET || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
          env.VITE_FIREBASE_MESSAGING_SENDER_ID || 
          env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 
          process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(
          env.VITE_FIREBASE_APP_ID || 
          env.NEXT_PUBLIC_FIREBASE_APP_ID || 
          process.env.VITE_FIREBASE_APP_ID || 
          ''
        ),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(
          env.VITE_FIREBASE_MEASUREMENT_ID || 
          env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 
          process.env.VITE_FIREBASE_MEASUREMENT_ID || 
          ''
        ),
        // Expose Resend env vars
        'import.meta.env.VITE_RESEND_API_KEY': JSON.stringify(
          env.VITE_RESEND_API_KEY || 
          process.env.VITE_RESEND_API_KEY || 
          ''
        ),
        'import.meta.env.VITE_RESEND_FROM': JSON.stringify(
          env.VITE_RESEND_FROM || 
          process.env.VITE_RESEND_FROM || 
          'support@gopopera.ca'
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false, // Disable source maps in production for smaller bundles
        // CACHE-BUSTING: Force clean build without cache
        emptyOutDir: true,
        // Increase build timeout for large chunks
        chunkSizeWarningLimit: 1000, // Increase limit to 1000KB
        // Disable modulePreload for lazy-loaded chunks (prevents image-processing from loading on initial page)
        modulePreload: {
          resolveDependencies: (filename, deps) => {
            // Exclude image-processing chunk from preloading - it should load on-demand only
            return deps.filter(dep => !dep.includes('image-processing'));
          }
        },
        rollupOptions: {
          // Note: Do NOT externalize packages - they need to be bundled for production
          output: {
            entryFileNames: `assets/[name].[hash].js`,
            chunkFileNames: `assets/[name].[hash].js`,
            assetFileNames: `assets/[name].[hash].[ext]`,
            manualChunks: (id) => {
              // NOTE: Do NOT manually chunk image-processing modules (heic2any, imageProcessing, imageCompression).
              // They are dynamically imported via imageProcessingLoader and should be code-split naturally by Vite.
              // Adding them to manualChunks causes Rollup to add static imports, defeating lazy loading.
              
              // Vendor chunks
              if (id.includes('node_modules')) {
                // Exclude heic2any from vendor chunk - let it be dynamically imported
                if (id.includes('heic2any')) {
                  return undefined; // Let Vite handle code-splitting naturally
                }
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                if (id.includes('firebase')) {
                  return 'firebase-vendor';
                }
                if (id.includes('zustand')) {
                  return 'zustand-vendor';
                }
                if (id.includes('stripe')) {
                  return 'stripe-vendor';
                }
                // Other node_modules
                return 'vendor';
              }
            },
          },
        },
      }
    };
});
