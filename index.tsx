import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Add a simple loading indicator
rootElement.style.minHeight = '100vh';
rootElement.style.display = 'flex';
rootElement.style.alignItems = 'center';
rootElement.style.justifyContent = 'center';
rootElement.innerHTML = '<div style="text-align: center; font-family: sans-serif; color: #15383c;"><h1>Loading Popera...</h1><p>Please wait...</p></div>';

const root = ReactDOM.createRoot(rootElement);

// Wrap in error boundary
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #15383c;">
      <h1>Error Loading App</h1>
      <p style="color: #e35e25; margin-top: 20px;">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">Please check the browser console for more details.</p>
    </div>
  `;
}