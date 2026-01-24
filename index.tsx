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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H0',location:'index.tsx:init:12',message:'init start',data:{hasReact:!!React,hasCreateRoot:!!createRoot,hasStrictMode:!!StrictMode},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log

  // Check if we need to redirect US visitors from gopopera.ca to gopopera.com
  // This runs quickly and fails open (no redirect) if geo lookup fails
  await maybeRedirectToCom();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = createRoot(rootElement);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'H0',location:'index.tsx:init:24',message:'render start',data:{rootElementFound:!!rootElement},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log

  root.render(
    <StrictMode>
      <ErrorBoundary fallback={<div style={{padding:16}}>Something went wrong.</div>}>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

init();
