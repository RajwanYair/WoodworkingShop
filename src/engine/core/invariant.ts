/**
 * Shared numeric invariant helpers for engine-layer calculations.
 *
 * Each helper returns the validated value for inline composition.
 */

/**
 * Assert that a value is a finite number.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @returns The validated finite number
 * @throws RangeError when value is not finite
 */
export function assertFiniteNumber(functionName: string, fieldName: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${functionName}: ${fieldName} must be a finite number, got ${String(value)}`);
  }
  return value;
}

/**
 * Assert that a value is strictly greater than a minimum.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param minExclusive - Exclusive minimum bound
 * @returns The validated number
 * @throws RangeError when value is not greater than minExclusive
 */
export function assertGreaterThan(
  functionName: string,
  fieldName: string,
  value: number,
  minExclusive: number,
): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (!(value > minExclusive)) {
    throw new RangeError(`${functionName}: ${fieldName} must be > ${minExclusive}, got ${value}`);
  }
  return value;
}

/**
 * Assert that a value is greater than or equal to a minimum.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param minInclusive - Inclusive minimum bound
 * @returns The validated number
 * @throws RangeError when value is below minInclusive
 */
export function assertAtLeast(functionName: string, fieldName: string, value: number, minInclusive: number): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (value < minInclusive) {
    throw new RangeError(`${functionName}: ${fieldName} must be >= ${minInclusive}, got ${value}`);
  }
  return value;
}

/**
 * Assert that a value is within an exclusive range.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param minExclusive - Exclusive lower bound
 * @param maxExclusive - Exclusive upper bound
 * @returns The validated number
 * @throws RangeError when value is not inside (minExclusive, maxExclusive)
 */
export function assertBetweenExclusive(
  functionName: string,
  fieldName: string,
  value: number,
  minExclusive: number,
  maxExclusive: number,
): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (!(value > minExclusive && value < maxExclusive)) {
    throw new RangeError(`${functionName}: ${fieldName} must be > ${minExclusive} and < ${maxExclusive}, got ${value}`);
  }
  return value;
}

/**
 * Assert that a value is within an inclusive range.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param minInclusive - Inclusive lower bound
 * @param maxInclusive - Inclusive upper bound
 * @returns The validated number
 * @throws RangeError when value is outside [minInclusive, maxInclusive]
 */
export function assertBetweenInclusive(
  functionName: string,
  fieldName: string,
  value: number,
  minInclusive: number,
  maxInclusive: number,
): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (value < minInclusive || value > maxInclusive) {
    throw new RangeError(
      `${functionName}: ${fieldName} must be >= ${minInclusive} and <= ${maxInclusive}, got ${value}`,
    );
  }
  return value;
}

/**
 * Assert that a value is an integer greater than or equal to a minimum.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param minInclusive - Inclusive minimum bound
 * @returns The validated integer
 * @throws RangeError when value is not an integer or below minInclusive
 */
export function assertIntegerAtLeast(
  functionName: string,
  fieldName: string,
  value: number,
  minInclusive: number,
): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${functionName}: ${fieldName} must be an integer, got ${value}`);
  }
  if (value < minInclusive) {
    throw new RangeError(`${functionName}: ${fieldName} must be >= ${minInclusive}, got ${value}`);
  }
  return value;
}

/**
 * Assert that a value is strictly less than a maximum.
 *
 * @param functionName - Calling function name for error context
 * @param fieldName - Input field name for error context
 * @param value - Value to validate
 * @param maxExclusive - Exclusive upper bound
 * @returns The validated number
 * @throws RangeError when value is not less than maxExclusive
 */
export function assertLessThan(functionName: string, fieldName: string, value: number, maxExclusive: number): number {
  assertFiniteNumber(functionName, fieldName, value);
  if (!(value < maxExclusive)) {
    throw new RangeError(`${functionName}: ${fieldName} must be < ${maxExclusive}, got ${value}`);
  }
  return value;
}
