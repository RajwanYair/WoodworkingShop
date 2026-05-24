/**
 * Stylelint configuration for Tailwind CSS v4 + design tokens.
 *
 * `stylelint-config-tailwindcss` already handles all Tailwind v4 at-rules
 * (@apply, @theme, @custom-variant, @utility, @source, @reference, etc.)
 * so no manual `ignoreAtRules` is needed.
 *
 * Browserslist-aware via `stylelint-config-standard`: only flags compatibility
 * issues for browsers in our `browserslist` field (modern evergreen).
 */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-tailwindcss'],
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'no-descending-specificity': null,
    'media-feature-range-notation': null,
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    'declaration-property-value-no-unknown': null,
  },
  ignoreFiles: ['dist/**', 'coverage/**', 'docs/api/**', 'node_modules/**'],
};
