/** Privacy-first client error reporting and session-local diagnostics. */

const ENDPOINT = import.meta.env['VITE_ERROR_ENDPOINT'] as string | undefined;
const MAX_REPORTS_PER_SESSION = 5;
const MAX_LOCAL_ERRORS = 20;

let reportCount = 0;
const localErrors: LocalErrorReport[] = [];

export interface LocalErrorReport {
  name: string;
  message: string;
  stack: string;
  timestamp: string;
}

interface ErrorReport {
  name: string;
  message: string;
  stack: string;
  version: string;
  url: string;
  timestamp: string;
  userAgent: string;
}

function sanitizeStack(stack: string | undefined): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .slice(0, 10)
    .map((line) =>
      line
        .replace(/https?:\/\/[^/\s)]+\//g, '')
        .replace(/\b[A-Z]:\\(?:[^\\\s():]+\\)*/gi, '')
        .replace(/\/(?:[^/\s():]+\/)+(?=[^/\s():]+:\d)/g, ''),
    )
    .join('\n');
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/\b[\w.%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,63}\b/gi, '[EMAIL]')
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

function captureLocalError(error: Error): void {
  localErrors.push({
    name: error.name.slice(0, 80),
    message: sanitizeMessage(error.message),
    stack: sanitizeStack(error.stack),
    timestamp: new Date().toISOString(),
  });
  if (localErrors.length > MAX_LOCAL_ERRORS) localErrors.shift();
}

export function getLocalErrorReports(): LocalErrorReport[] {
  return localErrors.map((report) => ({ ...report }));
}

export function sendErrorReport(error: Error): void {
  captureLocalError(error);
  if (!ENDPOINT || reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount++;

  const report = buildReport(error);
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== 'function') return;

  fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(() => {
    // Telemetry failures must not cause secondary errors.
  });
}

export function initErrorReporter(): void {
  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) sendErrorReport(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) sendErrorReport(reason);
    else if (typeof reason === 'string') sendErrorReport(new Error(reason));
  });
}
