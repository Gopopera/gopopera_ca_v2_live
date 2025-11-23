import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { AppErrorBoundary } from './utils/AppErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
