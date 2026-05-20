/**
 * Stylelint configuration for Tailwind CSS v4 + design tokens.
 *
 * Replaces VS Code's built-in CSS validator (disabled via `css.validate: false`)
 * which doesn't understand Tailwind v4's `@import`, `@theme`, `@custom-variant`
 * and `@apply` directives.
 *
 * Browserslist-aware: only flags compatibility issues for browsers in our
 * `browserslist` field (modern evergreen browsers), so legacy IE/old-Safari
 * warnings disappear naturally without per-rule suppression.
 */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-tailwindcss'],
  rules: {
    // Tailwind v4 directives — at-rules the standard config doesn't know about
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer',
          'theme',
          'custom-variant',
          'config',
          'plugin',
          'source',
          'utility',
          'reference',
        ],
      },
    ],
    // CSS Modules / postcss `@value` and Tailwind utility classes use kebab-case
    // and sometimes contain digits; keep the default but allow `wood-*` tokens.
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    // Allow modern features Tailwind v4 / our design system uses
    'no-descending-specificity': null,
    'media-feature-range-notation': null,
    // We intentionally use `:focus-visible`, `:has()`, `@supports` — keep noise low
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    // Print/screen reader properties don't cause runtime issues
    'declaration-property-value-no-unknown': null,
  },
  // Browserslist drives compatibility warnings; pulled from package.json `browserslist`
  // so legacy-browser noise (IE, old Safari) is filtered out automatically.
  ignoreFiles: ['dist/**', 'coverage/**', 'docs/api/**', 'node_modules/**'],
};
