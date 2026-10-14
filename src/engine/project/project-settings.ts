/**
 * Sprint 48 — Project settings engine.
 *
 * Manages project-wide defaults: units, currency, material preferences,
 * labour rate, and display options.  All settings live in a plain `ProjectSettings`
 * object; `mergeSettings` does a shallow merge so partial updates are easy to apply.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LengthUnit = 'mm' | 'cm' | 'in';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'ILS' | 'AUD' | 'CAD';
export type SheetSortPreference = 'material-asc' | 'waste-desc' | 'sheets-asc';

export interface ProjectSettings {
  /** Unit to display linear dimensions in. */
  lengthUnit: LengthUnit;
  /** ISO 4217 currency code for cost calculations. */
  currency: CurrencyCode;
  /** Default material name for new cabinets. */
  defaultMaterial: string;
  /** Default edge banding material name. */
  defaultEdgeMaterial: string;
  /** Standard sheet thickness (mm) applied when adding new parts. */
  defaultThicknessMm: number;
  /** Labour cost per hour in the selected currency. */
  labourRatePerHour: number;
  /** Whether to show grain direction indicators on parts. */
  showGrainDirection: boolean;
  /** Preferred order for listing cut sheets in the optimizer output. */
  sheetSortPreference: SheetSortPreference;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  lengthUnit: 'mm',
  currency: 'USD',
  defaultMaterial: 'Melamine White 18mm',
  defaultEdgeMaterial: 'ABS White 1mm',
  defaultThicknessMm: 18,
  labourRatePerHour: 50,
  showGrainDirection: true,
  sheetSortPreference: 'waste-desc',
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Merge a partial settings object into a base, returning a new settings object.
 * The base defaults are never mutated.
 */
export function mergeSettings(base: ProjectSettings, overrides: Partial<ProjectSettings>): ProjectSettings {
  return { ...base, ...overrides };
}

/**
 * Validate a `ProjectSettings` object.
 * Returns an array of field-level error messages (empty = valid).
 */
export function validateSettings(settings: ProjectSettings): string[] {
  const errors: string[] = [];

  if (settings.defaultThicknessMm <= 0) {
    errors.push('defaultThicknessMm must be greater than 0.');
  }

  if (settings.labourRatePerHour < 0) {
    errors.push('labourRatePerHour must not be negative.');
  }

  const validUnits: LengthUnit[] = ['mm', 'cm', 'in'];
  if (!validUnits.includes(settings.lengthUnit)) {
    errors.push(`lengthUnit "${settings.lengthUnit}" is not valid.`);
  }

  const validCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'ILS', 'AUD', 'CAD'];
  if (!validCurrencies.includes(settings.currency)) {
    errors.push(`currency "${settings.currency}" is not supported.`);
  }

  return errors;
}

/**
 * Return a human-readable summary of the current settings.
 */
export function describeSettings(settings: ProjectSettings): string {
  return (
    `Units: ${settings.lengthUnit} | Currency: ${settings.currency} | ` +
    `Material: ${settings.defaultMaterial} | Thickness: ${settings.defaultThicknessMm} mm | ` +
    `Labour: ${settings.labourRatePerHour}/hr | Grain: ${settings.showGrainDirection ? 'on' : 'off'}`
  );
}
