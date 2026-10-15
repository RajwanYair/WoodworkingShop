import type { CabinetConfig, Part, ValidationIssue } from './types';

/**
 * Cabinet Planner Plugin API — v1 compatibility facade.
 *
 * A plugin can intercept the parts pipeline and/or hook into config changes.
 * All hooks are optional; a plugin only needs to implement what it cares about.
 *
 * Plugins are pure: hooks must be side-effect-free functions that return new
 * values instead of mutating their inputs.
 */
export interface CabinetPlannerPlugin {
  /** Unique identifier (reverse-domain recommended: "com.example.myPlugin"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** SemVer string of this plugin release. */
  version: string;

  /**
   * Called after `generateParts()` has produced the initial part list.
   * The plugin may return a modified copy; the original array must NOT be
   * mutated. Return the same array reference to signal no change.
   */
  onPartsGenerated?: (parts: Part[], cfg: CabinetConfig) => Part[];

  /**
   * Called before a config change is committed to the store.
   * May return a modified config; return the original object for no change.
   */
  onConfigChange?: (cfg: CabinetConfig) => CabinetConfig;

  /**
   * Phase 12 / Sprint 9 — Called after `validateConfig()` has run all
   * built-in and custom rules. The plugin may add, remove, or modify
   * validation issues. Return the same array reference to signal no change.
   */
  onValidate?: (issues: ValidationIssue[], cfg: CabinetConfig) => ValidationIssue[];

  /**
   * Phase 13 / Sprint 17 — Called after `cutSheetToGcode()` has assembled
   * the raw G-code string for a single sheet. The plugin may rewrite the
   * output to target a specific CNC controller dialect (Mach3, LinuxCNC,
   * Fanuc, etc.). Return the modified string; return the same reference to
   * signal no change.
   *
   * Stability: `experimental` — signature may change in v2.
   */
  onGcodeGenerated?: (raw: string) => string;
}
