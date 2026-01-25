import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface PageErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface PageErrorBoundaryProps {
    children: React.ReactNode;
}

/**
 * Error boundary for catching chunk load failures and other render errors.
 * Wraps the main page Suspense boundary to provide a friendly error UI
 * when lazy-loaded chunks fail to load (e.g., network issues, deployments).
 */
export class PageErrorBoundary extends React.Component<
    PageErrorBoundaryProps,
    PageErrorBoundaryState
> {
    constructor(props: PageErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error for debugging (could be sent to error tracking service)
        console.error('[PageErrorBoundary] Caught error:', error);
        console.error('[PageErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    handleRefresh = () => {
        // Clear error state and reload the page
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isChunkLoadError =
                this.state.error?.message?.includes('Loading chunk') ||
                this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
                this.state.error?.message?.includes('Unable to preload CSS');

            return (
                <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-[#15383c] mb-3">
                            {isChunkLoadError ? 'Page failed to load' : 'Something went wrong'}
                        </h1>

                        <p className="text-gray-600 mb-6">
                            {isChunkLoadError
                                ? 'This usually happens after an update. Please refresh to get the latest version.'
                                : 'An unexpected error occurred. Please try refreshing the page.'}
                        </p>

                        <button
                            onClick={this.handleRefresh}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#15383c] text-white font-semibold rounded-full hover:bg-[#1f4a50] transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Refresh Page
                        </button>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                                    Error details (dev only)
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
