import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './lib/ui-normalize.css';
import App from '../App';
import { AppErrorBoundary } from './utils/AppErrorBoundary';

const el = document.getElementById('root')!;
const DEBUG_APP_SHELL = false; // flip to false after we confirm mount

function SafeShell() {
  if (DEBUG_APP_SHELL) {
    return <div style={{padding:24}} data-boot="ok">App shell placeholder (DEBUG_APP_SHELL)</div>;
  }
  return <App />;
}

// CACHE-BUSTING: Force module reload
console.log('[BOOT] main.tsx loading', { buildId: 'debug123', timestamp: new Date().toISOString() });

// Global error handler to catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[GLOBAL] Unhandled promise rejection:', event.reason);
  // Prevent default browser error logging if we've handled it
  // But still log it for debugging
  if (event.reason?.message?.includes('timeout')) {
    console.warn('[GLOBAL] Timeout error caught - this should be handled by the component');
  }
});

ReactDOM.createRoot(el).render(
  <AppErrorBoundary>
    <SafeShell />
  </AppErrorBoundary>
);

console.log('[BOOT] React root rendered');
