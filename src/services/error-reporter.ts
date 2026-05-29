/**
 * Sprint 150 — Privacy-first error reporter.
 *
 * Reports unhandled errors and React boundary catches to a Cloudflare Worker
 * endpoint for observability. Strict privacy rules:
 *
 * - No PII (no user identifiers, no IP logging, no cookies)
 * - No DOM snapshots or user input content
 * - Only sends: error name, sanitized message, stack (file:line only), app version
 * - Rate-limited: max 5 reports per session to prevent flooding
 * - Gated by VITE_ERROR_ENDPOINT env var — if unset, errors are silently dropped
 *
 * Usage:
 *   import { initErrorReporter, reportError } from '@/services/error-reporter';
 *   initErrorReporter();  // in main.tsx — wires global handlers
 *   sendErrorReport(error);   // manual report from ErrorBoundary
 */

import { getFetch } from '../utils/browser-compat';

const ENDPOINT = import.meta.env['VITE_ERROR_ENDPOINT'] as string | undefined;
const MAX_REPORTS_PER_SESSION = 5;

let reportCount = 0;

interface ErrorReport {
  name: string;
  message: string;
  stack: string;
  version: string;
  url: string;
  timestamp: string;
  userAgent: string;
}

/** Strip absolute paths from stack traces — keep only filename:line:col */
function sanitizeStack(stack: string | undefined): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .slice(0, 10)
    .map((line) => line.replace(/https?:\/\/[^/]+\/WoodworkingShop\//g, ''))
    .join('\n');
}

/** Strip potential PII from error messages (emails, file paths, long strings) */
function sanitizeMessage(msg: string): string {
  return msg
    .replace(/[\w.%+-]+@[\w.-]+\.\w{2,}/g, '[EMAIL]')
    .replace(/(?:[A-Z]:)?(?:[/\\][\w.-]+){3,}/g, '[PATH]')
    .slice(0, 200);
}

function buildReport(error: Error): ErrorReport {
  return {
    name: error.name,
    message: sanitizeMessage(error.message),
    stack: sanitizeStack(error.stack),
    version: ((globalThis as Record<string, unknown>)['__APP_VERSION__'] as string) ?? 'unknown',
    url: window.location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 120),
  };
}

/**
 * Send an error report. Safe to call unconditionally — no-ops when:
 * - VITE_ERROR_ENDPOINT is unset
 * - Rate limit (5/session) is exceeded
 * - The network request fails (fire-and-forget)
 */
export function sendErrorReport(error: Error): void {
  if (!ENDPOINT) return;
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount++;

  const report = buildReport(error);
  const fetchFn = getFetch();
  if (!fetchFn) return;

  // Fire-and-forget — never block UI or throw on report failure
  fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(() => {
    // Swallow — telemetry must never cause secondary errors
  });
}

/**
 * Wire global error handlers. Call once in main.tsx.
 * Captures:
 * - Uncaught exceptions (window.onerror / error event)
 * - Unhandled promise rejections
 */
export function initErrorReporter(): void {
  if (!ENDPOINT) return;

  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      sendErrorReport(event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      sendErrorReport(reason);
    } else if (typeof reason === 'string') {
      sendErrorReport(new Error(reason));
    }
  });
}
