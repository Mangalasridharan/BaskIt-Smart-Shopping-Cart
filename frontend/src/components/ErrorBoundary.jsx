import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-cream-100 text-ink dark:bg-[#090D16] dark:text-slate-100">
          <div className="max-w-md rounded-3xl border border-cream-300 bg-cream-50 p-8 shadow-lift dark:border-white/10 dark:bg-[#0F172A]">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-xs text-ink/60 dark:text-slate-400 mb-6">
              {this.state.error?.message || "An unexpected error occurred while loading this view."}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-indigo transition-all hover:bg-brand-700 active:scale-95"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
