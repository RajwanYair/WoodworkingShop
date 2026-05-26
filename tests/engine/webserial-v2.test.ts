import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStreamSession,
  startSession,
  pauseSession,
  resumeSession,
  cancelSession,
  markLinesSent,
  acknowledgeLines,
  markLineError,
  retryLine,
  getStreamProgress,
  getErrorLines,
  formatStreamReport,
  DEFAULT_MAX_RETRIES,
} from '../../src/engine/webserial-v2';
import type { StreamSession } from '../../src/engine/webserial-v2';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GCODE = ['G28', 'G0 X0 Y0', 'G1 X100 F800', '; comment', '', 'G0 Z5', 'M30'];

function fresh(): StreamSession {
  return createStreamSession(GCODE);
}

// ─── createStreamSession ──────────────────────────────────────────────────────

describe('createStreamSession', () => {
  it('creates idle session with correct line count', () => {
    const s = fresh();
    expect(s.state).toBe('idle');
    expect(s.lines).toHaveLength(GCODE.length);
  });

  it('marks blank and comment lines as skipped', () => {
    const s = fresh();
    expect(s.lines[3].state).toBe('skipped'); // '; comment'
    expect(s.lines[4].state).toBe('skipped'); // ''
  });

  it('marks real G-code lines as pending', () => {
    const s = fresh();
    expect(s.lines[0].state).toBe('pending');
    expect(s.lines[2].state).toBe('pending');
  });

  it('uses DEFAULT_MAX_RETRIES when not specified', () => {
    const s = fresh();
    expect(s.maxRetries).toBe(DEFAULT_MAX_RETRIES);
  });

  it('accepts custom maxRetries', () => {
    const s = createStreamSession(GCODE, 5);
    expect(s.maxRetries).toBe(5);
  });

  it('throws RangeError for empty lines array', () => {
    expect(() => createStreamSession([])).toThrow(RangeError);
  });

  it('assigns sequential indices', () => {
    const s = fresh();
    s.lines.forEach((l, i) => expect(l.index).toBe(i));
  });
});

// ─── startSession / pauseSession / resumeSession ──────────────────────────────

describe('session lifecycle', () => {
  it('startSession transitions idle → streaming', () => {
    const s = startSession(fresh());
    expect(s.state).toBe('streaming');
    expect(s.startedAt).toBeDefined();
  });

  it('pauseSession transitions streaming → paused', () => {
    const s = pauseSession(startSession(fresh()));
    expect(s.state).toBe('paused');
  });

  it('resumeSession transitions paused → streaming', () => {
    const s = resumeSession(pauseSession(startSession(fresh())));
    expect(s.state).toBe('streaming');
  });

  it('startSession throws from completed state', () => {
    const base = fresh();
    // Manually complete: acknowledge all pending lines
    const started = startSession(base);
    const pendingIdx = started.lines.filter((l) => l.state === 'pending').map((l) => l.index);
    const sent = markLinesSent(started, pendingIdx);
    const completed = acknowledgeLines(sent, pendingIdx);
    expect(completed.state).toBe('completed');
    expect(() => startSession(completed)).toThrow(RangeError);
  });

  it('pauseSession throws when not streaming', () => {
    expect(() => pauseSession(fresh())).toThrow(RangeError);
  });

  it('resumeSession throws when not paused', () => {
    expect(() => resumeSession(fresh())).toThrow(RangeError);
  });
});

// ─── cancelSession ────────────────────────────────────────────────────────────

describe('cancelSession', () => {
  it('marks session cancelled', () => {
    const s = cancelSession(startSession(fresh()));
    expect(s.state).toBe('cancelled');
    expect(s.completedAt).toBeDefined();
  });

  it('skips all pending and sent lines', () => {
    const started = startSession(fresh());
    const idx = started.lines.filter((l) => l.state === 'pending').map((l) => l.index);
    const sent = markLinesSent(started, [idx[0]]);
    const cancelled = cancelSession(sent);
    const remaining = cancelled.lines.filter((l) => l.state === 'pending' || l.state === 'sent');
    expect(remaining).toHaveLength(0);
  });

  it('throws when already cancelled', () => {
    expect(() => cancelSession(cancelSession(startSession(fresh())))).toThrow(RangeError);
  });
});

// ─── markLinesSent / acknowledgeLines ─────────────────────────────────────────

describe('markLinesSent', () => {
  it('transitions pending → sent and advances cursor', () => {
    const s = markLinesSent(startSession(fresh()), [0]);
    expect(s.lines[0].state).toBe('sent');
    expect(s.cursor).toBeGreaterThanOrEqual(1);
  });

  it('throws when session is not streaming', () => {
    expect(() => markLinesSent(fresh(), [0])).toThrow(RangeError);
  });

  it('throws on out-of-range index', () => {
    expect(() => markLinesSent(startSession(fresh()), [999])).toThrow(RangeError);
  });
});

