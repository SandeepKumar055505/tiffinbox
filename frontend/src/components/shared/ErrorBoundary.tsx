import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen t-bg flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
            <p className="text-3xl">⚠️</p>
            <h2 className="text-lg font-bold t-text">Something went wrong</h2>
            <p className="t-text-muted text-sm">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
