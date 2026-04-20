import { expect } from 'vitest';

/** Assert every item in the array has truthy `.name.en` and `.name.he`. */
export function expectBilingualNames(items: ReadonlyArray<{ name: { en: string; he: string } }>) {
  for (const item of items) {
    expect(item.name.en).toBeTruthy();
    expect(item.name.he).toBeTruthy();
  }
}

/** Assert that `.stepNumber` values are sequential starting at 1. */
export function expectSequentialSteps(steps: ReadonlyArray<{ stepNumber: number }>) {
  steps.forEach((s, i) => {
    expect(s.stepNumber).toBe(i + 1);
  });
}

/** Assert every step has truthy bilingual title and description. */
export function expectBilingualSteps(
  steps: ReadonlyArray<{ title: { en: string; he: string }; description: { en: string; he: string } }>,
) {
  for (const s of steps) {
    expect(s.title.en).toBeTruthy();
    expect(s.title.he).toBeTruthy();
    expect(s.description.en).toBeTruthy();
    expect(s.description.he).toBeTruthy();
  }
}
