import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';
import regexp from 'eslint-plugin-regexp';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'tests/e2e', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      eslintReact.configs['recommended-typescript'],
      eslintReact.configs['disable-conflict-eslint-plugin-react-hooks'],
      regexp.configs['flat/recommended'],
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2024,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@eslint-react/naming-convention-id-name': 'off',
      '@eslint-react/naming-convention-ref-name': 'off',
      '@eslint-react/no-array-index-key': 'off',
      '@eslint-react/no-context-provider': 'off',
      '@eslint-react/no-missing-component-display-name': 'off',
      '@eslint-react/no-missing-context-display-name': 'off',
      '@eslint-react/no-unnecessary-use-prefix': 'off',
      '@eslint-react/no-use-context': 'off',
      '@eslint-react/purity': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/use-state': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^react(?:-dom)?(?:/|$)',
              message: 'Engine modules must remain React-free.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^(?:(?:\.\./)+platform(?:/|$)|@/platform(?:/|$))`,
              message: 'Features must use an app/store-facing platform boundary, not platform internals.',
            },
          ],
        },
      ],
    },
  },
  // testing-library + no-only-tests rules applied only to test files
  {
    files: ['tests/**/*.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibrary,
      'no-only-tests': noOnlyTests,
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      'no-only-tests/no-only-tests': 'error',
    },
  },
  eslintConfigPrettier,
]);
