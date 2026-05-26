/**
 * WebSerial CNC streaming engine v2.
 *
 * Real-time G-code streaming with pause/resume, error recovery,
 * line acknowledgement tracking, and progress reporting.
 *
 * Pure TypeScript. No DOM, no React, no side effects.
 * (WebSerial I/O is intentionally NOT included — this module models
 *  the session state machine and is fully testable without hardware.)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** State of an individual G-code line in a stream session. */
export type StreamLineState = 'pending' | 'sent' | 'acknowledged' | 'error' | 'skipped';

/** A single G-code line tracked within a stream session. */
export interface StreamLine {
  index: number;
  raw: string;
  state: StreamLineState;
  retries: number;
  errorMessage?: string;
  sentAt?: number;
  acknowledgedAt?: number;
}

/** Overall state of a streaming session. */
export type StreamSessionState = 'idle' | 'streaming' | 'paused' | 'completed' | 'error' | 'cancelled';

/** A full streaming session — owns all line records and session metadata. */
export interface StreamSession {
  id: string;
  state: StreamSessionState;
  lines: StreamLine[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  maxRetries: number;
  /** Index of the next line to send (0-based). */
  cursor: number;
}

/** Snapshot of streaming progress for UI display. */
export interface StreamProgress {
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  errors: number;
  skipped: number;
  percentComplete: number;
  linesRemaining: number;
  estimatedSecondsLeft: number | null;
}

/** Structured error record for a failed stream line. */
export interface StreamError {
  lineIndex: number;
  raw: string;
  retries: number;
  errorMessage: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_MAX_RETRIES = 3;
export const SESSION_ID_PREFIX = 'cnc-stream';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _sessionCounter = 0;

function makeSessionId(): string {
  return `${SESSION_ID_PREFIX}-${++_sessionCounter}-${Date.now()}`;
}

function cloneLine(line: StreamLine): StreamLine {
  return { ...line };
}

function cloneSession(session: StreamSession): StreamSession {
  return { ...session, lines: session.lines.map(cloneLine) };
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

/**
 * Create a new idle stream session from an array of raw G-code lines.
 * Blank lines and comments (`;` prefix) are included as `skipped`.
 */
export function createStreamSession(rawLines: string[], maxRetries: number = DEFAULT_MAX_RETRIES): StreamSession {
  if (rawLines.length === 0) {
    throw new RangeError('createStreamSession: rawLines must not be empty');
  }

  const lines: StreamLine[] = rawLines.map((raw, index) => {
    const trimmed = raw.trim();
    const isBlank = trimmed.length === 0;
    const isComment = trimmed.startsWith(';');
    return {
      index,
      raw,
      state: isBlank || isComment ? 'skipped' : 'pending',
      retries: 0,
    };
  });

  return {
    id: makeSessionId(),
    state: 'idle',
    lines,
    createdAt: Date.now(),
    maxRetries,
    cursor: 0,
  };
}

/**
 * Transition session from idle/paused to streaming.
 * Returns a new session object (immutable update).
 */
export function startSession(session: StreamSession): StreamSession {
  if (session.state !== 'idle' && session.state !== 'paused') {
    throw new RangeError(`startSession: cannot start a session in state "${session.state}"`);
  }
  const next = cloneSession(session);
  next.state = 'streaming';
  if (session.state === 'idle') {
    next.startedAt = Date.now();
  }
  return next;
}

/**
 * Pause an active streaming session.
 * Returns a new session object.
 */
export function pauseSession(session: StreamSession): StreamSession {
  if (session.state !== 'streaming') {
    throw new RangeError(`pauseSession: cannot pause a session in state "${session.state}"`);
  }
  const next = cloneSession(session);
  next.state = 'paused';
  return next;
}

/**
 * Resume a paused session (alias for startSession from paused state).
 */
export function resumeSession(session: StreamSession): StreamSession {
  if (session.state !== 'paused') {
    throw new RangeError(`resumeSession: cannot resume a session in state "${session.state}"`);
  }
  return startSession(session);
}

/**
 * Cancel a session. Marks all pending/sent lines as skipped.
 */
export function cancelSession(session: StreamSession): StreamSession {
  if (session.state === 'completed' || session.state === 'cancelled') {
    throw new RangeError(`cancelSession: cannot cancel a session in state "${session.state}"`);
  }
  const next = cloneSession(session);
  next.state = 'cancelled';
  next.completedAt = Date.now();
  for (const line of next.lines) {
    if (line.state === 'pending' || line.state === 'sent') {
      line.state = 'skipped';
    }
  }
  return next;
}

// ─── Line state transitions ───────────────────────────────────────────────────

/**
 * Mark a batch of lines as sent (by their indices).
 * Advances the cursor to the highest sent index + 1.
 */
export function markLinesSent(session: StreamSession, indices: number[]): StreamSession {
  if (session.state !== 'streaming') {
    throw new RangeError(`markLinesSent: session must be in "streaming" state, got "${session.state}"`);
  }
  const next = cloneSession(session);
  const now = Date.now();
  for (const idx of indices) {
    const line = next.lines[idx];
    if (!line) {
      throw new RangeError(`markLinesSent: index ${idx} out of range`);
    }
    if (line.state === 'pending') {
      line.state = 'sent';
      line.sentAt = now;
    }
  }
  const maxSent = Math.max(...indices);
  next.cursor = Math.max(next.cursor, maxSent + 1);
  return next;
}

/**
 * Mark a batch of lines as acknowledged (CNC controller confirmed execution).
 * Checks whether all non-skipped lines are done → auto-completes session.
 */
export function acknowledgeLines(session: StreamSession, indices: number[]): StreamSession {
  const next = cloneSession(session);
  const now = Date.now();
  for (const idx of indices) {
    const line = next.lines[idx];
    if (!line) {
      throw new RangeError(`acknowledgeLines: index ${idx} out of range`);
    }
    if (line.state === 'sent') {
      line.state = 'acknowledged';
      line.acknowledgedAt = now;
    }
  }
  // Auto-complete when all active lines are acknowledged or errored/skipped
  const allDone = next.lines.every((l) => l.state === 'acknowledged' || l.state === 'error' || l.state === 'skipped');
  if (allDone && next.state === 'streaming') {
    next.state = 'completed';
    next.completedAt = Date.now();
  }
  return next;
}

/**
 * Mark a line as errored. Increments retry count.
 * If retries exceed maxRetries, marks as error; otherwise reverts to pending.
 */
export function markLineError(session: StreamSession, lineIndex: number, errorMessage: string): StreamSession {
  const next = cloneSession(session);
  const line = next.lines[lineIndex];
  if (!line) {
    throw new RangeError(`markLineError: index ${lineIndex} out of range`);
  }
  line.retries += 1;
  line.errorMessage = errorMessage;
  if (line.retries >= next.maxRetries) {
    line.state = 'error';
    // Transition session to error state if no more retries possible
    if (next.state === 'streaming') {
      next.state = 'error';
    }
  } else {
    line.state = 'pending'; // eligible for retry
  }
  return next;
}

/**
 * Force-retry an errored line (reset to pending regardless of retry count).
 * Session must be streaming or paused.
 */
export function retryLine(session: StreamSession, lineIndex: number): StreamSession {
  if (session.state !== 'streaming' && session.state !== 'paused' && session.state !== 'error') {
    throw new RangeError(`retryLine: cannot retry in session state "${session.state}"`);
  }
  const next = cloneSession(session);
  const line = next.lines[lineIndex];
  if (!line) {
    throw new RangeError(`retryLine: index ${lineIndex} out of range`);
  }
  if (line.state !== 'error') {
    throw new RangeError(`retryLine: line ${lineIndex} is not in "error" state`);
  }
  line.state = 'pending';
  line.retries = 0;
  line.errorMessage = undefined;
  // Restore session to paused so operator can restart deliberately
  if (next.state === 'error') {
    next.state = 'paused';
  }
  return next;
}

// ─── Progress & reporting ─────────────────────────────────────────────────────

/**
 * Compute a progress snapshot for a session.
 */
export function getStreamProgress(session: StreamSession): StreamProgress {
  let pending = 0;
  let sent = 0;
  let acknowledged = 0;
  let errors = 0;
  let skipped = 0;

  for (const line of session.lines) {
    switch (line.state) {
      case 'pending':
        pending++;
        break;
      case 'sent':
        sent++;
        break;
      case 'acknowledged':
        acknowledged++;
        break;
      case 'error':
        errors++;
        break;
      case 'skipped':
        skipped++;
        break;
    }
  }

  const total = session.lines.length;
  const active = total - skipped;
  const done = acknowledged + errors;
  const percentComplete = active === 0 ? 100 : Math.round((done / active) * 100);
  const linesRemaining = pending + sent;

  let estimatedSecondsLeft: number | null = null;
  if (session.startedAt && done > 0) {
    const elapsedMs = Date.now() - session.startedAt;
    const msPerLine = elapsedMs / done;
    estimatedSecondsLeft = Math.round((linesRemaining * msPerLine) / 1000);
  }

  return {
    total,
    pending,
    sent,
    acknowledged,
    errors,
    skipped,
    percentComplete,
    linesRemaining,
    estimatedSecondsLeft,
  };
}

/**
 * Return all lines currently in error state.
 */
export function getErrorLines(session: StreamSession): StreamError[] {
  return session.lines
    .filter((l) => l.state === 'error')
    .map((l) => ({
      lineIndex: l.index,
      raw: l.raw,
      retries: l.retries,
      errorMessage: l.errorMessage ?? 'Unknown error',
    }));
}

/**
 * Format a human-readable session report.
 */
export function formatStreamReport(session: StreamSession): string {
  const p = getStreamProgress(session);
  const errors = getErrorLines(session);
  const lines: string[] = [
    `CNC Stream Report — Session: ${session.id}`,
    `State: ${session.state}`,
    `Progress: ${p.percentComplete}% (${p.acknowledged}/${p.total - p.skipped} lines)`,
    `Pending: ${p.pending} | Sent: ${p.sent} | Ack: ${p.acknowledged} | Error: ${p.errors} | Skipped: ${p.skipped}`,
  ];
  if (p.estimatedSecondsLeft !== null) {
    lines.push(`ETA: ~${p.estimatedSecondsLeft}s remaining`);
  }
  if (errors.length > 0) {
    lines.push(`Errors (${errors.length}):`);
    for (const e of errors) {
      lines.push(`  Line ${e.lineIndex}: [${e.retries} retries] ${e.errorMessage}`);
    }
  }
  return lines.join('\n');
}
