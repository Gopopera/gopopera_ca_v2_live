import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary fallback={<div style={{padding:16}}>Something went wrong.</div>}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
