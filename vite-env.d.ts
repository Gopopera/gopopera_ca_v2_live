/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase environment variables (Vite prefix)
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  
  // Google Maps API Key
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  
  // Firebase environment variables (Next.js compatibility prefix)
  readonly NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  readonly NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  readonly NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  readonly NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
  readonly NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  readonly NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
  
  // Resend environment variables
  readonly VITE_RESEND_API_KEY: string;
  readonly VITE_RESEND_FROM?: string;
  
  // Development mode
  readonly DEV?: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

