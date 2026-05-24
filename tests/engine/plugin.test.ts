import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  applyPartsPlugins,
  applyConfigPlugins,
  applyGcodePlugins,
  getPluginContract,
  PLUGIN_CONTRACT,
  runWithSandbox,
  SandboxTimeoutError,
  type CabinetPlannerPlugin,
} from '../../src/engine/plugin';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { Part } from '../../src/engine/types';

const mockPart: Part = {
  id: 'P01',
  name: { en: 'Side Panel', he: 'לוח צד' },
  qty: 2,
  material: 'melamine-18',
  thickness: 18,
  length: 720,
  width: 580,
  edgeBanding: { en: 'none', he: 'אין' },
};

beforeEach(() => {
  // Reset the registry before each test
  for (const p of [...getPlugins()]) {
    unregisterPlugin(p.id);
  }
});

describe('Plugin registry', () => {
  it('starts empty', () => {
    expect(getPlugins().length).toBe(0);
  });

  it('registers a plugin', () => {
    const plugin: CabinetPlannerPlugin = { id: 'test.plugin', name: 'Test', version: '1.0.0' };
    registerPlugin(plugin);
    expect(getPlugins()).toHaveLength(1);
    expect(getPlugins()[0].id).toBe('test.plugin');
  });

  it('returns an error result when registering duplicate id', () => {
    const plugin: CabinetPlannerPlugin = { id: 'dupe', name: 'Dupe', version: '1.0.0' };
    registerPlugin(plugin);
    const result = registerPlugin({ ...plugin });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch('already registered');
  });

  it('unregisters a plugin', () => {
    registerPlugin({ id: 'removable', name: 'R', version: '1.0.0' });
    expect(getPlugins()).toHaveLength(1);
    unregisterPlugin('removable');
    expect(getPlugins()).toHaveLength(0);
  });

  it('unregister is a no-op for unknown id', () => {
    expect(() => unregisterPlugin('ghost')).not.toThrow();
  });

  it('getPlugins returns the registered plugin list', () => {
    registerPlugin({ id: 'list-test', name: 'L', version: '1.0.0' });
    const snap = getPlugins();
    expect(snap.some((p) => p.id === 'list-test')).toBe(true);
    // Cleanup
    unregisterPlugin('list-test');
  });
});

describe('applyPartsPlugins', () => {
  it('returns parts unchanged when no plugins registered', () => {
    const result = applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(result).toEqual([mockPart]);
  });

  it('applies onPartsGenerated hook', () => {
    const extraPart: Part = { ...mockPart, id: 'P99', name: { en: 'Extra', he: 'נוסף' } };
    registerPlugin({
      id: 'parts.adder',
      name: 'Parts Adder',
      version: '1.0.0',
      onPartsGenerated: (parts) => [...parts, extraPart],
    });
    const result = applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('P99');
  });

  it('chains multiple onPartsGenerated hooks in order', () => {
    const log: string[] = [];
    registerPlugin({
      id: 'first',
      name: 'First',
      version: '1.0.0',
      onPartsGenerated: (parts) => {
        log.push('first');
        return parts;
      },
    });
    registerPlugin({
      id: 'second',
      name: 'Second',
      version: '1.0.0',
      onPartsGenerated: (parts) => {
        log.push('second');
        return parts;
      },
    });
    applyPartsPlugins([mockPart], DEFAULT_CONFIG);
    expect(log).toEqual(['first', 'second']);
  });
});

describe('applyConfigPlugins', () => {
  it('returns config unchanged when no plugins registered', () => {
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result).toBe(DEFAULT_CONFIG);
  });

  it('applies onConfigChange hook', () => {
    registerPlugin({
      id: 'config.forcer',
      name: 'Config Forcer',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, width: 999 }),
    });
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result.width).toBe(999);
  });

  it('chains multiple onConfigChange hooks', () => {
    registerPlugin({
      id: 'cfg.a',
      name: 'A',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, width: 100 }),
    });
    registerPlugin({
      id: 'cfg.b',
      name: 'B',
      version: '1.0.0',
      onConfigChange: (cfg) => ({ ...cfg, height: 200 }),
    });
    const result = applyConfigPlugins(DEFAULT_CONFIG);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });
});

describe('PluginContract', () => {
  it('PLUGIN_CONTRACT has apiVersion string', () => {
    expect(typeof PLUGIN_CONTRACT.apiVersion).toBe('string');
    expect(PLUGIN_CONTRACT.apiVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('PLUGIN_CONTRACT.stability is a valid tier', () => {
    expect(['stable', 'experimental', 'deprecated']).toContain(PLUGIN_CONTRACT.stability);
  });

  it('PLUGIN_CONTRACT.hooks is a non-empty array', () => {
    expect(Array.isArray(PLUGIN_CONTRACT.hooks)).toBe(true);
    expect(PLUGIN_CONTRACT.hooks.length).toBeGreaterThan(0);
  });

  it('every hook contract has a hookName, stability, introducedIn, and description', () => {
    for (const hook of PLUGIN_CONTRACT.hooks) {
      expect(typeof hook.hookName).toBe('string');
      expect(['stable', 'experimental', 'deprecated']).toContain(hook.stability);
      expect(typeof hook.introducedIn).toBe('string');
      expect(typeof hook.description).toBe('string');
      expect(hook.description.length).toBeGreaterThan(10);
    }
  });

  it('getPluginContract() returns the same object as PLUGIN_CONTRACT', () => {
    expect(getPluginContract()).toBe(PLUGIN_CONTRACT);
  });

  it('onPartsGenerated hook is listed as stable', () => {
    const hook = PLUGIN_CONTRACT.hooks.find((h) => h.hookName === 'onPartsGenerated');
    expect(hook).toBeDefined();
    expect(hook?.stability).toBe('stable');
  });

  it('onConfigChange hook is listed as stable', () => {
    const hook = PLUGIN_CONTRACT.hooks.find((h) => h.hookName === 'onConfigChange');
    expect(hook).toBeDefined();
    expect(hook?.stability).toBe('stable');
  });
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
    // Override Date.now to simulate a 100 ms elapsed time
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
      onGcodeGenerated: (raw) => { log.push('first'); return raw + '\n; first'; },
    });
    registerPlugin({
      id: 'gcode.second',
      name: 'Second',
      version: '1.0.0',
      onGcodeGenerated: (raw) => { log.push('second'); return raw + '\n; second'; },
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
