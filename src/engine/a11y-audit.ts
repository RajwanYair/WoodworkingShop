/**
 * WCAG 2.2 AA accessibility audit engine.
 *
 * Defines WCAG 2.2 success criteria, provides an audit rule registry,
 * violation severity mapping, and structured report generation.
 * Pure TypeScript — no DOM, no React, no side-effects.
 */

// ---------------------------------------------------------------------------
// WCAG conformance levels
// ---------------------------------------------------------------------------

export type WcagLevel = 'A' | 'AA' | 'AAA';

// ---------------------------------------------------------------------------
// Success criterion identifiers (WCAG 2.2 — A and AA only)
// ---------------------------------------------------------------------------

export type WcagCriterionId =
  // Perceivable
  | '1.1.1' // Non-text Content
  | '1.2.1' // Audio-only / Video-only (Pre-recorded)
  | '1.2.2' // Captions (Pre-recorded)
  | '1.2.3' // Audio Description or Media Alternative
  | '1.2.4' // Captions (Live)
  | '1.2.5' // Audio Description (Pre-recorded)
  | '1.3.1' // Info and Relationships
  | '1.3.2' // Meaningful Sequence
  | '1.3.3' // Sensory Characteristics
  | '1.3.4' // Orientation
  | '1.3.5' // Identify Input Purpose
  | '1.4.1' // Use of Color
  | '1.4.2' // Audio Control
  | '1.4.3' // Contrast (Minimum)
  | '1.4.4' // Resize Text
  | '1.4.5' // Images of Text
  | '1.4.10' // Reflow
  | '1.4.11' // Non-text Contrast
  | '1.4.12' // Text Spacing
  | '1.4.13' // Content on Hover or Focus
  // Operable
  | '2.1.1' // Keyboard
  | '2.1.2' // No Keyboard Trap
  | '2.1.4' // Character Key Shortcuts
  | '2.2.1' // Timing Adjustable
  | '2.2.2' // Pause, Stop, Hide
  | '2.3.1' // Three Flashes or Below Threshold
  | '2.4.1' // Bypass Blocks
  | '2.4.2' // Page Titled
  | '2.4.3' // Focus Order
  | '2.4.4' // Link Purpose (In Context)
  | '2.4.5' // Multiple Ways
  | '2.4.6' // Headings and Labels
  | '2.4.7' // Focus Visible
  | '2.4.11' // Focus Not Obscured (Minimum) — NEW in 2.2
  | '2.4.12' // Focus Not Obscured (Enhanced) — NEW in 2.2 (AAA)
  | '2.5.1' // Pointer Gestures
  | '2.5.2' // Pointer Cancellation
  | '2.5.3' // Label in Name
  | '2.5.4' // Motion Actuation
  | '2.5.7' // Dragging Movements — NEW in 2.2
  | '2.5.8' // Target Size (Minimum) — NEW in 2.2
  // Understandable
  | '3.1.1' // Language of Page
  | '3.1.2' // Language of Parts
  | '3.2.1' // On Focus
  | '3.2.2' // On Input
  | '3.2.3' // Consistent Navigation
  | '3.2.4' // Consistent Identification
  | '3.2.6' // Consistent Help — NEW in 2.2
  | '3.3.1' // Error Identification
  | '3.3.2' // Labels or Instructions
  | '3.3.3' // Error Suggestion
  | '3.3.4' // Error Prevention (Legal, Financial, Data)
  | '3.3.7' // Redundant Entry — NEW in 2.2
  | '3.3.8' // Accessible Authentication (Minimum) — NEW in 2.2
  // Robust
  | '4.1.1' // Parsing (obsolete in 2.2 but kept for tool compatibility)
  | '4.1.2' // Name, Role, Value
  | '4.1.3'; // Status Messages

// ---------------------------------------------------------------------------
// Audit rule categories matching WCAG POUR principles
// ---------------------------------------------------------------------------

