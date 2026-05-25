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
    /** Tailwind generates non-BEM class names (e.g. .wood-600, .ms-4). */
    'selector-class-pattern': null,
    /** wood-* design tokens don't match the default camelCase/kebab pattern. */
    'custom-property-pattern': null,
    /** Custom animation names (e.g. fadeIn, shimmer) don't match the default. */
    'keyframes-name-pattern': null,
    /** Tailwind's generated utilities create specificity ordering that triggers
     *  false positives; suppressing here, enforced via Tailwind's own linting. */
    'no-descending-specificity': null,
    /** Enforce modern CSS range syntax: (640px <= width <= 1023px). */
    'media-feature-range-notation': 'context',
    /** Tailwind v4 @theme custom properties are validated by the Tailwind plugin,
     *  not by stylelint's value-checking heuristic — would produce false positives. */
    'declaration-property-value-no-unknown': null,
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
  },
  ignoreFiles: ['dist/**', 'coverage/**', 'docs/api/**', 'node_modules/**'],
};
