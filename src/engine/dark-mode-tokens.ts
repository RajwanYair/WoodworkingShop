/**
 * Dark mode design token engine.
 *
 * Manages the cabinet planner's theme system: light, dark, and high-contrast
 * modes. Provides token definitions, theme switching helpers, colour-scheme
 * CSS generation, and contrast-validation utilities built on top of the WCAG
 * relative-luminance maths in a11y-audit.ts.
 *
 * Pure TypeScript — no DOM APIs, no React, no side-effects.
 */

import { contrastRatio, meetsContrastRequirement } from './a11y-audit';

// ---------------------------------------------------------------------------
// Theme modes
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'high-contrast-dark';

export const THEME_MODES = ['light', 'dark', 'high-contrast', 'high-contrast-dark'] as const;

// ---------------------------------------------------------------------------
// Design token names (wood-* palette + semantic tokens)
// ---------------------------------------------------------------------------

export type TokenName =
  | 'wood-50'
  | 'wood-100'
  | 'wood-200'
  | 'wood-300'
  | 'wood-400'
  | 'wood-500'
  | 'wood-600'
  | 'wood-700'
  | 'wood-800'
  | 'wood-900'
  | 'primary'
  | 'surface'
  | 'surface-dark'
  | 'text-base'
  | 'text-muted'
  | 'text-inverse'
  | 'border'
  | 'focus-ring';

// RGB tuple: [red, green, blue] each 0–255
export type RgbTuple = readonly [number, number, number];

// ---------------------------------------------------------------------------
// A single design token
// ---------------------------------------------------------------------------

export type DesignToken = {
  readonly name: TokenName;
  readonly cssVariable: string; // e.g. '--color-wood-500'
  readonly value: RgbTuple; // resolved RGB for this token in a given theme
  readonly description: string;
};

// ---------------------------------------------------------------------------
// Theme definition — a complete mapping of all tokens for one ThemeMode
// ---------------------------------------------------------------------------

export type ThemeDefinition = {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly tokens: ReadonlyMap<TokenName, DesignToken>;
};

// ---------------------------------------------------------------------------
// Contrast pair — used for WCAG validation
// ---------------------------------------------------------------------------

export type ContrastPair = {
  readonly foreground: TokenName;
  readonly background: TokenName;
  readonly context: string; // e.g. 'body text on surface'
};

export type ContrastCheckResult = {
  readonly pair: ContrastPair;
  readonly ratio: number;
  readonly passesAA: boolean;
  readonly passesAALarge: boolean;
  readonly foregroundRgb: RgbTuple;
  readonly backgroundRgb: RgbTuple;
};

// ---------------------------------------------------------------------------
// Token catalogue — raw RGB values per theme
// ---------------------------------------------------------------------------

const LIGHT_TOKENS: ReadonlyArray<readonly [TokenName, RgbTuple, string]> = [
  ['wood-50', [253, 248, 240], 'Lightest warm white'],
  ['wood-100', [245, 234, 214], 'Light parchment'],
  ['wood-200', [232, 212, 171], 'Pale oak'],
  ['wood-300', [212, 184, 122], 'Light walnut'],
  ['wood-400', [196, 154, 78], 'Medium maple'],
  ['wood-500', [166, 124, 46], 'Primary brand — warm amber'],
  ['wood-600', [124, 92, 34], 'Dark oak'],
  ['wood-700', [90, 66, 24], 'Deep walnut'],
  ['wood-800', [61, 45, 16], 'Near-black wood'],
  ['wood-900', [36, 26, 10], 'Darkest wood'],
  ['primary', [166, 124, 46], 'Primary accent colour'],
  ['surface', [253, 248, 240], 'Page / card background'],
  ['surface-dark', [26, 21, 16], 'Dark surface (unused in light mode)'],
  ['text-base', [36, 26, 10], 'Primary text'],
  ['text-muted', [124, 92, 34], 'Secondary / muted text'],
  ['text-inverse', [253, 248, 240], 'Text on dark backgrounds'],
  ['border', [212, 184, 122], 'Default border colour'],
  ['focus-ring', [166, 124, 46], 'Focus indicator'],
];

