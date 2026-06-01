import { describe, expect, it } from 'vitest';
import {
  assertAtLeast,
  assertBetweenExclusive,
  assertBetweenInclusive,
  assertFiniteNumber,
  assertGreaterThan,
} from '../../src/engine/invariant';

describe('engine invariants', () => {
  it.each([{ value: 0 }, { value: 1.25 }, { value: -10 }])(
    'assertFiniteNumber returns value for finite input: $value',
    ({ value }) => {
      expect(assertFiniteNumber('fn', 'field', value)).toBe(value);
    },
  );

  it.each([{ value: Number.NaN }, { value: Number.POSITIVE_INFINITY }, { value: Number.NEGATIVE_INFINITY }])(
    'assertFiniteNumber throws RangeError for non-finite input: $value',
    ({ value }) => {
      expect(() => assertFiniteNumber('fn', 'field', value)).toThrow(RangeError);
    },
  );

  it.each([
    { value: 1, minExclusive: 0 },
    { value: 0.001, minExclusive: 0 },
  ])('assertGreaterThan validates strict minimum for value=$value min=$minExclusive', ({ value, minExclusive }) => {
    expect(assertGreaterThan('fn', 'field', value, minExclusive)).toBe(value);
  });

  it.each([
    { value: 0, minExclusive: 0 },
    { value: -1, minExclusive: 0 },
  ])('assertGreaterThan throws when value=$value min=$minExclusive', ({ value, minExclusive }) => {
    expect(() => assertGreaterThan('fn', 'field', value, minExclusive)).toThrow(RangeError);
  });

  it.each([
    { value: 0, minInclusive: 0 },
    { value: 10, minInclusive: 0 },
  ])('assertAtLeast validates minimum for value=$value min=$minInclusive', ({ value, minInclusive }) => {
    expect(assertAtLeast('fn', 'field', value, minInclusive)).toBe(value);
  });

  it.each([
    { value: -0.001, minInclusive: 0 },
    { value: -10, minInclusive: -5 },
  ])('assertAtLeast throws when value=$value min=$minInclusive', ({ value, minInclusive }) => {
    expect(() => assertAtLeast('fn', 'field', value, minInclusive)).toThrow(RangeError);
  });

  it.each([
    { value: 5, minExclusive: 0, maxExclusive: 10 },
    { value: 0.5, minExclusive: 0, maxExclusive: 1 },
  ])(
    'assertBetweenExclusive validates interior range value=$value bounds=($minExclusive,$maxExclusive)',
    ({ value, minExclusive, maxExclusive }) => {
      expect(assertBetweenExclusive('fn', 'field', value, minExclusive, maxExclusive)).toBe(value);
    },
  );

  it.each([
    { value: 0, minExclusive: 0, maxExclusive: 10 },
    { value: 10, minExclusive: 0, maxExclusive: 10 },
  ])('assertBetweenExclusive throws for boundary value=$value', ({ value, minExclusive, maxExclusive }) => {
    expect(() => assertBetweenExclusive('fn', 'field', value, minExclusive, maxExclusive)).toThrow(RangeError);
  });

  it.each([
    { value: 0, minInclusive: 0, maxInclusive: 10 },
    { value: 10, minInclusive: 0, maxInclusive: 10 },
    { value: 5, minInclusive: 0, maxInclusive: 10 },
  ])(
    'assertBetweenInclusive validates range value=$value bounds=[$minInclusive,$maxInclusive]',
    ({ value, minInclusive, maxInclusive }) => {
      expect(assertBetweenInclusive('fn', 'field', value, minInclusive, maxInclusive)).toBe(value);
    },
  );

  it.each([
    { value: -1, minInclusive: 0, maxInclusive: 10 },
    { value: 11, minInclusive: 0, maxInclusive: 10 },
  ])('assertBetweenInclusive throws outside range value=$value', ({ value, minInclusive, maxInclusive }) => {
    expect(() => assertBetweenInclusive('fn', 'field', value, minInclusive, maxInclusive)).toThrow(RangeError);
  });
});
