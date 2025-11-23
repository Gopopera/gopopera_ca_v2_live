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