const DARK_TOKENS: ReadonlyArray<readonly [TokenName, RgbTuple, string]> = [
  ['wood-50', [26, 21, 16], 'Darkest surface (inverted)'],
  ['wood-100', [38, 30, 20], 'Dark card surface'],
  ['wood-200', [56, 44, 28], 'Elevated surface'],
  ['wood-300', [90, 70, 40], 'Subtle border'],
  ['wood-400', [130, 100, 56], 'Muted accent'],
  ['wood-500', [185, 145, 72], 'Primary brand — lightened for dark bg'],
  ['wood-600', [210, 175, 110], 'Light accent'],
  ['wood-700', [232, 212, 171], 'Pale text'],
  ['wood-800', [245, 234, 214], 'Near-white text'],
  ['wood-900', [253, 248, 240], 'Brightest (white)'],
  ['primary', [185, 145, 72], 'Primary accent colour (dark mode)'],
  ['surface', [22, 17, 12], 'Dark page background'],
  ['surface-dark', [14, 11, 7], 'Deeper dark surface'],
  ['text-base', [245, 234, 214], 'Primary text on dark bg'],
  ['text-muted', [180, 145, 90], 'Muted text on dark bg'],
  ['text-inverse', [36, 26, 10], 'Text on light components'],
  ['border', [90, 70, 40], 'Border on dark bg'],
  ['focus-ring', [185, 145, 72], 'Focus ring on dark bg'],
];

const HIGH_CONTRAST_TOKENS: ReadonlyArray<readonly [TokenName, RgbTuple, string]> = [
  ['wood-50', [255, 255, 255], 'White'],
  ['wood-100', [240, 240, 240], 'Near-white'],
  ['wood-200', [204, 204, 204], 'Light grey'],
  ['wood-300', [136, 136, 136], 'Mid grey'],
  ['wood-400', [85, 85, 85], 'Dark grey'],
  ['wood-500', [34, 34, 34], 'Near-black'],
  ['wood-600', [17, 17, 17], 'Very dark'],
  ['wood-700', [0, 0, 0], 'Black'],
  ['wood-800', [0, 0, 0], 'Black'],
  ['wood-900', [0, 0, 0], 'Black'],
  ['primary', [0, 0, 204], 'High-contrast blue link'],
  ['surface', [255, 255, 255], 'White background'],
  ['surface-dark', [0, 0, 0], 'Black surface'],
  ['text-base', [0, 0, 0], 'Black text on white'],
  ['text-muted', [17, 17, 17], 'Dark muted text'],
  ['text-inverse', [255, 255, 255], 'White text on black'],
  ['border', [0, 0, 0], 'Black border'],
  ['focus-ring', [0, 68, 204], 'High-contrast focus ring'],
];

const HIGH_CONTRAST_DARK_TOKENS: ReadonlyArray<readonly [TokenName, RgbTuple, string]> = [
  ['wood-50', [0, 0, 0], 'Black'],
  ['wood-100', [17, 17, 17], 'Near-black'],
  ['wood-200', [34, 34, 34], 'Very dark'],
  ['wood-300', [102, 102, 102], 'Dark grey'],
  ['wood-400', [153, 153, 153], 'Mid grey'],
  ['wood-500', [204, 204, 204], 'Light grey'],
  ['wood-600', [221, 221, 221], 'Near-white'],
  ['wood-700', [240, 240, 240], 'Off-white'],
  ['wood-800', [248, 248, 248], 'Almost white'],
  ['wood-900', [255, 255, 255], 'White'],
  ['primary', [255, 255, 0], 'High-contrast yellow (dark bg)'],
  ['surface', [0, 0, 0], 'Black background'],
  ['surface-dark', [0, 0, 0], 'Black surface'],
  ['text-base', [255, 255, 255], 'White text on black'],
  ['text-muted', [204, 204, 204], 'Light muted text'],
  ['text-inverse', [0, 0, 0], 'Black text on light components'],
  ['border', [255, 255, 255], 'White border'],
  ['focus-ring', [255, 255, 0], 'Yellow focus ring'],
];

