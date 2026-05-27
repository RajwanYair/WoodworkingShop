import { describe, it, expect } from 'vitest';
import {
  validateTemplate,
  instantiateTemplate,
  getDefaultValues,
  getParamDependencies,
  evaluateExpression,
  MAX_PARAMS,
  MAX_EXPRESSION_LENGTH,
} from '../../src/engine/parametric-template';
import type { ParametricTemplate, ParamValues } from '../../src/engine/parametric-template';

function makeTemplate(overrides: Partial<ParametricTemplate> = {}): ParametricTemplate {
  return {
    id: 'test-template',
    name: 'Test Cabinet',
    description: 'A test parametric cabinet template.',
    category: 'base',
    version: '1.0.0',
    params: [
      {
        id: 'width',
        label: 'Width',
        type: 'number',
        defaultValue: 600,
        constraint: { min: 300, max: 1200, step: 50 },
        unit: 'mm',
      },
      {
        id: 'height',
        label: 'Height',
        type: 'number',
        defaultValue: 720,
        constraint: { min: 400, max: 900, step: 10 },
        unit: 'mm',
      },
      {
        id: 'hasBack',
        label: 'Include Back Panel',
        type: 'boolean',
        defaultValue: true,
      },
      {
        id: 'doorStyle',
        label: 'Door Style',
        type: 'choice',
        options: ['shaker', 'slab', 'raised-panel'],
        defaultValue: 'shaker',
      },
    ],
    rules: [
      {
        id: 'rule-slab-no-back',
        when: 'doorStyle',
        equals: 'slab',
        then: { hasBack: false },
      },
    ],
    computed: [
      {
        id: 'internalWidth',
        expression: 'width - 36',
        label: 'Internal Width',
        unit: 'mm',
      },
      {
        id: 'shelfCount',
        expression: 'Math.floor(height / 300)',
        label: 'Shelf Count',
        unit: '',
      },
    ],
    ...overrides,
  };
}

