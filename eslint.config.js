import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
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
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      regexp.configs['flat/recommended'],
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: '19.0' },
    },
    languageOptions: {
      ecmaVersion: 2024,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/display-name': 'warn',
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