// ---------------------------------------------------------------------------
// Build a ThemeDefinition from a raw catalogue
// ---------------------------------------------------------------------------

function buildTheme(
  mode: ThemeMode,
  label: string,
  catalogue: ReadonlyArray<readonly [TokenName, RgbTuple, string]>,
): ThemeDefinition {
  const entries = catalogue.map(([name, value, description]) => {
    const token: DesignToken = {
      name,
      cssVariable: `--color-${name}`,
      value,
      description,
    };
    return [name, token] as const;
  });
  return { mode, label, tokens: new Map(entries) };
}

// ---------------------------------------------------------------------------
// Built-in theme definitions
// ---------------------------------------------------------------------------

export const LIGHT_THEME = buildTheme('light', 'Light', LIGHT_TOKENS);
export const DARK_THEME = buildTheme('dark', 'Dark', DARK_TOKENS);
export const HIGH_CONTRAST_THEME = buildTheme('high-contrast', 'High Contrast', HIGH_CONTRAST_TOKENS);
export const HIGH_CONTRAST_DARK_THEME = buildTheme(
  'high-contrast-dark',
  'High Contrast Dark',
  HIGH_CONTRAST_DARK_TOKENS,
);

export const ALL_THEMES: ReadonlyMap<ThemeMode, ThemeDefinition> = new Map([
  ['light', LIGHT_THEME],
  ['dark', DARK_THEME],
  ['high-contrast', HIGH_CONTRAST_THEME],
  ['high-contrast-dark', HIGH_CONTRAST_DARK_THEME],
]);

// ---------------------------------------------------------------------------
// Theme resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the ThemeDefinition for a given ThemeMode.
 * Throws RangeError for unknown modes.
 */
export function resolveTheme(mode: ThemeMode): ThemeDefinition {
  const theme = ALL_THEMES.get(mode);
  if (!theme) {
    throw new RangeError(`Unknown theme mode: "${mode}". Valid modes: ${THEME_MODES.join(', ')}`);
  }
  return theme;
}

/**
 * Get a single DesignToken from a theme by name.
 * Throws RangeError if the token is not found.
 */
export function getToken(theme: ThemeDefinition, name: TokenName): DesignToken {
  const token = theme.tokens.get(name);
  if (!token) {
    throw new RangeError(`Token "${name}" not found in theme "${theme.mode}"`);
  }
  return token;
}

/**
 * Get the RGB tuple for a named token in a theme.
 */
export function getTokenRgb(theme: ThemeDefinition, name: TokenName): RgbTuple {
  return getToken(theme, name).value;
}

// ---------------------------------------------------------------------------
// CSS custom property generation
// ---------------------------------------------------------------------------

/**
 * Generate a CSS block of custom properties for a theme.
 *
 * @param theme   - The ThemeDefinition to generate CSS for
 * @param selector - The CSS selector to scope the block (default: ':root')
 * @returns A string of CSS like `:root { --color-wood-500: rgb(166, 124, 46); ... }`
 */
export function generateThemeCss(theme: ThemeDefinition, selector = ':root'): string {
  const props = [...theme.tokens.values()]
    .map((t) => `  ${t.cssVariable}: rgb(${t.value[0]}, ${t.value[1]}, ${t.value[2]});`)
    .join('\n');
  return `${selector} {\n${props}\n}`;
}

/**
 * Generate a CSS custom property declaration for a single token.
 * Useful for inline style injection.
 */