describe('acknowledgeLines', () => {
  let started: StreamSession;
  beforeEach(() => {
    started = startSession(fresh());
  });

  it('transitions sent → acknowledged', () => {
    const sent = markLinesSent(started, [0]);
    const acked = acknowledgeLines(sent, [0]);
    expect(acked.lines[0].state).toBe('acknowledged');
    expect(acked.lines[0].acknowledgedAt).toBeDefined();
  });

  it('auto-completes session when all active lines acknowledged', () => {
    const pendingIdx = started.lines.filter((l) => l.state === 'pending').map((l) => l.index);
    const sent = markLinesSent(started, pendingIdx);
    const completed = acknowledgeLines(sent, pendingIdx);
    expect(completed.state).toBe('completed');
    expect(completed.completedAt).toBeDefined();
  });

  it('throws on out-of-range index', () => {
    expect(() => acknowledgeLines(started, [999])).toThrow(RangeError);
  });
});

// ─── markLineError / retryLine ────────────────────────────────────────────────

describe('markLineError', () => {
  it('increments retries and reverts to pending if under maxRetries', () => {
    const s = markLineError(startSession(fresh()), 0, 'ALARM:1');
    expect(s.lines[0].retries).toBe(1);
    expect(s.lines[0].state).toBe('pending');
    expect(s.lines[0].errorMessage).toBe('ALARM:1');
  });

  it('marks line as error and session as error when maxRetries exhausted', () => {
    let s = startSession(fresh());
    for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
      s = markLineError(s, 0, 'ALARM:1');
    }
    expect(s.lines[0].state).toBe('error');
    expect(s.state).toBe('error');
  });

  it('throws on out-of-range index', () => {
    expect(() => markLineError(startSession(fresh()), 999, 'err')).toThrow(RangeError);
  });
});

describe('retryLine', () => {
  it('resets an errored line to pending and session to paused', () => {
    let s = startSession(fresh());
    for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
      s = markLineError(s, 0, 'fail');
    }
    expect(s.lines[0].state).toBe('error');
    const retried = retryLine(s, 0);
    expect(retried.lines[0].state).toBe('pending');
    expect(retried.lines[0].retries).toBe(0);
    expect(retried.state).toBe('paused');
  });

  it('throws when line is not in error state', () => {
    expect(() => retryLine(startSession(fresh()), 0)).toThrow(RangeError);
  });

  it('throws when session is in idle state', () => {
    expect(() => retryLine(fresh(), 0)).toThrow(RangeError);
  });
});

// ─── getStreamProgress ────────────────────────────────────────────────────────

describe('getStreamProgress', () => {
  it('returns 0% for fresh session', () => {
    const p = getStreamProgress(fresh());
    expect(p.percentComplete).toBe(0);
    expect(p.pending).toBeGreaterThan(0);
    expect(p.acknowledged).toBe(0);
  });

  it('counts skipped lines correctly', () => {
    const p = getStreamProgress(fresh());
    expect(p.skipped).toBe(2); // blank + comment
  });

  it('returns 100% when all active lines acknowledged', () => {
    let s = startSession(fresh());
    const pendingIdx = s.lines.filter((l) => l.state === 'pending').map((l) => l.index);
    s = markLinesSent(s, pendingIdx);
    s = acknowledgeLines(s, pendingIdx);
    const p = getStreamProgress(s);
    expect(p.percentComplete).toBe(100);
  });

  it('estimatedSecondsLeft is null before streaming starts', () => {
    const p = getStreamProgress(fresh());
    expect(p.estimatedSecondsLeft).toBeNull();
  });
});

// ─── getErrorLines ────────────────────────────────────────────────────────────

describe('getErrorLines', () => {
  it('returns empty array when no errors', () => {
    expect(getErrorLines(fresh())).toHaveLength(0);
  });

  it('returns error records for failed lines', () => {
    let s = startSession(fresh());
    for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
      s = markLineError(s, 0, 'ALARM:2');
    }
    const errs = getErrorLines(s);
    expect(errs).toHaveLength(1);
    expect(errs[0].lineIndex).toBe(0);
    expect(errs[0].errorMessage).toBe('ALARM:2');
  });
});

// ─── formatStreamReport ───────────────────────────────────────────────────────

describe('formatStreamReport', () => {
  it('contains session id and state', () => {
    const s = fresh();
    const report = formatStreamReport(s);
    expect(report).toContain(s.id);
    expect(report).toContain('idle');
  });

  it('includes error lines when present', () => {
    let s = startSession(fresh());
    for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
      s = markLineError(s, 0, 'GRBL ERROR');
    }
    const report = formatStreamReport(s);
    expect(report).toContain('GRBL ERROR');
  });

  it('returns a non-empty string', () => {
    expect(formatStreamReport(fresh()).length).toBeGreaterThan(0);
  });
});
