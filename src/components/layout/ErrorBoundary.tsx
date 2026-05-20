import { Component, type ReactNode, type ErrorInfo } from 'react';
import i18next from 'i18next';
import { IconWarning } from './Icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Friendly name of the panel for the error message (e.g. "Optimizer", "PDF Export"). */
  panelName?: string;
  /** Optional callback invoked when an error is caught (for telemetry). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

/**
 * React class-based error boundary that catches render/lifecycle errors in
 * its subtree and shows a friendly fallback instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary panelName="Optimizer">
 *     <OptimizerView />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // Log to console in development only — never in production bundles
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', this.props.panelName ?? 'Unknown panel', error, info);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  private handleCopyError = () => {
    const detail = this.state.error?.stack ?? this.state.error?.message ?? 'Unknown error';
    navigator.clipboard.writeText(detail).then(
      () => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      },
      () => { /* clipboard unavailable — silent fail */ },
    );
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    const { panelName = 'Panel' } = this.props;
    const msg = this.state.error?.message ?? 'Unknown error';
    const { copied } = this.state;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
      >
        <IconWarning className="text-amber-500 dark:text-amber-400" size={40} aria-label="Error" />
        <div>
          <p className="text-lg font-semibold text-wood-800 dark:text-wood-100">{panelName} failed to render</p>
          <p className="mt-1 text-sm text-wood-500 dark:text-wood-400 max-w-sm">
            An unexpected error occurred. You can try reloading the panel or refreshing the page.
          </p>
          <pre className="mt-3 text-xs text-left bg-wood-100 dark:bg-wood-800 text-red-700 dark:text-red-300 rounded p-3 max-w-md overflow-auto">
            {msg}
          </pre>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded bg-wood-600 hover:bg-wood-700 text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={this.handleCopyError}
            aria-label={copied ? i18next.t('errors.copied') : i18next.t('errors.copyDetails')}
            className="px-4 py-2 rounded border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 text-sm font-medium transition-colors"
          >
            {copied ? i18next.t('errors.copied') : i18next.t('errors.copyDetails')}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 text-sm font-medium transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