describe('parametric-template', () => {
  describe('validateTemplate', () => {
    it('accepts a valid template', () => {
      const result = validateTemplate(makeTemplate());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty template ID', () => {
      const result = validateTemplate(makeTemplate({ id: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors[0].target).toBe('id');
    });

    it('rejects empty template name', () => {
      const result = validateTemplate(makeTemplate({ name: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors[0].target).toBe('name');
    });

    it('rejects duplicate parameter IDs', () => {
      const result = validateTemplate(
        makeTemplate({
          params: [
            {
              id: 'dup',
              label: 'A',
              type: 'number',
              defaultValue: 10,
              constraint: { min: 0, max: 100, step: 1 },
              unit: 'mm',
            },
            {
              id: 'dup',
              label: 'B',
              type: 'number',
              defaultValue: 20,
              constraint: { min: 0, max: 100, step: 1 },
              unit: 'mm',
            },
          ],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });

    it('rejects number param with min > max', () => {
      const result = validateTemplate(
        makeTemplate({
          params: [
            {
              id: 'bad',
              label: 'Bad',
              type: 'number',
              defaultValue: 50,
              constraint: { min: 100, max: 10, step: 1 },
              unit: 'mm',
            },
          ],
          rules: [],
          computed: [],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('min'))).toBe(true);
    });

    it('rejects number param with step <= 0', () => {
      const result = validateTemplate(
        makeTemplate({
          params: [
            {
              id: 'bad',
              label: 'Bad',
              type: 'number',
              defaultValue: 50,
              constraint: { min: 0, max: 100, step: 0 },
              unit: 'mm',
            },
          ],
          rules: [],
          computed: [],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('step'))).toBe(true);
    });

    it('rejects choice param with empty options', () => {
      const result = validateTemplate(
        makeTemplate({
          params: [{ id: 'empty', label: 'Empty', type: 'choice', options: [], defaultValue: '' }],
          rules: [],
          computed: [],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('at least one option'))).toBe(true);
    });

    it('rejects choice param with default not in options', () => {
      const result = validateTemplate(
        makeTemplate({
          params: [{ id: 'ch', label: 'Ch', type: 'choice', options: ['a', 'b'], defaultValue: 'z' }],
          rules: [],
          computed: [],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('not in options'))).toBe(true);
    });

    it('rejects rule referencing unknown parameter', () => {
      const result = validateTemplate(
        makeTemplate({
          rules: [{ id: 'r1', when: 'unknown', equals: true, then: {} }],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('unknown parameter'))).toBe(true);
    });

    it('rejects computed field with expression too long', () => {
      const result = validateTemplate(
        makeTemplate({
          computed: [{ id: 'long', expression: 'width + '.repeat(MAX_EXPRESSION_LENGTH), label: 'L', unit: '' }],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('exceeds'))).toBe(true);
    });

    it('rejects too many parameters', () => {
      const params = Array.from({ length: MAX_PARAMS + 1 }, (_, i) => ({
        id: `p${i}`,
        label: `P${i}`,
        type: 'number' as const,
        defaultValue: 10,
        constraint: { min: 0, max: 100, step: 1 },
        unit: 'mm',
      }));
      const result = validateTemplate(makeTemplate({ params, rules: [], computed: [] }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Too many parameters'))).toBe(true);
    });
  });

  describe('instantiateTemplate', () => {
    it('applies default values when no overrides given', () => {
      const instance = instantiateTemplate(makeTemplate());
      expect(instance.params.width).toBe(600);
      expect(instance.params.height).toBe(720);
      expect(instance.params.hasBack).toBe(true);
      expect(instance.params.doorStyle).toBe('shaker');
    });

    it('applies overrides to parameters', () => {
      const instance = instantiateTemplate(makeTemplate(), { width: 900, height: 800 });
      expect(instance.params.width).toBe(900);
      expect(instance.params.height).toBe(800);
    });

    it('clamps numeric values to min/max', () => {
      const instance = instantiateTemplate(makeTemplate(), { width: 2000 });
      expect(instance.params.width).toBe(1200); // max
      expect(instance.warnings.some((w) => w.includes('clamped'))).toBe(true);
    });

    it('snaps numeric values to step', () => {
      const instance = instantiateTemplate(makeTemplate(), { width: 625 });
      // 625 rounded to step 50 → 650
      expect(instance.params.width).toBe(650);
    });

    it('rejects invalid choice values', () => {
      const instance = instantiateTemplate(makeTemplate(), { doorStyle: 'unknown' });
      expect(instance.params.doorStyle).toBe('shaker'); // default
      expect(instance.warnings.some((w) => w.includes('not in options'))).toBe(true);
    });

    it('applies conditional rules', () => {
      const instance = instantiateTemplate(makeTemplate(), { doorStyle: 'slab' });
      expect(instance.params.hasBack).toBe(false); // rule triggered
    });

    it('computes derived fields', () => {
      const instance = instantiateTemplate(makeTemplate(), { width: 600, height: 720 });
      expect(instance.computed.internalWidth).toBe(564); // 600 - 36
      expect(instance.computed.shelfCount).toBe(2); // floor(720 / 300)
    });

    it('warns on unknown override parameters', () => {
      const instance = instantiateTemplate(makeTemplate(), { unknownParam: 42 });
      expect(instance.warnings.some((w) => w.includes('Unknown parameter'))).toBe(true);
    });

    it('throws on invalid template', () => {
      expect(() => instantiateTemplate(makeTemplate({ id: '' }))).toThrow('invalid');
    });
  });

  describe('getDefaultValues', () => {
    it('returns default values for all parameters', () => {
      const defaults = getDefaultValues(makeTemplate());
      expect(defaults).toEqual({
        width: 600,
        height: 720,
        hasBack: true,
        doorStyle: 'shaker',
      });
    });
  });

  describe('getParamDependencies', () => {
    it('returns dependency map from rules', () => {
      const deps = getParamDependencies(makeTemplate());
      expect(deps.get('doorStyle')).toContain('hasBack');
      expect(deps.get('width')).toEqual([]);
    });
  });

  describe('evaluateExpression', () => {
    const params: ParamValues = { width: 600, height: 720, depth: 560 };

    it.each([
      { expr: 'width + 100', expected: 700 },
      { expr: 'width - 36', expected: 564 },
      { expr: 'width * 2', expected: 1200 },
      { expr: 'width / 3', expected: 200 },
      { expr: '(width + height) / 2', expected: 660 },
      { expr: 'Math.floor(height / 300)', expected: 2 },
      { expr: 'Math.ceil(height / 400)', expected: 2 },
      { expr: 'Math.round(height / 250)', expected: 3 },
      { expr: 'Math.abs(width - 1000)', expected: 400 },
      { expr: '-width + 1000', expected: 400 },
    ])('evaluates "$expr" = $expected', ({ expr, expected }) => {
      expect(evaluateExpression(expr, params)).toBe(expected);
    });
  });
});
