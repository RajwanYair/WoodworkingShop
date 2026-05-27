import { Component, type ReactNode, type ErrorInfo } from 'react';
import i18next from 'i18next';
import { IconWarning } from './Icons';
import { reportError } from '../../services/error-reporter';

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
    return { hasError: true, error, copied: false };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // Sprint 150 — report to privacy-first telemetry endpoint
    reportError(error);
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
      () => {
        /* clipboard unavailable — silent fail */
      },
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
        className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      >
        <IconWarning className="text-amber-500 dark:text-amber-400" size={40} aria-label="Error" />
        <div>
          <p className="text-wood-800 dark:text-wood-100 text-lg font-semibold">{panelName} failed to render</p>
          <p className="text-wood-500 dark:text-wood-400 mt-1 max-w-sm text-sm">
            An unexpected error occurred. You can try reloading the panel or refreshing the page.
          </p>
          <pre className="bg-wood-100 dark:bg-wood-800 mt-3 max-w-md overflow-auto rounded p-3 text-left text-xs text-red-700 dark:text-red-300">
            {msg}
          </pre>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="bg-wood-600 hover:bg-wood-700 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={this.handleCopyError}
            aria-label={copied ? i18next.t('errors.copied') : i18next.t('errors.copyDetails')}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            {copied ? i18next.t('errors.copied') : i18next.t('errors.copyDetails')}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