export function tokenToCssProperty(token: DesignToken): string {
  const [r, g, b] = token.value;
  return `${token.cssVariable}: rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------------------------------------
// Theme switching state helpers (pure — callers apply the result to the DOM)
// ---------------------------------------------------------------------------

/**
 * Compute which CSS class names to add/remove from the <html> element when
 * switching to a new theme.
 */
export type ThemeClassDiff = {
  readonly add: readonly string[];
  readonly remove: readonly string[];
};

export function computeThemeClassDiff(currentMode: ThemeMode, nextMode: ThemeMode): ThemeClassDiff {
  const CLASS_MAP: Record<ThemeMode, readonly string[]> = {
    light: [],
    dark: ['dark'],
    'high-contrast': ['high-contrast'],
    'high-contrast-dark': ['high-contrast', 'dark'],
  };

  const currentClasses = new Set(CLASS_MAP[currentMode]);
  const nextClasses = new Set(CLASS_MAP[nextMode]);

  const add = [...nextClasses].filter((c) => !currentClasses.has(c));
  const remove = [...currentClasses].filter((c) => !nextClasses.has(c));

  return { add, remove };
}

/**
 * Determine whether a ThemeMode requires a dark colour scheme
 * (for `color-scheme` CSS property / `prefers-color-scheme` matching).
 */
export function isDarkMode(mode: ThemeMode): boolean {
  return mode === 'dark' || mode === 'high-contrast-dark';
}

/**
 * Return the recommended `color-scheme` CSS value for a ThemeMode.
 */
export function colorSchemeValue(mode: ThemeMode): 'light' | 'dark' {
  return isDarkMode(mode) ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// System preference detection (pure — no DOM access)
// ---------------------------------------------------------------------------

/**
 * Parse system preference string (e.g. from `matchMedia` result) into a base
 * ThemeMode.  Returns 'dark' or 'light'.
 */
export function systemPreferenceToMode(prefersDark: boolean): 'light' | 'dark' {
  return prefersDark ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// WCAG contrast validation for a theme
// ---------------------------------------------------------------------------

/** Standard contrast pairs to validate for every theme */
export const STANDARD_CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: 'text-base', background: 'surface', context: 'body text on page background' },
  { foreground: 'text-muted', background: 'surface', context: 'muted text on page background' },
  { foreground: 'text-inverse', background: 'primary', context: 'inverse text on primary button' },
  { foreground: 'primary', background: 'surface', context: 'primary accent on background' },
  { foreground: 'text-base', background: 'wood-100', context: 'body text on card surface' },
];

/**
 * Check contrast ratio for a single pair in a theme.
 */
export function checkContrastPair(theme: ThemeDefinition, pair: ContrastPair): ContrastCheckResult {
  const fgRgb = getTokenRgb(theme, pair.foreground);
  const bgRgb = getTokenRgb(theme, pair.background);
  const ratio = contrastRatio(fgRgb, bgRgb);
  return {
    pair,
    ratio,
    passesAA: meetsContrastRequirement(ratio, false, 'AA'),
    passesAALarge: meetsContrastRequirement(ratio, true, 'AA'),
    foregroundRgb: fgRgb,
    backgroundRgb: bgRgb,
  };
}

/**
 * Validate all standard contrast pairs for a theme.
 * Returns the array of ContrastCheckResult — callers decide how to report failures.
 */
export function validateThemeContrast(
  theme: ThemeDefinition,
  pairs: readonly ContrastPair[] = STANDARD_CONTRAST_PAIRS,
): readonly ContrastCheckResult[] {
  return pairs.map((pair) => checkContrastPair(theme, pair));
}

/**
 * Return only the contrast pairs that fail WCAG AA for normal (non-large) text.
 */
export function getContrastFailures(
  theme: ThemeDefinition,
  pairs: readonly ContrastPair[] = STANDARD_CONTRAST_PAIRS,
): readonly ContrastCheckResult[] {
  return validateThemeContrast(theme, pairs).filter((r) => !r.passesAA);
}

// ---------------------------------------------------------------------------
// Theme summary (for display / debugging)
// ---------------------------------------------------------------------------

export type ThemeSummary = {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly tokenCount: number;
  readonly isDark: boolean;
  readonly colorScheme: 'light' | 'dark';
  readonly contrastFailures: number;
};

/**
 * Build a ThemeSummary for a theme, including WCAG contrast failure count.
 */
export function buildThemeSummary(theme: ThemeDefinition): ThemeSummary {
  const failures = getContrastFailures(theme);
  return {
    mode: theme.mode,
    label: theme.label,
    tokenCount: theme.tokens.size,
    isDark: isDarkMode(theme.mode),
    colorScheme: colorSchemeValue(theme.mode),
    contrastFailures: failures.length,
  };
}