export type AuditCategory = 'perceivable' | 'operable' | 'understandable' | 'robust';

// ---------------------------------------------------------------------------
// Violation severity — maps to axe-core impact levels
// ---------------------------------------------------------------------------

export type ViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

// ---------------------------------------------------------------------------
// An individual audit rule
// ---------------------------------------------------------------------------

export type AuditRule = {
  readonly id: string;
  readonly criterion: WcagCriterionId;
  readonly level: WcagLevel;
  readonly category: AuditCategory;
  readonly severity: ViolationSeverity;
  readonly description: string;
  readonly helpUrl: string;
};

// ---------------------------------------------------------------------------
// A single audit violation instance
// ---------------------------------------------------------------------------

export type AuditViolation = {
  readonly ruleId: string;
  readonly criterion: WcagCriterionId;
  readonly severity: ViolationSeverity;
  readonly element: string; // CSS selector or component name
  readonly message: string;
  readonly suggestion: string;
};

// ---------------------------------------------------------------------------
// Audit pass result (rule checked and passed)
// ---------------------------------------------------------------------------

export type AuditPass = {
  readonly ruleId: string;
  readonly criterion: WcagCriterionId;
  readonly element: string;
};

// ---------------------------------------------------------------------------
// Incomplete check (could not be determined automatically)
// ---------------------------------------------------------------------------

export type AuditIncomplete = {
  readonly ruleId: string;
  readonly criterion: WcagCriterionId;
  readonly element: string;
  readonly reason: string;
};

// ---------------------------------------------------------------------------
// Full audit result for a component or page
// ---------------------------------------------------------------------------

export type AuditResult = {
  readonly target: string; // component name or page URL
  readonly timestamp: number;
  readonly violations: readonly AuditViolation[];
  readonly passes: readonly AuditPass[];
  readonly incomplete: readonly AuditIncomplete[];
  readonly violationCount: number;
  readonly passCount: number;
  readonly incompleteCount: number;
};

// ---------------------------------------------------------------------------
// Aggregated audit report across multiple components
// ---------------------------------------------------------------------------

export type AuditReport = {
  readonly generatedAt: number;
  readonly results: readonly AuditResult[];
  readonly totalViolations: number;
  readonly totalPasses: number;
  readonly totalIncomplete: number;
  readonly criticalCount: number;
  readonly seriousCount: number;
  readonly moderateCount: number;
  readonly minorCount: number;
  readonly isCompliant: boolean; // true when totalViolations === 0
};

// ---------------------------------------------------------------------------
// WCAG 2.2 criterion registry (A + AA)
// ---------------------------------------------------------------------------

export type WcagCriterion = {
  readonly id: WcagCriterionId;
  readonly title: string;
  readonly level: WcagLevel;
  readonly category: AuditCategory;
  readonly isNewIn22: boolean;
};

