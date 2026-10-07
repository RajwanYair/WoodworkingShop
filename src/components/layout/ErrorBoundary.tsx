import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconWarning } from './Icons';
import { sendErrorReport } from '../../services/error-reporter';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Friendly name of the panel for the error message (e.g. "Optimizer", "PDF Export"). */
  panelName?: string;
  /** Optional callback invoked when an error is caught (for telemetry). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryMessages {
  panelFailed: string;
  recoveryHint: string;
  retry: string;
  copyDetails: string;
  copied: string;
  reloadPage: string;
  warning: string;
  details: string;
}

interface ErrorBoundaryViewProps extends ErrorBoundaryProps {
  messages: ErrorBoundaryMessages;
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
class ErrorBoundaryView extends Component<ErrorBoundaryViewProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryViewProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copied: false };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // Sprint 150 — report to privacy-first telemetry endpoint
    sendErrorReport(error);
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

    const { messages } = this.props;
    const msg = this.state.error?.message ?? 'Unknown error';
    const { copied } = this.state;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      >
        <IconWarning className="text-amber-500 dark:text-amber-400" size={40} aria-label={messages.warning} />
        <div>
          <p className="text-wood-800 dark:text-wood-100 text-lg font-semibold">{messages.panelFailed}</p>
          <p className="text-wood-500 dark:text-wood-400 mt-1 max-w-sm text-sm">{messages.recoveryHint}</p>
          <textarea
            aria-label={messages.details}
            readOnly
            rows={3}
            value={msg}
            className="bg-wood-100 dark:bg-wood-800 mt-3 w-full max-w-md resize-y overflow-auto rounded p-3 text-start text-xs text-red-700 dark:text-red-300"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="bg-accent hover:bg-accent-hover rounded px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {messages.retry}
          </button>
          <button
            type="button"
            onClick={this.handleCopyError}
            aria-label={copied ? messages.copied : messages.copyDetails}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            {copied ? messages.copied : messages.copyDetails}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-800 rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            {messages.reloadPage}
          </button>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const messages: ErrorBoundaryMessages = {
    panelFailed: t('errors.panelFailed', { panel: props.panelName ?? t('errors.panel') }),
    recoveryHint: t('errors.recoveryHint'),
    retry: t('errors.retry'),
    copyDetails: t('errors.copyDetails'),
    copied: t('errors.copied'),
    reloadPage: t('errors.reloadPage'),
    warning: t('errors.warning'),
    details: t('errors.details'),
  };
  return <ErrorBoundaryView {...props} messages={messages} />;
}
