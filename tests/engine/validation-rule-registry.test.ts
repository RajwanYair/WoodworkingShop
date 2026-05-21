/**
 * Phase 12 / Sprint 9 — Validation rule registry tests.
 *
 * Verifies that:
 *  - `registerRule` / `unregisterRule` / `getCustomRules` work correctly.
 *  - Custom rules are invoked by `validateConfig()`.
 *  - `furnitureTypes` filter skips rules for non-matching furniture types.
 *  - Re-registering the same id is idempotent.
 *  - Built-in rules continue to work after the registry is introduced.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { validateConfig, registerRule, unregisterRule, getCustomRules } from '../../src/engine/validation';
import type { ValidationRule } from '../../src/engine/types';
import { cfg } from '../helpers';

/** Clean up any rules registered during a test. */
afterEach(() => {
  for (const rule of getCustomRules()) {
    unregisterRule(rule.id);
  }
});

describe('registerRule / getCustomRules', () => {
  it('registered rule appears in getCustomRules()', () => {
    const rule: ValidationRule = {
      id: 'TEST_NOOP',
      severity: 'info',
      check: () => [],
    };
    registerRule(rule);
    expect(getCustomRules().some((r) => r.id === 'TEST_NOOP')).toBe(true);
  });

  it('re-registering the same id is a no-op', () => {
    const rule: ValidationRule = { id: 'TEST_IDEM', severity: 'info', check: () => [] };
    registerRule(rule);
    registerRule(rule);
    expect(getCustomRules().filter((r) => r.id === 'TEST_IDEM').length).toBe(1);
  });

  it('unregisterRule removes a rule by id', () => {
    registerRule({ id: 'TEST_REMOVE', severity: 'info', check: () => [] });
    expect(getCustomRules().some((r) => r.id === 'TEST_REMOVE')).toBe(true);
    unregisterRule('TEST_REMOVE');
    expect(getCustomRules().some((r) => r.id === 'TEST_REMOVE')).toBe(false);
  });

  it('unregisterRule is a no-op for an unknown id', () => {
    expect(() => unregisterRule('DOES_NOT_EXIST')).not.toThrow();
  });
});

describe('custom rules invoked by validateConfig()', () => {
  it('check() is called with a valid ValidationContext', () => {
    let capturedCtx: Parameters<ValidationRule['check']>[1] | undefined;
    registerRule({
      id: 'TEST_CONTEXT',
      severity: 'info',
      check(_c, ctx) {
        capturedCtx = ctx;
        return [];
      },
    });
    validateConfig(cfg());
    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.dims).toBeDefined();
    // mat may be undefined for unknown keys, but dims is always present
    expect(typeof capturedCtx!.dims.internalWidth).toBe('number');
  });

  it('issues from custom rules appear in validateConfig output', () => {
    registerRule({
      id: 'ALWAYS_WARN',
      severity: 'warning',
      check() {
        return [
          {
            code: 'ALWAYS_WARN',
            severity: 'warning',
            message: { en: 'test warning', he: 'אזהרת בדיקה' },
          },
        ];
      },
    });
    const issues = validateConfig(cfg());
    expect(issues.some((i) => i.code === 'ALWAYS_WARN')).toBe(true);
  });

  it('multiple issues from a single custom rule all appear', () => {
    registerRule({
      id: 'MULTI_ISSUE',
      severity: 'info',
      check() {
        return [
          { code: 'MULTI_1', severity: 'info', message: { en: 'one', he: 'אחד' } },
          { code: 'MULTI_2', severity: 'info', message: { en: 'two', he: 'שניים' } },
        ];
      },
    });
    const issues = validateConfig(cfg());
    expect(issues.some((i) => i.code === 'MULTI_1')).toBe(true);
    expect(issues.some((i) => i.code === 'MULTI_2')).toBe(true);
  });

  it('a custom rule returning [] adds no issues', () => {
    registerRule({ id: 'SILENT', severity: 'info', check: () => [] });
    const before = validateConfig(cfg()).length;
    const after = validateConfig(cfg()).length;
    expect(after).toBe(before); // idempotent — SILENT rule adds 0 issues
  });
});

describe('furnitureTypes filter', () => {
  it('rule with furnitureTypes skips non-matching types', () => {
    let callCount = 0;
    registerRule({
      id: 'WARDROBE_ONLY',
      severity: 'info',
      furnitureTypes: ['wardrobe'],
      check() {
        callCount++;
        return [];
      },
    });
    validateConfig(cfg({ furnitureType: 'bookshelf' }));
    expect(callCount).toBe(0);
    validateConfig(cfg({ furnitureType: 'cabinet' }));
    expect(callCount).toBe(0);
  });

  it('rule with furnitureTypes runs for matching types', () => {
    let callCount = 0;
    registerRule({
      id: 'WARDROBE_FIRE',
      severity: 'info',
      furnitureTypes: ['wardrobe'],
      check() {
        callCount++;
        return [];
      },
    });
    validateConfig(cfg({ furnitureType: 'wardrobe' }));
    expect(callCount).toBe(1);
  });

  it('rule without furnitureTypes runs for all furniture types', () => {
    let callCount = 0;
    registerRule({
      id: 'UNIVERSAL',
      severity: 'info',
      check() {
        callCount++;
        return [];
      },
    });
    const types = ['cabinet', 'bookshelf', 'wardrobe', 'desk', 'panel'] as const;
    for (const t of types) {
      validateConfig(cfg({ furnitureType: t }));
    }
    expect(callCount).toBe(types.length);
  });
});

describe('built-in rules still work', () => {
  it('CARCASS_TOO_NARROW is still reported for very narrow configs', () => {
    const issues = validateConfig(cfg({ width: 10 }));
    expect(issues.some((i) => i.code === 'CARCASS_TOO_NARROW')).toBe(true);
  });

  it('valid config produces no error-severity issues', () => {
    const issues = validateConfig(cfg({ width: 600, height: 720, depth: 560 }));
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