export const WCAG_22_CRITERIA: readonly WcagCriterion[] = [
  // --- Perceivable (Level A) ---
  { id: '1.1.1', title: 'Non-text Content', level: 'A', category: 'perceivable', isNewIn22: false },
  {
    id: '1.2.1',
    title: 'Audio-only and Video-only (Pre-recorded)',
    level: 'A',
    category: 'perceivable',
    isNewIn22: false,
  },
  { id: '1.2.2', title: 'Captions (Pre-recorded)', level: 'A', category: 'perceivable', isNewIn22: false },
  {
    id: '1.2.3',
    title: 'Audio Description or Media Alternative (Pre-recorded)',
    level: 'A',
    category: 'perceivable',
    isNewIn22: false,
  },
  { id: '1.3.1', title: 'Info and Relationships', level: 'A', category: 'perceivable', isNewIn22: false },
  { id: '1.3.2', title: 'Meaningful Sequence', level: 'A', category: 'perceivable', isNewIn22: false },
  { id: '1.3.3', title: 'Sensory Characteristics', level: 'A', category: 'perceivable', isNewIn22: false },
  { id: '1.4.1', title: 'Use of Color', level: 'A', category: 'perceivable', isNewIn22: false },
  { id: '1.4.2', title: 'Audio Control', level: 'A', category: 'perceivable', isNewIn22: false },
  // --- Perceivable (Level AA) ---
  { id: '1.2.4', title: 'Captions (Live)', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.2.5', title: 'Audio Description (Pre-recorded)', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.3.4', title: 'Orientation', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.3.5', title: 'Identify Input Purpose', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.3', title: 'Contrast (Minimum)', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.4', title: 'Resize Text', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.5', title: 'Images of Text', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.10', title: 'Reflow', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.11', title: 'Non-text Contrast', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.12', title: 'Text Spacing', level: 'AA', category: 'perceivable', isNewIn22: false },
  { id: '1.4.13', title: 'Content on Hover or Focus', level: 'AA', category: 'perceivable', isNewIn22: false },
  // --- Operable (Level A) ---
  { id: '2.1.1', title: 'Keyboard', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.1.2', title: 'No Keyboard Trap', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.2.1', title: 'Timing Adjustable', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.2.2', title: 'Pause, Stop, Hide', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.3.1', title: 'Three Flashes or Below Threshold', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.4.1', title: 'Bypass Blocks', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.4.2', title: 'Page Titled', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.4.3', title: 'Focus Order', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.4.4', title: 'Link Purpose (In Context)', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.5.1', title: 'Pointer Gestures', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.5.2', title: 'Pointer Cancellation', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.5.3', title: 'Label in Name', level: 'A', category: 'operable', isNewIn22: false },
  { id: '2.5.4', title: 'Motion Actuation', level: 'A', category: 'operable', isNewIn22: false },
  // --- Operable (Level AA) ---
  { id: '2.1.4', title: 'Character Key Shortcuts', level: 'AA', category: 'operable', isNewIn22: false },
  { id: '2.4.5', title: 'Multiple Ways', level: 'AA', category: 'operable', isNewIn22: false },
  { id: '2.4.6', title: 'Headings and Labels', level: 'AA', category: 'operable', isNewIn22: false },
  { id: '2.4.7', title: 'Focus Visible', level: 'AA', category: 'operable', isNewIn22: false },
  { id: '2.4.11', title: 'Focus Not Obscured (Minimum)', level: 'AA', category: 'operable', isNewIn22: true },
  { id: '2.5.7', title: 'Dragging Movements', level: 'AA', category: 'operable', isNewIn22: true },
  { id: '2.5.8', title: 'Target Size (Minimum)', level: 'AA', category: 'operable', isNewIn22: true },
  // --- Understandable (Level A) ---
  { id: '3.1.1', title: 'Language of Page', level: 'A', category: 'understandable', isNewIn22: false },
  { id: '3.2.1', title: 'On Focus', level: 'A', category: 'understandable', isNewIn22: false },
  { id: '3.2.2', title: 'On Input', level: 'A', category: 'understandable', isNewIn22: false },
  { id: '3.3.1', title: 'Error Identification', level: 'A', category: 'understandable', isNewIn22: false },
  { id: '3.3.2', title: 'Labels or Instructions', level: 'A', category: 'understandable', isNewIn22: false },
  // --- Understandable (Level AA) ---
  { id: '3.1.2', title: 'Language of Parts', level: 'AA', category: 'understandable', isNewIn22: false },
  { id: '3.2.3', title: 'Consistent Navigation', level: 'AA', category: 'understandable', isNewIn22: false },
  { id: '3.2.4', title: 'Consistent Identification', level: 'AA', category: 'understandable', isNewIn22: false },
  { id: '3.2.6', title: 'Consistent Help', level: 'AA', category: 'understandable', isNewIn22: true },
  { id: '3.3.3', title: 'Error Suggestion', level: 'AA', category: 'understandable', isNewIn22: false },
  {
    id: '3.3.4',
    title: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    category: 'understandable',
    isNewIn22: false,
  },
  { id: '3.3.7', title: 'Redundant Entry', level: 'AA', category: 'understandable', isNewIn22: true },
  {
    id: '3.3.8',
    title: 'Accessible Authentication (Minimum)',
    level: 'AA',
    category: 'understandable',
    isNewIn22: true,
  },
  // --- Robust (Level A) ---
  { id: '4.1.1', title: 'Parsing', level: 'A', category: 'robust', isNewIn22: false },
  { id: '4.1.2', title: 'Name, Role, Value', level: 'A', category: 'robust', isNewIn22: false },
  // --- Robust (Level AA) ---
  { id: '4.1.3', title: 'Status Messages', level: 'AA', category: 'robust', isNewIn22: false },
];

// ---------------------------------------------------------------------------
// Default built-in audit rules for cabinet planner components
// ---------------------------------------------------------------------------

export const AUDIT_RULES: readonly AuditRule[] = [
  {
    id: 'img-alt',
    criterion: '1.1.1',
    level: 'A',
    category: 'perceivable',
    severity: 'critical',
    description: 'Images must have alternative text',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content',
  },
  {
    id: 'color-contrast',
    criterion: '1.4.3',
    level: 'AA',
    category: 'perceivable',
    severity: 'serious',
    description: 'Text must have a contrast ratio of at least 4.5:1 (3:1 for large text)',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum',
  },
  {
    id: 'non-text-contrast',
    criterion: '1.4.11',
    level: 'AA',
    category: 'perceivable',
    severity: 'serious',
    description: 'UI components and graphical objects must have a contrast ratio of at least 3:1',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast',
  },
  {
    id: 'keyboard-accessible',
    criterion: '2.1.1',
    level: 'A',
    category: 'operable',
    severity: 'critical',
    description: 'All functionality must be accessible via keyboard',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard',
  },
  {
    id: 'focus-visible',
    criterion: '2.4.7',
    level: 'AA',
    category: 'operable',
    severity: 'serious',
    description: 'Keyboard focus indicator must be visible',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible',
  },
  {
    id: 'focus-not-obscured',
    criterion: '2.4.11',
    level: 'AA',
    category: 'operable',
    severity: 'serious',
    description: 'Focused component must not be entirely hidden by author-created content',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum',
  },
  {
    id: 'target-size',
    criterion: '2.5.8',
    level: 'AA',
    category: 'operable',
    severity: 'moderate',
    description: 'Touch target size must be at least 24×24 CSS pixels',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum',
  },
  {
    id: 'dragging-alternative',
    criterion: '2.5.7',
    level: 'AA',
    category: 'operable',
    severity: 'moderate',
    description: 'Dragging operations must have a single-pointer alternative',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements',
  },
  {
    id: 'label-in-name',
    criterion: '2.5.3',
    level: 'A',
    category: 'operable',
    severity: 'serious',
    description: "Accessible name must contain the component's visible label text",
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/label-in-name',
  },
  {
    id: 'form-label',
    criterion: '3.3.2',
    level: 'A',
    category: 'understandable',
    severity: 'critical',
    description: 'Form inputs must have associated labels',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions',
  },
  {
    id: 'error-identification',
    criterion: '3.3.1',
    level: 'A',
    category: 'understandable',
    severity: 'serious',
    description: 'Form errors must be identified and described in text',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification',
  },
  {
    id: 'aria-name-role-value',
    criterion: '4.1.2',
    level: 'A',
    category: 'robust',
    severity: 'critical',
    description: 'Custom interactive elements must have name, role, and value exposed via ARIA',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value',
  },
  {
    id: 'status-messages',
    criterion: '4.1.3',
    level: 'AA',
    category: 'robust',
    severity: 'serious',
    description: 'Status messages must be programmatically determinable via role or property',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/status-messages',
  },
  {
    id: 'consistent-help',
    criterion: '3.2.6',
    level: 'AA',
    category: 'understandable',
    severity: 'moderate',
    description: 'Help mechanisms must appear in a consistent location across pages',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/consistent-help',
  },
  {
    id: 'redundant-entry',
    criterion: '3.3.7',
    level: 'AA',
    category: 'understandable',
    severity: 'moderate',
    description: 'Users must not be required to re-enter information they already provided',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry',
  },
  {
    id: 'accessible-auth',
    criterion: '3.3.8',
    level: 'AA',
    category: 'understandable',
    severity: 'serious',
    description: 'Authentication must not require cognitive function tests',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum',
  },
];

// ---------------------------------------------------------------------------
// Contrast ratio calculation (WCAG relative luminance algorithm)
// ---------------------------------------------------------------------------

/**
 * Compute relative luminance of a linearised sRGB colour component (0–1).
 * Uses the WCAG 2.x formula.
 */
function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute relative luminance of an RGB colour where each channel is 0–255.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new RangeError(`RGB values must be 0–255; got (${r}, ${g}, ${b})`);
  }
  const rl = linearise(r / 255);
  const gl = linearise(g / 255);
  const bl = linearise(b / 255);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Compute contrast ratio between two colours (WCAG formula).
 * Returns a value between 1 (identical) and 21 (black on white).
 */
export function contrastRatio(fg: readonly [number, number, number], bg: readonly [number, number, number]): number {
  const l1 = relativeLuminance(fg[0], fg[1], fg[2]);
  const l2 = relativeLuminance(bg[0], bg[1], bg[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check whether a contrast ratio meets the WCAG minimum for the given
 * text size and font weight.
 *
 * @param ratio      - Contrast ratio (output of contrastRatio())
 * @param largText   - True for large text (≥18pt regular or ≥14pt bold)
 * @param level      - 'AA' (minimum) or 'AAA' (enhanced)
 */
export function meetsContrastRequirement(ratio: number, largText: boolean, level: WcagLevel = 'AA'): boolean {
  if (level === 'AAA') return largText ? ratio >= 4.5 : ratio >= 7;
  return largText ? ratio >= 3 : ratio >= 4.5;
}

// ---------------------------------------------------------------------------
// Target size check (WCAG 2.5.8 — minimum 24×24 CSS px)
// ---------------------------------------------------------------------------

export const MIN_TARGET_SIZE_PX = 24;

/**
 * Check whether a touch/click target meets the WCAG 2.5.8 minimum size.
 */
export function meetsTargetSize(widthPx: number, heightPx: number): boolean {
  return widthPx >= MIN_TARGET_SIZE_PX && heightPx >= MIN_TARGET_SIZE_PX;
}

// ---------------------------------------------------------------------------
// Audit result builder helpers
// ---------------------------------------------------------------------------

/**
 * Create an empty AuditResult for a named target (component or page).
 */
export function createAuditResult(target: string): AuditResult {
  return {
    target,
    timestamp: Date.now(),
    violations: [],
    passes: [],
    incomplete: [],
    violationCount: 0,
    passCount: 0,
    incompleteCount: 0,
  };
}

/**
 * Add a violation to an AuditResult (returns a new result — immutable).
 */
export function addViolation(result: AuditResult, violation: AuditViolation): AuditResult {
  const violations = [...result.violations, violation];
  return {
    ...result,
    violations,
    violationCount: violations.length,
  };
}

/**
 * Add a pass to an AuditResult (returns a new result — immutable).
 */
export function addPass(result: AuditResult, pass: AuditPass): AuditResult {
  const passes = [...result.passes, pass];
  return {
    ...result,
    passes,
    passCount: passes.length,
  };
}

/**
 * Add an incomplete check to an AuditResult (returns a new result — immutable).
 */
export function addIncomplete(result: AuditResult, incomplete: AuditIncomplete): AuditResult {
  const incompletes = [...result.incomplete, incomplete];
  return {
    ...result,
    incomplete: incompletes,
    incompleteCount: incompletes.length,
  };
}

// ---------------------------------------------------------------------------
// Aggregate multiple AuditResults into an AuditReport
// ---------------------------------------------------------------------------

/**
 * Aggregate an array of AuditResult objects into a single AuditReport.
 */
export function buildAuditReport(results: readonly AuditResult[]): AuditReport {
  let totalViolations = 0;
  let totalPasses = 0;
  let totalIncomplete = 0;
  let criticalCount = 0;
  let seriousCount = 0;
  let moderateCount = 0;
  let minorCount = 0;

  for (const r of results) {
    totalViolations += r.violationCount;
    totalPasses += r.passCount;
    totalIncomplete += r.incompleteCount;
    for (const v of r.violations) {
      if (v.severity === 'critical') criticalCount++;
      else if (v.severity === 'serious') seriousCount++;
      else if (v.severity === 'moderate') moderateCount++;
      else minorCount++;
    }
  }

  return {
    generatedAt: Date.now(),
    results,
    totalViolations,
    totalPasses,
    totalIncomplete,
    criticalCount,
    seriousCount,
    moderateCount,
    minorCount,
    isCompliant: totalViolations === 0,
  };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

const SEVERITY_LABEL: Record<ViolationSeverity, string> = {
  critical: '[CRITICAL]',
  serious: '[SERIOUS ]',
  moderate: '[MODERATE]',
  minor: '[MINOR   ]',
};

/**
 * Format an AuditReport as a human-readable text summary.
 */
export function formatAuditReport(report: AuditReport): string {
  const lines: string[] = [];
  const date = new Date(report.generatedAt).toISOString().slice(0, 10);
  lines.push(`WCAG 2.2 AA Accessibility Audit Report — ${date}`);
  lines.push('='.repeat(60));
  lines.push(
    `Status: ${report.isCompliant ? 'COMPLIANT ✓' : `NON-COMPLIANT — ${report.totalViolations} violation(s)`}`,
  );
  lines.push(
    `  Critical: ${report.criticalCount}  Serious: ${report.seriousCount}  Moderate: ${report.moderateCount}  Minor: ${report.minorCount}`,
  );
  lines.push(`  Passes: ${report.totalPasses}  Incomplete: ${report.totalIncomplete}`);
  lines.push('');

  for (const result of report.results) {
    if (result.violationCount === 0) continue;
    lines.push(`Component: ${result.target}`);
    lines.push('-'.repeat(40));
    for (const v of result.violations) {
      lines.push(`${SEVERITY_LABEL[v.severity]} SC ${v.criterion} — ${v.ruleId}`);
      lines.push(`  Element:    ${v.element}`);
      lines.push(`  Issue:      ${v.message}`);
      lines.push(`  Suggestion: ${v.suggestion}`);
    }
    lines.push('');
  }

  if (report.isCompliant) {
    lines.push('No violations found across all audited components.');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Look up a WCAG 2.2 criterion by ID. Returns undefined for unknown IDs.
 */
export function getCriterion(id: WcagCriterionId): WcagCriterion | undefined {
  return WCAG_22_CRITERIA.find((c) => c.id === id);
}

/**
 * Filter WCAG 2.2 criteria to those new in WCAG 2.2 (not in 2.1).
 */
export function getNewIn22Criteria(): readonly WcagCriterion[] {
  return WCAG_22_CRITERIA.filter((c) => c.isNewIn22);
}

/**
 * Get all audit rules for a given WCAG category.
 */
export function getRulesByCategory(category: AuditCategory): readonly AuditRule[] {
  return AUDIT_RULES.filter((r) => r.category === category);
}

/**
 * Get all audit rules at or above the given severity.
 */
export function getCriticalAndSeriousRules(): readonly AuditRule[] {
  return AUDIT_RULES.filter((r) => r.severity === 'critical' || r.severity === 'serious');
}
