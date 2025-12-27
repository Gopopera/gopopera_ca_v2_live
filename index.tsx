import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { maybeRedirectToCom } from './src/utils/domainRedirect';

/**
 * Initialize and render the app.
 * Geo-based redirect check runs first (before render) to handle US visitors on gopopera.ca.
 * See src/utils/domainRedirect.ts for safety rules and escape hatches.
 */
async function init() {
  // Check if we need to redirect US visitors from gopopera.ca to gopopera.com
  // This runs quickly and fails open (no redirect) if geo lookup fails
  await maybeRedirectToCom();

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
}

init();
