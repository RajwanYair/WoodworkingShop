import { describe, expect, it } from 'vitest';
import { getQueryValue, parseQueryString, serializeQueryRecord } from '../../src/utils/browser-compat';

describe('parseQueryString', () => {
  it('keeps attacker-controlled property names as data without changing the prototype', () => {
    const params = parseQueryString('?__proto__=value&constructor=custom&toString=custom');

    expect(Object.getPrototypeOf(params)).toBeNull();
    expect(Object.keys(params)).toEqual(['__proto__', 'constructor', 'toString']);
    expect(params['__proto__']).toBe('value');
    expect(params.constructor).toBe('custom');
    expect(params.toString).toBe('custom');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('round-trips dangerous property names and supports direct lookup', () => {
    const params = parseQueryString('?__proto__=value&constructor=custom');

    expect(serializeQueryRecord(params)).toBe('__proto__=value&constructor=custom');
    expect(getQueryValue('?__proto__=value', '__proto__')).toBe('value');
  });
});
