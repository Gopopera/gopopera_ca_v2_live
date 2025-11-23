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

console.log('[BOOT] main.tsx loading');

ReactDOM.createRoot(el).render(
  <AppErrorBoundary>
    <SafeShell />
  </AppErrorBoundary>
);

console.log('[BOOT] React root rendered');
