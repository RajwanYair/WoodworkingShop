import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import sonarjs from 'eslint-plugin-sonarjs';
import regexp from 'eslint-plugin-regexp';
import promise from 'eslint-plugin-promise';
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
      sonarjs.configs.recommended,
      regexp.configs['flat/recommended'],
      promise.configs['flat/recommended'],
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    settings: {
      // Pin version to skip plugin-react's version-detection which calls
      // the ESLint 8 API `context.getFilename()` — not available in ESLint 10.
      react: { version: '19.0' },
    },
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // TypeScript handles prop-types; new JSX transform removes react-in-jsx-scope
      'react/prop-types': 'off',
      'react/display-name': 'warn',
      // ── Sonar: raise complexity ceiling for legitimately complex engine code ──
      'sonarjs/cognitive-complexity': ['error', 75],
      // ── Sonar: raise duplicate-string threshold (i18n keys and test data repeat often) ──
      'sonarjs/no-duplicate-string': ['error', { threshold: 8 }],
      // ── Sonar: idiomatic React & Zustand patterns — disable style-only rules ──
      'sonarjs/void-use': 'off', // React async fire-and-forget pattern
      'sonarjs/no-nested-conditional': 'off', // JSX inline ternaries are idiomatic
      'sonarjs/no-nested-template-literals': 'off', // Common in JSX className expressions
      'sonarjs/no-nested-functions': 'off', // Zustand set() pattern
      'sonarjs/pseudo-random': 'off', // Math.random() used for non-security IDs
      // Client-side app: all regex inputs are app-generated or short user strings; ReDoS risk is negligible
      'sonarjs/slow-regex': 'off',
      // ── Promise: React event handlers legitimately fire-and-forget ──
      'promise/catch-or-return': 'off',
      'promise/always-return': 'off',
      'promise/no-nesting': 'off',
    },
  },
  // ── Per-file overrides for files with legitimately repeated string constants ──
  {
    files: ['src/components/pdf/CabinetPdfDocument.tsx'],
    rules: {
      // 'Helvetica-Bold' repeated 20×, 'row-reverse' repeated 14× — both are style constants
      'sonarjs/no-duplicate-string': ['error', { threshold: 21 }],
    },
  },
  {
    files: ['src/engine/templates.ts'],
    rules: {
      // 'all-visible' and 'bar' are default property values repeated across 14 cabinet templates
      'sonarjs/no-duplicate-string': ['error', { threshold: 15 }],
    },
  },
  // ── Engine/validation override: complexity 124 is known, tracked as tech debt ──
  {
    files: ['src/engine/validation.ts'],
    rules: {
      'sonarjs/cognitive-complexity': ['error', 130],
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
      // Vitest's expect() is a global — sonarjs doesn't detect it as an assertion
      'sonarjs/assertions-in-tests': 'off',
      // Test regex patterns are not user-supplied — ReDoS risk is negligible
      'sonarjs/slow-regex': 'off',
      // Test fixtures naturally repeat strings (material names, expected values)
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  eslintConfigPrettier,
]);
