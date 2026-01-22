import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'ca.gopopera.app',
  appName: 'Popera',
  webDir: 'dist',
  
  server: {
    // Production: load from bundled files (no URL)
    // For development with live reload, uncomment and set your local IP:
    // url: 'http://YOUR_LOCAL_IP:3000',
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },
  
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#15383c', // Match brand color for splash
    preferredContentMode: 'mobile',
    // Allow inline media playback
    allowsLinkPreview: true,
  },
  
  android: {
    backgroundColor: '#15383c',
    // Allow mixed content (http images on https pages)
    allowMixedContent: true,
  },
  
  plugins: {
    // Keyboard behavior
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    
    // Status bar (if using @capacitor/status-bar later)
    // StatusBar: {
    //   style: 'dark',
    //   backgroundColor: '#15383c',
    // },
  },
};

export default config;

