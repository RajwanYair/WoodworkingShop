/**
 * Phase 12 / Sprint 8–9 — Engine validation sub-module barrel.
 * Covers: cabinet config validation rule engine + pluggable rule registry.
 *
 * @example
 * ```ts
 * import { validateConfig, registerRule } from '../engine/validation';
 * import type { ValidationRule } from '../engine/types';
 * ```
 */
export { validateConfig, registerRule, unregisterRule, getCustomRules } from '../validation.ts';
export type { ValidationRule, ValidationContext } from '../types.ts';
