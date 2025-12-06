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
        sourcemap: false, // Disable source maps in production for smaller bundles
        // CACHE-BUSTING: Force clean build without cache
        emptyOutDir: true,
        rollupOptions: {
          external: ['@react-google-maps/api'], // Exclude Google Maps from bundle
          output: {
            // CACHE-BUSTING: Use hash in filenames (Vite automatically adds content hash)
            entryFileNames: `assets/[name]-[hash].js`,
            chunkFileNames: `assets/[name]-[hash].js`,
            assetFileNames: `assets/[name]-[hash].[ext]`,
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
              'zustand-vendor': ['zustand'],
            },
          },
        },
        chunkSizeWarningLimit: 600, // Increase limit to 600KB
      }
    };
});
