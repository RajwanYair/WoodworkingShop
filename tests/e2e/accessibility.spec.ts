/**
 * Accessibility E2E tests using @axe-core/playwright (v3.25.0)
 *
 * Runs axe-core against the main application routes and verifies there are
 * no WCAG 2.1 Level AA violations. Failures here mean real user-facing
 * accessibility regressions that must be fixed before merging.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Suppress axe-core noise from known third-party UI libs we can't control.
// Keep this list minimal — only add entries with a documented justification.
const KNOWN_VIOLATIONS_ALLOWLIST: string[] = [
  // None at this time — keep the gate strict.
];

test.beforeEach(async ({ page }) => {
  // Dismiss onboarding overlay so axe scans the full app UI.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-seen', '1');
    } catch {
      /* storage may be unavailable */
    }
  });
});

test('homepage passes axe WCAG 2.1 AA checks', async ({ page }) => {
  await page.goto('/');
  // Wait for the app to fully render (header must be present).
  await expect(page.getByRole('banner')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('#radix-ui-portal') // exclude portals from third-party UI libs
    .analyze();

  const violations = results.violations.filter(
    (v) => !KNOWN_VIOLATIONS_ALLOWLIST.includes(v.id),
  );

  // Report violations clearly before failing
  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `[${v.impact?.toUpperCase() ?? 'UNKNOWN'}] ${v.id}: ${v.description}\n` +
          v.nodes.map((n) => `  → ${n.html}`).join('\n'),
      )
      .join('\n\n');
    console.error(`\n=== axe Violations ===\n${summary}\n`);
  }

  expect(violations, `Found ${violations.length} accessibility violation(s)`).toHaveLength(0);
});

test('configurator tab passes axe WCAG 2.1 AA checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();

  // Navigate to the configurator tab (first tab)
  await page.getByRole('tab').first().click();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violations = results.violations.filter(
    (v) => !KNOWN_VIOLATIONS_ALLOWLIST.includes(v.id),
  );

  expect(violations, `Found ${violations.length} accessibility violation(s) in configurator`).toHaveLength(0);
});
