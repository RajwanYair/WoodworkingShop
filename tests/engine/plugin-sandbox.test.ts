import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyGcodePlugins,
  PLUGIN_CONTRACT,
  runWithSandbox,
  SandboxTimeoutError,
} from '../../src/engine/plugin';

beforeEach(() => {
  for (const p of [...getPlugins()]) {
    unregisterPlugin(p.id);
  }
});

describe('runWithSandbox — plugin sandbox', () => {
  it('returns the function result when no error is thrown', () => {
    const result = runWithSandbox(() => 42, 0);
    expect(result).toBe(42);
  });

  it('returns the fallback value when fn throws', () => {
    const result = runWithSandbox(() => {
      throw new Error('boom');
    }, 'fallback');
    expect(result).toBe('fallback');
  });

  it('calls onError with the thrown error', () => {
    const onError = vi.fn();
    runWithSandbox(
      () => {
        throw new TypeError('bad plugin');
      },
      null,
      { onError },
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(TypeError);
  });

  it('does not call onError when fn succeeds within time budget', () => {
    const onError = vi.fn();
    runWithSandbox(() => 'ok', '', { timeoutMs: 5000, onError });
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError with SandboxTimeoutError when fn is slow', () => {
    const onError = vi.fn();
    const realDateNow = Date.now.bind(Date);
    let callCount = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 100; // t0=0, elapsed=100
    });
    runWithSandbox(() => 'slow result', '', { timeoutMs: 50, onError });
    vi.spyOn(Date, 'now').mockRestore();
    void realDateNow; // suppress unused warning
    expect(onError).toHaveBeenCalledOnce();
    const err = onError.mock.calls[0][0];
    expect(err).toBeInstanceOf(SandboxTimeoutError);
    expect((err as SandboxTimeoutError).limitMs).toBe(50);
  });

  it('returns the computed value even when timeout is exceeded', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
    const result = runWithSandbox(() => 'computed', 'fallback', { timeoutMs: 10 });
    vi.spyOn(Date, 'now').mockRestore();
    expect(result).toBe('computed');
  });

  it('SandboxTimeoutError has correct message format', () => {
    const err = new SandboxTimeoutError(75, 50);
    expect(err.message).toMatch(/75 ms > 50 ms/);
    expect(err.name).toBe('SandboxTimeoutError');
    expect(err.elapsedMs).toBe(75);
    expect(err.limitMs).toBe(50);
  });

  it('uses 50 ms default timeout when timeoutMs is omitted', () => {
    const onError = vi.fn();
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(51);
    runWithSandbox(() => 'ok', '', { onError });
    vi.spyOn(Date, 'now').mockRestore();
    const err = onError.mock.calls[0]?.[0] as SandboxTimeoutError;
    expect(err?.limitMs).toBe(50);
  });

  it('works with object fallback types', () => {
    const fallback = { parts: [] };
    const result = runWithSandbox<{ parts: string[] }>(() => {
      throw new Error('fail');
    }, fallback);
    expect(result).toBe(fallback);
  });
});

// ── Phase 13 / Sprint 17 ─────────────────────────────────────────────────────
describe('applyGcodePlugins', () => {
  const RAW_GCODE = 'G21\nG90\nM3 S18000\nM2';

  it('returns raw G-code unchanged when no plugins are registered', () => {
    expect(applyGcodePlugins(RAW_GCODE)).toBe(RAW_GCODE);
  });

  it('applies onGcodeGenerated hook to transform output', () => {
    registerPlugin({
      id: 'gcode.mach3',
      name: 'Mach3 Post-Processor',
      version: '1.0.0',
      onGcodeGenerated: (raw) => raw.replace('M2', '%\nM30'),
    });
    const result = applyGcodePlugins(RAW_GCODE);
    expect(result).toContain('M30');
    expect(result).not.toContain('M2\n');
  });

  it('chains multiple onGcodeGenerated hooks in registration order', () => {
    const log: string[] = [];
    registerPlugin({
      id: 'gcode.first',
      name: 'First',
      version: '1.0.0',
      onGcodeGenerated: (raw) => {
        log.push('first');
        return raw + '\n; first';
      },
    });
    registerPlugin({
      id: 'gcode.second',
      name: 'Second',
      version: '1.0.0',
      onGcodeGenerated: (raw) => {
        log.push('second');
        return raw + '\n; second';
      },
    });
    const result = applyGcodePlugins(RAW_GCODE);
    expect(log).toEqual(['first', 'second']);
    expect(result).toContain('; first');
    expect(result).toContain('; second');
  });

  it('skips plugins that do not implement onGcodeGenerated', () => {
    registerPlugin({ id: 'gcode.noop', name: 'Noop', version: '1.0.0' });
    expect(applyGcodePlugins(RAW_GCODE)).toBe(RAW_GCODE);
  });

  it('onGcodeGenerated is listed in PLUGIN_CONTRACT as experimental', () => {
    const hook = PLUGIN_CONTRACT.hooks.find((h) => h.hookName === 'onGcodeGenerated');
    expect(hook).toBeDefined();
    expect(hook?.stability).toBe('experimental');
    expect(hook?.introducedIn).toBe('1.2.0');
  });
});
