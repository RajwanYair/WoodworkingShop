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

export { getLocalErrorReports, initErrorReporter, sendErrorReport } from '../platform/diagnostics/index';
export type { LocalErrorReport } from '../platform/diagnostics/index';
