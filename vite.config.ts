import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID || env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: true, // Enable source maps for production debugging
      }
    };
});
