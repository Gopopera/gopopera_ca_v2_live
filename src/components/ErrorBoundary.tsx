import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Popera] ErrorBoundary caught an error:', error, errorInfo);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'C1',location:'ErrorBoundary.componentDidCatch:23',message:'error boundary caught',data:{message:error?.message || null,stack:(error as any)?.stack || null,componentStack:errorInfo?.componentStack || null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 16, textAlign: 'center', fontFamily: 'sans-serif', color: '#15383c' }}>
          <h1>Something went wrong.</h1>
          <p style={{ color: '#e35e25', marginTop: 20 }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
          <p style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
            Please check the browser console for more details.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

