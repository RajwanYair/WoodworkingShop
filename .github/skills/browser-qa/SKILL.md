---
name: browser-qa
description: Use when exploring or verifying WoodworkingShop in a real browser, reproducing UI behavior, checking responsive or RTL layouts, inspecting browser errors, or turning a user flow into a Playwright end-to-end test.
---

# Browser QA

Use the existing browser and test infrastructure before introducing new tools or dependencies.

## Choose the right verification path

- For exploratory interaction, visual inspection, console output, or responsive checks, use the configured Playwright MCP server when its browser tools are available.
- For repeatable regression assertions, use the repository's `@playwright/test` suite under `tests/e2e/` and its existing configuration.
- Do not confuse a successful exploratory session with a passing automated test. Report which path was used.

## Explore before writing tests

1. Read the relevant app entry point, nearby E2E tests, and Playwright configuration. Confirm the app URL and browser project instead of assuming a port or default state.
2. Navigate and interact as a user would. Identify the primary flow, accessible names, expected outcomes, and any required app state before proposing test code.
3. Prefer role- and label-based locators. Use stable test IDs only when an accessible locator is not practical; avoid styling classes and brittle positional selectors.
4. Exercise RTL locales or narrow viewports when they are relevant to the change. Keep exploratory checks focused on the requested behavior.

## Add or update E2E tests

- Follow existing conventions in `tests/e2e/` and use `@playwright/test`; do not add a second browser framework or duplicate an existing scenario.
- Keep tests deterministic and isolated. Reuse existing fixtures and setup, and avoid relying on external services unless the behavior under test requires them.
- Run the smallest relevant test first, then expand browser coverage only as needed. Use the configured project names from `playwright.config.ts`.
- Never delete or weaken an assertion just to make a test pass. Treat browser-specific failures as scoped evidence until reproduced elsewhere.

## Diagnose and report

- For a failure, record the browser/project, viewport, locale, reproduction steps, expected and observed result, and relevant console or network evidence.
- Capture evidence before changing code. Distinguish an MCP exploration result from a Playwright Test result, and do not claim an unrun browser or gate passed.
- Save screenshots and temporary reports under `$TEMP\WoodworkingShop\browser-qa`, not in the repository.
- Do not lower Lighthouse or other quality budgets to hide a regression.

## Upstream reference

This project-specific workflow is informed by [Awesome Copilot's webapp-testing skill](https://github.com/github/awesome-copilot/tree/main/skills/webapp-testing), [Playwright website exploration](https://github.com/github/awesome-copilot/tree/main/skills/playwright-explore-website), and [Playwright test generation](https://github.com/github/awesome-copilot/tree/main/skills/playwright-generate-test). It is adapted to this repository's test layout, MCP setup, and quality constraints.
