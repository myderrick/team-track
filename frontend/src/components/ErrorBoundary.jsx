import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Optionally log to Sentry or Supabase
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900">
          <div className="font-semibold text-red-700 dark:text-red-300">Something went wrong.</div>
          <div className="text-sm text-red-600 dark:text-red-400 mt-1">{this.state.error?.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
