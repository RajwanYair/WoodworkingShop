import { describe, it, expect } from 'vitest';
import {
  resolveTheme,
  getToken,
  getTokenRgb,
  generateThemeCss,
  tokenToCssProperty,
  computeThemeClassDiff,
  isDarkMode,
  colorSchemeValue,
  systemPreferenceToMode,
  checkContrastPair,
  validateThemeContrast,
  getContrastFailures,
  buildThemeSummary,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  HIGH_CONTRAST_DARK_THEME,
  ALL_THEMES,
  THEME_MODES,
  STANDARD_CONTRAST_PAIRS,
} from '../../src/engine/dark-mode-tokens';
import type { ThemeMode, ContrastPair } from '../../src/engine/dark-mode-tokens';

// ---------------------------------------------------------------------------
// resolveTheme
// ---------------------------------------------------------------------------

describe('resolveTheme', () => {
  it.each(THEME_MODES)('resolves %s without throwing', (mode) => {
    expect(() => resolveTheme(mode)).not.toThrow();
    expect(resolveTheme(mode).mode).toBe(mode);
  });

  it('throws RangeError for unknown mode', () => {
    expect(() => resolveTheme('plasma' as ThemeMode)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// ALL_THEMES completeness
// ---------------------------------------------------------------------------

describe('ALL_THEMES', () => {
  it('contains all 4 theme modes', () => {
    expect(ALL_THEMES.size).toBe(4);
    for (const mode of THEME_MODES) {
      expect(ALL_THEMES.has(mode)).toBe(true);
    }
  });

  it('every theme has 18 tokens', () => {
    for (const theme of ALL_THEMES.values()) {
      expect(theme.tokens.size, `${theme.mode} should have 18 tokens`).toBe(18);
    }
  });

  it('every token has a cssVariable starting with --color-', () => {
    for (const theme of ALL_THEMES.values()) {
      for (const token of theme.tokens.values()) {
        expect(token.cssVariable).toMatch(/^--color-/);
      }
    }
  });

  it('every token RGB values are in 0–255 range', () => {
    for (const theme of ALL_THEMES.values()) {
      for (const token of theme.tokens.values()) {
        for (const channel of token.value) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getToken / getTokenRgb
// ---------------------------------------------------------------------------

describe('getToken', () => {
  it('returns token for known name', () => {
    const t = getToken(LIGHT_THEME, 'wood-500');
    expect(t.name).toBe('wood-500');
    expect(t.cssVariable).toBe('--color-wood-500');
    expect(t.value).toHaveLength(3);
  });

  it('throws RangeError for unknown token name', () => {
    expect(() => getToken(LIGHT_THEME, 'neon-pink' as never)).toThrow(RangeError);
  });
});

describe('getTokenRgb', () => {
  it('returns a 3-element tuple for known tokens', () => {
    const rgb = getTokenRgb(DARK_THEME, 'primary');
    expect(rgb).toHaveLength(3);
    expect(rgb.every((v) => v >= 0 && v <= 255)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateThemeCss
// ---------------------------------------------------------------------------

describe('generateThemeCss', () => {
  it('produces CSS with default :root selector', () => {
    const css = generateThemeCss(LIGHT_THEME);
    expect(css).toMatch(/^:root \{/);
    expect(css).toContain('--color-wood-500');
    expect(css).toContain('--color-primary');
  });

  it('uses custom selector when provided', () => {
    const css = generateThemeCss(DARK_THEME, '.dark');
    expect(css).toMatch(/^\.dark \{/);
  });

  it('contains rgb(...) values for all tokens', () => {
    const css = generateThemeCss(HIGH_CONTRAST_THEME);
    const matches = css.match(/rgb\(\d+, \d+, \d+\)/g) ?? [];
    expect(matches.length).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// tokenToCssProperty
// ---------------------------------------------------------------------------

describe('tokenToCssProperty', () => {
  it('formats correctly', () => {
    const token = getToken(LIGHT_THEME, 'wood-500');
    const prop = tokenToCssProperty(token);
    expect(prop).toMatch(/^--color-wood-500: rgb\(\d+, \d+, \d+\)$/);
  });
});

// ---------------------------------------------------------------------------
// computeThemeClassDiff
// ---------------------------------------------------------------------------

describe('computeThemeClassDiff', () => {
  it.each([
    // [from, to, expectedAdd, expectedRemove]
    ['light', 'dark', ['dark'], []],
    ['dark', 'light', [], ['dark']],
    ['light', 'high-contrast', ['high-contrast'], []],
    ['light', 'high-contrast-dark', ['high-contrast', 'dark'], []],
    ['dark', 'high-contrast-dark', ['high-contrast'], []],
    ['high-contrast-dark', 'light', [], ['high-contrast', 'dark']],
    ['light', 'light', [], []],
    ['dark', 'dark', [], []],
  ] as const)('%s → %s: add=%j remove=%j', (from, to, expectedAdd, expectedRemove) => {
    const diff = computeThemeClassDiff(from, to);
    expect([...diff.add].sort()).toEqual([...expectedAdd].sort());
    expect([...diff.remove].sort()).toEqual([...expectedRemove].sort());
  });
});

// ---------------------------------------------------------------------------
// isDarkMode / colorSchemeValue
// ---------------------------------------------------------------------------

describe('isDarkMode', () => {
  it.each([
    ['light', false],
    ['dark', true],
    ['high-contrast', false],
    ['high-contrast-dark', true],
  ] as const)('%s → %s', (mode, expected) => {
    expect(isDarkMode(mode)).toBe(expected);
  });
});

describe('colorSchemeValue', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['high-contrast', 'light'],
    ['high-contrast-dark', 'dark'],
  ] as const)('%s → %s', (mode, expected) => {
    expect(colorSchemeValue(mode)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// systemPreferenceToMode
// ---------------------------------------------------------------------------

describe('systemPreferenceToMode', () => {
  it('prefersDark=true → dark', () => {
    expect(systemPreferenceToMode(true)).toBe('dark');
  });

  it('prefersDark=false → light', () => {
    expect(systemPreferenceToMode(false)).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// checkContrastPair
// ---------------------------------------------------------------------------

describe('checkContrastPair', () => {
  const bodyTextPair: ContrastPair = {
    foreground: 'text-base',
    background: 'surface',
    context: 'body text on surface',
  };

  it('returns a ratio ≥ 1', () => {
    const result = checkContrastPair(LIGHT_THEME, bodyTextPair);
    expect(result.ratio).toBeGreaterThanOrEqual(1);
  });

  it('high-contrast theme passes AA for body text', () => {
    const result = checkContrastPair(HIGH_CONTRAST_THEME, bodyTextPair);
    expect(result.passesAA).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('high-contrast-dark theme passes AA for body text', () => {
    const result = checkContrastPair(HIGH_CONTRAST_DARK_THEME, bodyTextPair);
    expect(result.passesAA).toBe(true);
  });

  it('result contains foreground and background RGB', () => {
    const result = checkContrastPair(DARK_THEME, bodyTextPair);
    expect(result.foregroundRgb).toHaveLength(3);
    expect(result.backgroundRgb).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// validateThemeContrast
// ---------------------------------------------------------------------------

describe('validateThemeContrast', () => {
  it('returns one result per pair', () => {
    const results = validateThemeContrast(LIGHT_THEME, STANDARD_CONTRAST_PAIRS);
    expect(results.length).toBe(STANDARD_CONTRAST_PAIRS.length);
  });

  it('high-contrast theme has zero failures on standard pairs', () => {
    const failures = getContrastFailures(HIGH_CONTRAST_THEME);
    expect(failures).toHaveLength(0);
  });

  it('high-contrast-dark theme has zero failures on standard pairs', () => {
    const failures = getContrastFailures(HIGH_CONTRAST_DARK_THEME);
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildThemeSummary
// ---------------------------------------------------------------------------

describe('buildThemeSummary', () => {
  it.each([
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['high-contrast', false, 'light'],
    ['high-contrast-dark', true, 'dark'],
  ] as const)('%s: isDark=%s colorScheme=%s', (mode, dark, scheme) => {
    const summary = buildThemeSummary(resolveTheme(mode));
    expect(summary.mode).toBe(mode);
    expect(summary.isDark).toBe(dark);
    expect(summary.colorScheme).toBe(scheme);
    expect(summary.tokenCount).toBe(18);
    expect(typeof summary.contrastFailures).toBe('number');
  });

  it('high-contrast has 0 contrast failures', () => {
    expect(buildThemeSummary(HIGH_CONTRAST_THEME).contrastFailures).toBe(0);
  });

  it('high-contrast-dark has 0 contrast failures', () => {
    expect(buildThemeSummary(HIGH_CONTRAST_DARK_THEME).contrastFailures).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// LIGHT_THEME / DARK_THEME spot-checks
// ---------------------------------------------------------------------------

describe('LIGHT_THEME', () => {
  it('surface token is lighter than wood-900', () => {
    const surface = getTokenRgb(LIGHT_THEME, 'surface');
    const dark = getTokenRgb(LIGHT_THEME, 'wood-900');
    const surfaceLum = surface[0] + surface[1] + surface[2];
    const darkLum = dark[0] + dark[1] + dark[2];
    expect(surfaceLum).toBeGreaterThan(darkLum);
  });
});

describe('DARK_THEME', () => {
  it('surface token is darker than wood-900', () => {
    const surface = getTokenRgb(DARK_THEME, 'surface');
    const light = getTokenRgb(DARK_THEME, 'wood-900');
    const surfaceLum = surface[0] + surface[1] + surface[2];
    const lightLum = light[0] + light[1] + light[2];
    expect(surfaceLum).toBeLessThan(lightLum);
  });
});
