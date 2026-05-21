/**
 * Phase 12 / Sprint 8 — Engine export sub-module barrel.
 * Covers: G-code toolpath parsing, G-code validation.
 *
 * @example
 * ```ts
 * import { parseToolpath, validateGcode } from '../engine/export';
 * ```
 */
export { parseToolpath } from '../gcode-toolpath.ts';
export type { MoveKind, ToolMove, ToolpathBounds, ParsedToolpath } from '../gcode-toolpath.ts';

export { validateGcode } from '../gcode-validator.ts';
export type { GcodeSeverity, GcodeIssue, GcodeValidationResult } from '../gcode-validator.ts';
